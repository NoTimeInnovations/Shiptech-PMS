import { create } from 'zustand';
import { collection, doc, getDoc, setDoc, updateDoc, query, orderBy, deleteField, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

// Attendance doc IDs are local calendar dates. toISOString() is UTC and shifts
// the date for users ahead of UTC (e.g. IST before 5:30 AM), so never use it here.
export const getLocalDateString = (date: Date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

interface AttendanceEntry {
  time: string;
  type: 'full' | 'half';
}

interface AttendanceRecord {
  date: string;
  attendance: {
    [key: string]: AttendanceEntry;
  };
}

interface AttendanceState {
  hasAttendance: boolean;
  loading: boolean;
  error: string | null;
  records: AttendanceRecord[];
  checkAttendance: () => Promise<boolean>;
  markAttendance: (type?: 'full' | 'half') => Promise<void>;
  // Live-syncs `records` with Firestore. Returns an unsubscribe function.
  subscribeAttendance: () => () => void;
  markAttendanceForUser: (userId: string, date: string, type: 'full' | 'half') => Promise<string>;
  updateAttendance: (userId: string, date: Date, type: 'full' | 'half') => Promise<string>;
  removeAttendance: (userId: string, date: Date) => Promise<string>;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  hasAttendance: true,
  loading: false,
  error: null,
  records: [],

  checkAttendance: async () => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) return false;

      const today = getLocalDateString();
      const attendanceRef = doc(db, 'attendance', today);
      const attendanceDoc = await getDoc(attendanceRef);

      if (!attendanceDoc.exists()) {
        set({ hasAttendance: false });
        return false;
      }

      const attendanceData = attendanceDoc.data();
      const marked = !!attendanceData.attendance?.[currentUser.uid];
      set({ hasAttendance: marked });
      return marked;
    } catch (error) {
      console.error('Error checking attendance:', error);
      set({ error: (error as Error).message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  markAttendance: async (type: 'full' | 'half' = 'full') => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const today = getLocalDateString();
      const now = new Date().toISOString();
      const attendanceRef = doc(db, 'attendance', today);
      const attendanceDoc = await getDoc(attendanceRef);

      const newEntry = {
        time: now,
        type
      };

      // No manual `records` update here — the onSnapshot subscription reflects
      // local writes immediately and keeps every consumer consistent.
      if (!attendanceDoc.exists()) {
        await setDoc(attendanceRef, {
          date: today,
          attendance: {
            [currentUser.uid]: newEntry
          }
        });
      } else {
        await updateDoc(attendanceRef, {
          [`attendance.${currentUser.uid}`]: newEntry
        });
      }
      set({ hasAttendance: true });
    } catch (error) {
      console.error('Error marking attendance:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  subscribeAttendance: () => {
    // Real-time listener: every consumer always sees the current Firestore
    // state, including writes made by other users/devices mid-session. Views
    // filter by user themselves, so one all-records subscription serves both
    // the member view and the admin view (no role races, no stale caches).
    set({ loading: get().records.length === 0, error: null });

    const attendanceRef = collection(db, 'attendance');
    const q = query(attendanceRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const records = snapshot.docs
          .map(doc => ({ ...doc.data() } as AttendanceRecord))
          .filter(record => record.date && record.attendance);
        set({ records, loading: false });
      },
      (error) => {
        console.error('Error subscribing to attendance:', error);
        set({ error: error.message, loading: false });
      }
    );

    return unsubscribe;
  },

  markAttendanceForUser: async (userId: string, date: string, type: 'full' | 'half' = 'full') => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Admin not authenticated');

      const formattedDate = date.split('T')[0];
      // Anchor the timestamp at local noon so the stored time/date never
      // shifts to the previous day ("YYYY-MM-DD" alone parses as UTC midnight)
      const timestamp = new Date(`${formattedDate}T12:00:00`).toISOString();
      const newEntry = {
        time: timestamp,
        type
      };

      const attendanceRef = doc(db, 'attendance', formattedDate);
      const attendanceDoc = await getDoc(attendanceRef);

      // The onSnapshot subscription propagates these writes to `records`
      if (!attendanceDoc.exists()) {
        await setDoc(attendanceRef, {
          date: formattedDate,
          attendance: {
            [userId]: newEntry
          }
        });
      } else {
        await updateDoc(attendanceRef, {
          [`attendance.${userId}`]: newEntry
        });
      }
      return 'Attendance marked successfully';
    } catch (error) {
      console.error('Error marking attendance for user:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateAttendance: async (userId: string, date: Date, type: 'full' | 'half') => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Admin not authenticated');

      const formattedDate = getLocalDateString(new Date(date));
      const attendanceRef = doc(db, 'attendance', formattedDate);
      const attendanceDoc = await getDoc(attendanceRef);

      if (!attendanceDoc.exists()) {
        throw new Error('Attendance record not found');
      }

      const attendanceData = attendanceDoc.data();
      if (!attendanceData.attendance?.[userId]) {
        throw new Error('No attendance record found for this user');
      }

      // The onSnapshot subscription propagates this write to `records`
      await updateDoc(attendanceRef, {
        [`attendance.${userId}.type`]: type
      });

      return 'Attendance updated successfully';
    } catch (error) {
      console.error('Error updating attendance:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  removeAttendance: async (userId: string, date: Date) => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Admin not authenticated');

      const formattedDate = getLocalDateString(new Date(date));
      const attendanceRef = doc(db, 'attendance', formattedDate);
      const attendanceDoc = await getDoc(attendanceRef);

      if (!attendanceDoc.exists()) {
        throw new Error('Attendance record not found');
      }

      const attendanceData = attendanceDoc.data();
      if (!attendanceData.attendance?.[userId]) {
        throw new Error('No attendance record found for this user');
      }

      // The onSnapshot subscription propagates this write to `records`
      await updateDoc(attendanceRef, {
        [`attendance.${userId}`]: deleteField()
      });

      return 'Attendance removed successfully';
    } catch (error) {
      console.error('Error removing attendance:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  }
}));