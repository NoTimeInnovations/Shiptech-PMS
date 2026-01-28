import { create } from "zustand";
import { db } from "../lib/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, Timestamp, where, query, updateDoc } from "firebase/firestore";

interface TimeSheet {
  id: string;
  title: string;
  description: string;
  hours: number;
  minutes: number;
  userId: string;
  createdAt: Timestamp;
  projectId?: string;
  taskIds?: string[];
}

interface TimeSheetState {
  timeSheets: TimeSheet[];
  cache: {
    [userId: string]: TimeSheet[]; // Cache for user-specific timesheets
  };
  fetchTimeSheets: (userId: string) => Promise<void>;
  addTimeSheet: (timeSheet: Omit<TimeSheet, 'id' | 'createdAt'>) => Promise<void>;
  updateTimeSheet: (timeSheet: Omit<TimeSheet, 'createdAt'>) => Promise<void>;
  deleteTimeSheet: (id: string) => Promise<void>;
}

export const useTimeSheetStore = create<TimeSheetState>((set, get) => ({
  timeSheets: [],
  cache: {}, // Initialize cache

  // Fetch timesheets for a specific user
  fetchTimeSheets: async (userId: string) => {
    try {
      // Check if timesheets are already cached for this user
      const cachedTimeSheets = get().cache[userId];
      if (cachedTimeSheets) {
        set({ timeSheets: cachedTimeSheets });
        return;
      }

      // Log Firestore fetch
      console.log("Fetching timesheets from Firestore for user:", userId);

      const timeSheetsRef = query(collection(db, "time_sheets"), where("userId", "==", userId));
      const snapshot = await getDocs(timeSheetsRef);
      const timeSheets: TimeSheet[] = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as TimeSheet));

      // Update cache and state
      set((state) => ({
        timeSheets,
        cache: { ...state.cache, [userId]: timeSheets },
      }));
    } catch (error) {
      console.error("Error fetching timesheets:", error);
    }
  },

  // Add a new timesheet
  addTimeSheet: async (timeSheet) => {
    try {
      const createdAt = Timestamp.now(); // Get the current timestamp
      const docRef = await addDoc(collection(db, "time_sheets"), { ...timeSheet, createdAt });

      // Update cache and state
      set((state) => ({
        timeSheets: [...state.timeSheets, { id: docRef.id, ...timeSheet, createdAt }],
        cache: {
          ...state.cache,
          [timeSheet.userId]: [
            ...(state.cache[timeSheet.userId] || []),
            { id: docRef.id, ...timeSheet, createdAt },
          ],
        },
      }));
    } catch (error) {
      console.error("Error adding timesheet:", error);
    }
  },

  // Update an existing timesheet
  updateTimeSheet: async (timeSheet) => {
    try {
      const { id, ...data } = timeSheet;
      console.log("Updated data:", data);

      await updateDoc(doc(db, "time_sheets", id), data);

      // Update cache and state
      set((state) => ({
        timeSheets: state.timeSheets.map(sheet =>
          sheet.id === id ? { ...sheet, ...data } : sheet
        ),
        cache: {
          ...state.cache,
          [timeSheet.userId]: state.cache[timeSheet.userId]?.map(sheet =>
            sheet.id === id ? { ...sheet, ...data } : sheet
          ),
        },
      }));
    } catch (error) {
      console.error("Error updating timesheet:", error);
    }
  },

  // Delete a timesheet
  deleteTimeSheet: async (id) => {
    try {
      const timesheetToDelete = get().timeSheets.find(sheet => sheet.id === id);
      if (!timesheetToDelete) throw new Error("Timesheet not found");

      await deleteDoc(doc(db, "time_sheets", id));

      // Update cache and state
      set((state) => ({
        timeSheets: state.timeSheets.filter(sheet => sheet.id !== id),
        cache: {
          ...state.cache,
          [timesheetToDelete.userId]: state.cache[timesheetToDelete.userId]?.filter(
            sheet => sheet.id !== id
          ),
        },
      }));
    } catch (error) {
      console.error("Error deleting timesheet:", error);
    }
  },
}));