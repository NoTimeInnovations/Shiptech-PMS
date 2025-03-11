import { create } from 'zustand';
import { collection, doc, setDoc, updateDoc, getDocs, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from './authStore';

interface OOORequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface OOOState {
  loading: boolean;
  error: string | null;
  oooRequests: OOORequest[];
  allOOORequests: OOORequest[];
  requestOOO: (startDate: string, endDate: string, reason: string) => Promise<void>;
  fetchUserOOORequests: (userId?: string) => Promise<void>;
  fetchAllOOORequests: () => Promise<void>;
  updateOOOStatus: (requestId: string, status: 'approved' | 'rejected') => Promise<void>;
  cancelOOORequest: (requestId: string) => Promise<void>;
}

export const useOOOStore = create<OOOState>((set, get) => ({
  loading: false,
  error: null,
  oooRequests: [],
  allOOORequests: [],

  requestOOO: async (startDate: string, endDate: string, reason: string) => {
    try {
      set({ loading: true, error: null });
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('User not authenticated');
      const oooRef = collection(db, 'ooo');
      const newOOODoc = doc(oooRef);

      const oooRequest: OOORequest = {
        id: newOOODoc.id,
        userId: user.uid,
        startDate,
        endDate,
        reason,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await setDoc(newOOODoc, oooRequest);
      await get().fetchUserOOORequests();
    } catch (error) {
      console.error('Error requesting OOO:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  fetchUserOOORequests: async (userId?: string) => {
    try {
      set({ loading: true, error: null });
      const user = useAuthStore.getState().user;
      if (!user && !userId) return;

      const oooRef = collection(db, 'ooo');
      const q = query(oooRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const oooRequests = querySnapshot.docs
        .map(doc => ({ ...doc.data() } as OOORequest))
        .filter(request => request.userId === (userId || user?.uid));

      set({ oooRequests });
    } catch (error) {
      console.error('Error fetching OOO requests:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchAllOOORequests: async () => {
    try {
      set({ loading: true, error: null });
      
      const oooRef = collection(db, 'ooo');
      const q = query(oooRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const oooRequests = querySnapshot.docs.map(doc => ({
        ...doc.data()
      })) as OOORequest[];

      set({ oooRequests, allOOORequests: oooRequests });
    } catch (error) {
      console.error('Error fetching all OOO requests:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  updateOOOStatus: async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      set({ loading: true, error: null });
      
      const oooRef = doc(db, 'ooo', requestId);
      await updateDoc(oooRef, { status });

      await get().fetchAllOOORequests();
    } catch (error) {
      console.error('Error updating OOO status:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  cancelOOORequest: async (requestId: string) => {
    try {
      set({ loading: true, error: null });
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('User not authenticated');

      const oooRef = doc(db, 'ooo', requestId);
      await deleteDoc(oooRef);

      await get().fetchUserOOORequests();
    } catch (error) {
      console.error('Error canceling OOO request:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  }
})); 