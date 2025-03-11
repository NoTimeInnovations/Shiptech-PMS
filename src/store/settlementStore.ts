import { create } from 'zustand';
import { collection, doc, setDoc, updateDoc, deleteDoc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AmountPaid {
  amount: string;
  date: string;
  notes?: string;
}

export interface Settlement {
  id: string;
  task_id: string;
  team_id: string;
  total_amount: string;
  amounts_paid: AmountPaid[];
  status: 'pending' | 'partial' | 'completed';
  created_at: string;
  updated_at: string;
}

interface SettlementState {
  settlements: Settlement[];
  loading: boolean;
  error: string | null;
  createSettlement: (settlement: Omit<Settlement, 'id' | 'created_at' | 'updated_at' | 'status'>) => Promise<void>;
  updateSettlement: (id: string, settlement: Partial<Settlement>) => Promise<void>;
  deleteSettlement: (id: string) => Promise<void>;
  fetchSettlements: () => Promise<void>;
  addPayment: (settlementId: string, payment: AmountPaid) => Promise<void>;
  fetchTeamSettlements: (teamId: string) => Promise<Settlement[]>;
}

export const useSettlementStore = create<SettlementState>((set, get) => ({
  settlements: [],
  loading: false,
  error: null,

  createSettlement: async (settlement) => {
    try {
      set({ loading: true, error: null });
      const settlementRef = collection(db, 'settlements');
      const newSettlementDoc = doc(settlementRef);

      const newSettlement: Settlement = {
        id: newSettlementDoc.id,
        ...settlement,
        status: 'pending',
        amounts_paid: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await setDoc(newSettlementDoc, newSettlement);
      set(state => ({
        settlements: [...state.settlements, newSettlement]
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateSettlement: async (id, settlement) => {
    try {
      set({ loading: true, error: null });
      const settlementRef = doc(db, 'settlements', id);
      const updates = {
        ...settlement,
        updated_at: new Date().toISOString()
      };
      await updateDoc(settlementRef, updates);

      set(state => ({
        settlements: state.settlements.map(s => 
          s.id === id ? { ...s, ...updates } : s
        )
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteSettlement: async (id) => {
    try {
      set({ loading: true, error: null });
      await deleteDoc(doc(db, 'settlements', id));
      set(state => ({
        settlements: state.settlements.filter(s => s.id !== id)
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  fetchSettlements: async () => {
    try {
      set({ loading: true, error: null });
      const querySnapshot = await getDocs(
        query(collection(db, 'settlements'), orderBy('created_at', 'desc'))
      );
      
      const settlements = querySnapshot.docs.map(doc => ({
        ...doc.data()
      })) as Settlement[];

      set({ settlements });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  addPayment: async (settlementId, payment) => {
    try {
      set({ loading: true, error: null });
      const settlement = get().settlements.find(s => s.id === settlementId);
      if (!settlement) throw new Error('Settlement not found');

      const newPayments = [...settlement.amounts_paid, payment];
      const totalPaid = newPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const totalAmount = parseFloat(settlement.total_amount);
      
      const status = totalPaid >= totalAmount ? 'completed' : 
                     totalPaid > 0 ? 'partial' : 'pending';

      await get().updateSettlement(settlementId, {
        amounts_paid: newPayments,
        status
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  fetchTeamSettlements: async (teamId: string) => {
    try {
      set({ loading: true, error: null });
      
      const q = query(
        collection(db, 'settlements'),
        where('team_id', '==', teamId),
      );
      const querySnapshot = await getDocs(q);
      const settlements = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        amounts_paid: doc.data().amounts_paid || [],
        status: doc.data().status || 'pending',
        created_at: doc.data().created_at || new Date().toISOString(),
        updated_at: doc.data().updated_at || new Date().toISOString()
      })) as Settlement[];

      // Update the local state with the fetched settlements
      set(state => ({
        settlements: settlements
      }));

      return settlements;
    } catch (error) {
      console.error("Error fetching team settlements:", error);
      set({ error: (error as Error).message });
      return [];
    } finally {
      set({ loading: false });
    }
  }
})); 