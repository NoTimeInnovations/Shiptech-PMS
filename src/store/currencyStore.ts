import { create } from 'zustand';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

export interface Currency {
  id?: string;
  name: string;
  symbol: string;
  mandatory: boolean;
}

interface CurrencyState {
  currencies: Currency[];
  loading: boolean;
  error: string | null;
  fetchCurrencies: () => Promise<void>;
  createCurrency: (currency: Omit<Currency, 'id'>) => Promise<string>;
  updateCurrency: (id: string, currency: Omit<Currency, 'id'>) => Promise<void>;
  deleteCurrency: (id: string) => Promise<void>;
}

export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  currencies: [],
  loading: false,
  error: null,

  fetchCurrencies: async () => {
    try {
      set({ loading: true, error: null });
      const querySnapshot = await getDocs(collection(db, 'currencies'));
      const currencies = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Currency[];
      set({ currencies, loading: false });
    } catch (error) {
      console.error('Error fetching currencies:', error);
      set({ error: 'Failed to fetch currencies', loading: false });
      toast.error('Failed to fetch currencies');
    }
  },

  createCurrency: async (currency) => {
    try {
      set({ loading: true, error: null });
      // First add to Firebase
      const docRef = await addDoc(collection(db, 'currencies'), {
        ...currency,
        createdAt: new Date().toISOString()
      });

      // Get the created document to ensure we have the correct data
      const docSnap = await getDoc(docRef);
      const newCurrency = { id: docRef.id, ...docSnap.data() } as Currency;
      
      // Update local state
      set(state => ({
        currencies: [...state.currencies, newCurrency],
        loading: false
      }));
      
      toast.success('Currency created successfully');
      return docRef.id;
    } catch (error) {
      console.error('Error creating currency:', error);
      set({ error: 'Failed to create currency', loading: false });
      toast.error('Failed to create currency');
      throw error;
    }
  },

  updateCurrency: async (id, currency) => {
    try {
      set({ loading: true, error: null });
      const currencyRef = doc(db, 'currencies', id);
      
      // Update in Firebase
      await updateDoc(currencyRef, {
        ...currency,
        updatedAt: new Date().toISOString()
      });

      // Get the updated document to ensure we have the correct data
      const docSnap = await getDoc(currencyRef);
      const updatedCurrency = { id, ...docSnap.data() } as Currency;
      
      // Update local state
      set(state => ({
        currencies: state.currencies.map(c => 
          c.id === id ? updatedCurrency : c
        ),
        loading: false
      }));
      
      toast.success('Currency updated successfully');
    } catch (error) {
      console.error('Error updating currency:', error);
      set({ error: 'Failed to update currency', loading: false });
      toast.error('Failed to update currency');
      throw error;
    }
  },

  deleteCurrency: async (id) => {
    try {
      set({ loading: true, error: null });
      const currencyRef = doc(db, 'currencies', id);
      
      // Delete from Firebase
      await deleteDoc(currencyRef);
      
      // Update local state
      set(state => ({
        currencies: state.currencies.filter(c => c.id !== id),
        loading: false
      }));
      
      toast.success('Currency deleted successfully');
    } catch (error) {
      console.error('Error deleting currency:', error);
      set({ error: 'Failed to delete currency', loading: false });
      toast.error('Failed to delete currency');
      throw error;
    }
  },
})); 