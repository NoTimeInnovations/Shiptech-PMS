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
  onSnapshot,
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";

interface LeaveRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  leaveType: "full" | "half";
  session?: "forenoon" | "afternoon" | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface LeaveState {
  loading: boolean;
  error: string | null;
  leaveRequests: LeaveRequest[];
  allLeaveRequests: LeaveRequest[];
  // Whose requests `leaveRequests` currently holds — used to validate the cache
  lastFetchedUserId: string | null;
  // True while an onSnapshot subscription is keeping the lists live
  subscribed: boolean;
  // Live-syncs allLeaveRequests (and the per-user view) with Firestore
  subscribeLeaveRequests: () => () => void;
  requestLeave: (
    startDate: string,
    endDate: string,
    reason: string,
    leaveType: "full" | "half",
    session?: "forenoon" | "afternoon"
  ) => Promise<void>;
  fetchUserLeaveRequests: (userId?: string) => Promise<void>;
  fetchAllLeaveRequests: () => Promise<void>;
  updateLeaveStatus: (
    leaveId: string,
    status: "approved" | "rejected"
  ) => Promise<void>;
  cancelLeaveRequest: (leaveId: string) => Promise<void>;
  updateDate: (
    leaveId: string,
    startDate: string,
    endDate: string
  ) => Promise<void>;
}

export const useLeaveStore = create<LeaveState>((set, get) => ({
  loading: false,
  error: null,
  leaveRequests: [],
  allLeaveRequests: [],
  lastFetchedUserId: null,
  subscribed: false,

  subscribeLeaveRequests: () => {
    const q = query(collection(db, "leaves"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const all = snapshot.docs.map(
          (doc) => ({ ...doc.data() } as LeaveRequest)
        );
        const target = get().lastFetchedUserId;
        set({
          allLeaveRequests: all,
          // Keep the per-user view in sync with the live data
          leaveRequests: target
            ? all.filter((request) => request.userId === target)
            : get().leaveRequests,
          subscribed: true,
        });
      },
      (error) => {
        console.error("Error subscribing to leave requests:", error);
        set({ error: error.message });
      }
    );

    return () => {
      set({ subscribed: false });
      unsubscribe();
    };
  },

  // Request leave
  requestLeave: async (startDate, endDate, reason, leaveType, session) => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("User not authenticated");

      const leaveRef = collection(db, "leaves");
      const newLeaveDoc = doc(leaveRef);

      const leaveRequest: LeaveRequest = {
        id: newLeaveDoc.id,
        userId: currentUser.uid,
        startDate,
        endDate,
        reason,
        leaveType,
        status: "pending",
        createdAt: new Date().toISOString(),
        session: session || null,
      };

      await setDoc(newLeaveDoc, leaveRequest);

      // Keep both the per-user and the admin (all users) lists in sync
      set((state) => ({
        leaveRequests: [...state.leaveRequests, leaveRequest],
        allLeaveRequests: [...state.allLeaveRequests, leaveRequest],
      }));
    } catch (error) {
      console.error("Error requesting leave:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Fetch leave requests for a specific user
  fetchUserLeaveRequests: async (userId) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser && !userId) return;

      const targetUserId = userId || currentUser?.uid;

      // With a live subscription the data is already in memory — just point
      // the per-user view at the requested user.
      if (get().subscribed) {
        set({
          lastFetchedUserId: targetUserId || null,
          leaveRequests: get().allLeaveRequests.filter(
            (request) => request.userId === targetUserId
          ),
        });
        return;
      }

      // Cache is valid only if it was fetched for this same user. Checking the
      // array contents instead (as before) breaks for users with no requests
      // (refetch on every call) and can leave another user's data in place.
      if (get().lastFetchedUserId === targetUserId) {
        return;
      }

      set({ loading: true, error: null });

      const leavesRef = collection(db, "leaves");
      const q = query(leavesRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const leaveRequests = querySnapshot.docs
        .map((doc) => ({ ...doc.data() } as LeaveRequest))
        .filter((leave) => leave.userId === targetUserId);

      set({ leaveRequests, loading: false, lastFetchedUserId: targetUserId || null });
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  // Fetch all leave requests
  fetchAllLeaveRequests: async () => {
    try {
      // The live subscription already maintains this list
      if (get().subscribed) {
        return;
      }

      set({ loading: true, error: null });

      // Check if requests are already cached
      if (get().allLeaveRequests.length > 0) {
        set({ loading: false });
        return;
      }

      const leavesRef = collection(db, "leaves");
      const q = query(leavesRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const leaveRequests = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
      })) as LeaveRequest[];

      set({ allLeaveRequests: leaveRequests, loading: false });
    } catch (error) {
      console.error("Error fetching all leave requests:", error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  updateLeaveStatus: async (leaveId, status) => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("User not authenticated");

      // Update Firestore
      const leaveRef = doc(db, "leaves", leaveId);
      await updateDoc(leaveRef, { status });

      // Update each list independently — assigning the per-user list to
      // allLeaveRequests would wipe every other user's requests from the admin view
      set((state) => ({
        leaveRequests: state.leaveRequests.map((request) =>
          request.id === leaveId ? { ...request, status } : request
        ),
        allLeaveRequests: state.allLeaveRequests.map((request) =>
          request.id === leaveId ? { ...request, status } : request
        ),
      }));

    } catch (error) {
      console.error("Error updating leave status:", error);
      // Invalidate the caches first, otherwise the refetches below are skipped
      set({
        error: (error as Error).message,
        lastFetchedUserId: null,
        allLeaveRequests: [],
      });

      // Revert by refetching
      await Promise.all([
        get().fetchUserLeaveRequests(),
        get().fetchAllLeaveRequests()
      ]);

      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Cancel leave request
  cancelLeaveRequest: async (leaveId) => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("User not authenticated");

      const leaveRef = doc(db, "leaves", leaveId);
      await deleteDoc(leaveRef);

      set((state) => ({
        leaveRequests: state.leaveRequests.filter(
          (request) => request.id !== leaveId
        ),
        allLeaveRequests: state.allLeaveRequests.filter(
          (request) => request.id !== leaveId
        ),
      }));
    } catch (error) {
      console.error("Error canceling leave request:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Update leave dates
  updateDate: async (leaveId, startDate, endDate) => {
    try {
      set({ loading: true, error: null });

      const leaveRef = doc(db, "leaves", leaveId);
      await updateDoc(leaveRef, { startDate, endDate });

      set((state) => ({
        leaveRequests: state.leaveRequests.map((request) =>
          request.id === leaveId ? { ...request, startDate, endDate } : request
        ),
        allLeaveRequests: state.allLeaveRequests.map((request) =>
          request.id === leaveId ? { ...request, startDate, endDate } : request
        ),
      }));

    } catch (error) {
      console.error("Error updating leave dates:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));