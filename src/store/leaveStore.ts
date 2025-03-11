import { create } from 'zustand';
import { collection, doc, setDoc, updateDoc, getDocs, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

interface LeaveRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  leaveType: 'full' | 'half';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface LeaveState {
  loading: boolean;
  error: string | null;
  leaveRequests: LeaveRequest[];
  allLeaveRequests: LeaveRequest[];
  requestLeave: (startDate: string, endDate: string, reason: string, leaveType: 'full' | 'half') => Promise<void>;
  fetchUserLeaveRequests: (userId?: string) => Promise<void>;
  fetchAllLeaveRequests: () => Promise<void>;
  updateLeaveStatus: (leaveId: string, status: 'approved' | 'rejected') => Promise<void>;
  cancelLeaveRequest: (leaveId: string) => Promise<void>;
}

export const useLeaveStore = create<LeaveState>((set, get) => ({
  loading: false,
  error: null,
  leaveRequests: [],
  allLeaveRequests: [],

  requestLeave: async (startDate: string, endDate: string, reason: string, leaveType: 'full' | 'half') => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const leaveRef = collection(db, 'leaves');
      const newLeaveDoc = doc(leaveRef);

      const leaveRequest: LeaveRequest = {
        id: newLeaveDoc.id,
        userId: currentUser.uid,
        startDate,
        endDate,
        reason,
        leaveType,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await setDoc(newLeaveDoc, leaveRequest);
      await get().fetchUserLeaveRequests();
    } catch (error) {
      console.error('Error requesting leave:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  fetchUserLeaveRequests: async (userId?: string) => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser && !userId) return;

      const leavesRef = collection(db, 'leaves');
      const q = query(leavesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const leaveRequests = querySnapshot.docs
        .map(doc => ({ ...doc.data() } as LeaveRequest))
        .filter(leave => leave.userId === (userId || currentUser?.uid));

      set({ leaveRequests, loading: false });
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchAllLeaveRequests: async () => {
    try {
      set({ loading: true, error: null });
      
      const leavesRef = collection(db, 'leaves');
      const q = query(leavesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const leaveRequests = querySnapshot.docs.map(doc => ({
        ...doc.data()
      })) as LeaveRequest[];
      
      set({ leaveRequests, allLeaveRequests: leaveRequests, loading: false });
    } catch (error) {
      console.error('Error fetching all leave requests:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  updateLeaveStatus: async (leaveId: string, status: 'approved' | 'rejected') => {
    try {
      set({ loading: true, error: null });
      
      const leaveRef = doc(db, 'leaves', leaveId);
      await updateDoc(leaveRef, { status });

      await get().fetchAllLeaveRequests();
    } catch (error) {
      console.error('Error updating leave status:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  cancelLeaveRequest: async (leaveId: string) => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const leaveRef = doc(db, 'leaves', leaveId);
      await deleteDoc(leaveRef);

      await get().fetchUserLeaveRequests();
    } catch (error) {
      console.error('Error canceling leave request:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  }
}));