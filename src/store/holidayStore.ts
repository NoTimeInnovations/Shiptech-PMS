import { create } from 'zustand';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';

export interface Holiday {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface HolidayStore {
  holidays: Holiday[];
  cache: {
    holidays: Holiday[] | null; // Cache for holidays
  };
  fetchHolidays: () => Promise<void>;
  // Live-syncs holidays with Firestore. Returns an unsubscribe function.
  subscribeHolidays: () => () => void;
  addHoliday: (name: string, startDate: string, endDate: string) => Promise<void>;
  updateHoliday: (id: string, name: string, startDate: string, endDate: string) => Promise<void>;
  removeHoliday: (id: string) => Promise<void>;
}

export const useHolidayStore = create<HolidayStore>((set, get) => ({
  holidays: [],
  cache: {
    holidays: null, // Initialize cache as null
  },

  subscribeHolidays: () => {
    const unsubscribe = onSnapshot(
      collection(db, 'holidays'),
      (snapshot) => {
        const holidays = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Holiday[];
        // Keep the cache in sync so fetchHolidays callers also get live data
        set({ holidays, cache: { holidays } });
      },
      (error) => {
        console.error("Error subscribing to holidays:", error);
      }
    );
    return unsubscribe;
  },

  // Fetch holidays
  fetchHolidays: async () => {
    // Check if holidays are already cached
    const cachedHolidays = get().cache.holidays;
    if (cachedHolidays) {
      set({ holidays: cachedHolidays }); // Use cached data
      return;
    }

    try {
      const querySnapshot = await getDocs(collection(db, 'holidays'));
      const holidays = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Holiday[];

      // Update cache and state
      set({ holidays, cache: { holidays } });
    } catch (error) {
      console.error("Error fetching holidays:", error);
    }
  },

  // Add a new holiday
  addHoliday: async (name, startDate, endDate) => {
    try {
      const docRef = await addDoc(collection(db, 'holidays'), { name, startDate, endDate });
      const newHoliday = { id: docRef.id, name, startDate, endDate };

      // Update cache and state
      set((state) => ({
        holidays: [...state.holidays, newHoliday],
        cache: { holidays: [...(state.cache.holidays || []), newHoliday] },
      }));
    } catch (error) {
      console.error("Error adding holiday:", error);
      throw error;
    }
  },

  // Update an existing holiday
  updateHoliday: async (id, name, startDate, endDate) => {
    try {
      await updateDoc(doc(db, 'holidays', id), { name, startDate, endDate });

      // Update cache and state
      const state = get();
      set({
        holidays: state.holidays.map(holiday =>
          holiday.id === id ? { ...holiday, name, startDate, endDate } : holiday
        ),
        cache: {
          holidays: state.cache.holidays?.map(holiday =>
            holiday.id === id ? { ...holiday, name, startDate, endDate } : holiday
          ) as Holiday[],
        },
      });
    } catch (error) {
      console.error("Error updating holiday:", error);
      throw error;
    }
  },

  // Remove a holiday
  removeHoliday: async (id) => {
    try {
      await deleteDoc(doc(db, 'holidays', id));

      // Update cache and state
      const state = get();
      set({
        holidays: state.holidays.filter(holiday => holiday.id !== id),
        cache: {
          holidays: state.cache.holidays?.filter(holiday => holiday.id !== id) as Holiday[],
        },
      });
    } catch (error) {
      console.error("Error removing holiday:", error);
      throw error;
    }
  },
}));