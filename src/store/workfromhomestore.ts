import { create } from "zustand";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuthStore } from "./authStore";

interface WorkFromRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface WorkFromState {
  loading: boolean;
  error: string | null;
  workFromRequests: WorkFromRequest[];
  allWorkFromRequests: WorkFromRequest[];
  // Whose requests `workFromRequests` currently holds — used to validate the cache
  lastFetchedUserId: string | null;
  requestWorkFrom: (
    startDate: string,
    endDate: string,
    reason: string
  ) => Promise<void>;
  fetchUserWorkFromRequests: (userId?: string) => Promise<void>;
  fetchAllWorkFromRequests: () => Promise<void>;
  updateWorkFromStatus: (
    requestId: string,
    status: "approved" | "rejected"
  ) => Promise<void>;
  cancelWorkFromHome: (requestId: string) => Promise<void>;
}

export const useWorkFromStore = create<WorkFromState>((set, get) => ({
  loading: false,
  error: null,
  workFromRequests: [],
  allWorkFromRequests: [],
  lastFetchedUserId: null,

  // Request work-from-home
  requestWorkFrom: async (startDate, endDate, reason) => {
    try {
      set({ loading: true, error: null });
      const user = useAuthStore.getState().user;
      if (!user) throw new Error("User not authenticated");

      const workFromRef = collection(db, "workfrom");
      const newWorkFromDoc = doc(workFromRef);

      const workFromRequest: WorkFromRequest = {
        id: newWorkFromDoc.id,
        userId: user.uid,
        startDate,
        endDate,
        reason,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      await setDoc(newWorkFromDoc, workFromRequest);

      // Keep both the per-user and the admin (all users) lists in sync
      set((state) => ({
        workFromRequests: [...state.workFromRequests, workFromRequest],
        allWorkFromRequests: [...state.allWorkFromRequests, workFromRequest],
      }));
    } catch (error) {
      console.error("Error requesting work from:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Fetch work-from-home requests for a specific user
  fetchUserWorkFromRequests: async (userId) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user && !userId) return;

      const targetUserId = userId || user?.uid;

      // Cache is valid only if it was fetched for this same user
      if (get().lastFetchedUserId === targetUserId) {
        return;
      }

      set({ loading: true, error: null });

      const workFromRef = collection(db, "workfrom");
      const q = query(workFromRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const workFromRequests = querySnapshot.docs
        .map((doc) => ({ ...doc.data() } as WorkFromRequest))
        .filter((request) => request.userId === targetUserId);

      set({ workFromRequests, loading: false, lastFetchedUserId: targetUserId || null });
    } catch (error) {
      console.error("Error fetching work-from-home requests:", error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  // Fetch all work-from-home requests
  fetchAllWorkFromRequests: async () => {
    try {
      set({ loading: true, error: null });

      //check if it already exists
      if (get().allWorkFromRequests.length > 0) {
        set({ loading: false });
        return;
      }

      const workFromRef = collection(db, "workfrom");
      const q = query(workFromRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const workFromRequests = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
      })) as WorkFromRequest[];

      set({ allWorkFromRequests: workFromRequests, loading: false });
    } catch (error) {
      console.error("Error fetching all work-from-home requests:", error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  // Update work-from-home request status
  updateWorkFromStatus: async (requestId, status) => {
    try {
      set({ loading: true, error: null });

      const workFromRef = doc(db, "workfrom", requestId);
      await updateDoc(workFromRef, { status });

      set((state) => ({
        workFromRequests: state.workFromRequests.map((request) =>
          request.id === requestId ? { ...request, status } : request
        ),
        allWorkFromRequests: state.allWorkFromRequests.map((request) =>
          request.id === requestId ? { ...request, status } : request
        ),
      }));

    } catch (error) {
      console.error("Error updating work-from-home status:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Cancel work-from-home request
  cancelWorkFromHome: async (requestId) => {
    try {
      set({ loading: true, error: null });
      const user = useAuthStore.getState().user;
      if (!user) throw new Error("User not authenticated");

      const workFromRef = doc(db, "workfrom", requestId);
      await deleteDoc(workFromRef);

      set((state) => ({
        workFromRequests: state.workFromRequests.filter(
          (request) => request.id !== requestId
        ),
        allWorkFromRequests: state.allWorkFromRequests.filter(
          (request) => request.id !== requestId
        ),
      }));

    } catch (error) {
      console.error("Error canceling work-from-home request:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));