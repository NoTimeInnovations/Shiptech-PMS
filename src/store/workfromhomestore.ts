import { create } from 'zustand';
import { collection, doc, setDoc, updateDoc, getDocs, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from './authStore';

interface WorkFromRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface WorkFromState {
  loading: boolean;
  error: string | null;
  workFromRequests: WorkFromRequest[];
  allWorkFromRequests: WorkFromRequest[];
  requestWorkFrom: (startDate: string, endDate: string, reason: string) => Promise<void>;
  fetchUserWorkFromRequests: (userId?: string) => Promise<void>;
  fetchAllWorkFromRequests: () => Promise<void>;
  updateWorkFromStatus: (requestId: string, status: 'approved' | 'rejected') => Promise<void>;
  cancelWorkFromHome: (requestId: string) => Promise<void>;
}

export const useWorkFromStore = create<WorkFromState>((set, get) => ({
  loading: false,
  error: null,
  workFromRequests: [],
  allWorkFromRequests: [],

  requestWorkFrom: async (startDate: string, endDate: string, reason: string) => {
    try {
      set({ loading: true, error: null });
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('User not authenticated');
      const workFromRef = collection(db, 'workfrom');
      const newWorkFromDoc = doc(workFromRef);

      const workFromRequest: WorkFromRequest = {
        id: newWorkFromDoc.id,
        userId: user.uid,
        startDate,
        endDate,
        reason,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await setDoc(newWorkFromDoc, workFromRequest);
      await get().fetchUserWorkFromRequests();
    } catch (error) {
      console.error('Error requesting work from:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  fetchUserWorkFromRequests: async (userId?: string) => {
    try {
      set({ loading: true, error: null });
      const user = useAuthStore.getState().user;
      if (!user && !userId) return;

      const workFromRef = collection(db, 'workfrom');
      const q = query(workFromRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const workFromRequests = querySnapshot.docs
        .map(doc => ({ ...doc.data() } as WorkFromRequest))
        .filter(request => request.userId === (userId || user?.uid));

      set({ workFromRequests, loading: false });
    } catch (error) {
      console.error('Error fetching work from requests:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchAllWorkFromRequests: async () => {
    try {
      set({ loading: true, error: null });
      
      const workFromRef = collection(db, 'workfrom');
      const q = query(workFromRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const workFromRequests = querySnapshot.docs.map(doc => ({
        ...doc.data()
      })) as WorkFromRequest[];

      set({ workFromRequests, allWorkFromRequests: workFromRequests, loading: false });
    } catch (error) {
      console.error('Error fetching all work from requests:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  updateWorkFromStatus: async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      set({ loading: true, error: null });
      
      const workFromRef = doc(db, 'workfrom', requestId);
      await updateDoc(workFromRef, { status });

      await get().fetchAllWorkFromRequests();
    } catch (error) {
      console.error('Error updating work from status:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  cancelWorkFromHome: async (requestId: string) => {
    try {
      set({ loading: true, error: null });
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('User not authenticated');

      const workFromRef = doc(db, 'workfrom', requestId);
      await deleteDoc(workFromRef);

      await get().fetchUserWorkFromRequests();
    } catch (error) {
      console.error('Error canceling work from home request:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  }
}));