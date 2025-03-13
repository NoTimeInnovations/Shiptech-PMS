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
}

interface TimeSheetState {
  timeSheets: TimeSheet[];
  fetchTimeSheets: (userId: string) => Promise<void>;
  addTimeSheet: (timeSheet: Omit<TimeSheet, 'id' | 'createdAt'>) => Promise<void>;
  updateTimeSheet: (timeSheet: Omit<TimeSheet, 'createdAt'>) => Promise<void>;
  deleteTimeSheet: (id: string) => Promise<void>;
}

export const useTimeSheetStore = create<TimeSheetState>((set) => ({
  timeSheets: [],
  
  fetchTimeSheets: async (userId: string) => {
    const timeSheetsRef = query(collection(db, "time_sheets"), where("userId", "==", userId));
    const snapshot = await getDocs(timeSheetsRef);
    const timeSheets: TimeSheet[] = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as TimeSheet));

    set({ timeSheets });
  },

  addTimeSheet: async (timeSheet) => {
    const createdAt = Timestamp.now(); // Get the current timestamp
    const docRef = await addDoc(collection(db, "time_sheets"), { ...timeSheet, createdAt });
    set((state) => ({
      timeSheets: [...state.timeSheets, { id: docRef.id, ...timeSheet, createdAt }],
    }));
  },

  updateTimeSheet: async (timeSheet) => {
    const { id, ...data } = timeSheet;
    console.log("updated date : ",data)
    await updateDoc(doc(db, "time_sheets", id), data);
    set((state) => ({
      timeSheets: state.timeSheets.map(sheet => sheet.id === id ? { ...sheet, ...data } : sheet),
    }));
  },

  deleteTimeSheet: async (id) => {
    await deleteDoc(doc(db, "time_sheets", id));
    set((state) => ({
      timeSheets: state.timeSheets.filter(sheet => sheet.id !== id),
    }));
  },
})); 