import { create } from 'zustand';
import { collection, doc, getDoc, setDoc, updateDoc, getDocs, query, orderBy, deleteField } from 'firebase/firestore';
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
  // Tracks what the cached `records` contain: the current user's docs only
  // ('user') or every user's docs ('all'). Prevents the admin fetch from being
  // skipped just because a member-scoped fetch already populated the cache.
  lastFetchScope: 'user' | 'all' | null;
  checkAttendance: () => Promise<boolean>;
  markAttendance: (type?: 'full' | 'half') => Promise<void>;
  fetchAttendanceRecords: () => Promise<void>;
  fetchAllUsersAttendance: () => Promise<void>;
  markAttendanceForUser: (userId: string, date: string, type: 'full' | 'half') => Promise<string>;
  updateAttendance: (userId: string, date: Date, type: 'full' | 'half') => Promise<string>;
  removeAttendance: (userId: string, date: Date) => Promise<string>;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  hasAttendance: true,
  loading: false,
  error: null,
  records: [],
  lastFetchScope: null,

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

      if (!attendanceDoc.exists()) {
        await setDoc(attendanceRef, {
          date: today,
          attendance: {
            [currentUser.uid]: newEntry
          }
        });
        set(state => ({
          records: [
            {
              date: today,
              attendance: {
                [currentUser.uid]: newEntry
              }
            },
            ...state.records
          ],
          hasAttendance: true
        }));
      } else {
        await updateDoc(attendanceRef, {
          [`attendance.${currentUser.uid}`]: newEntry
        });
        set(state => ({
          records: [
            {
              date: today,
              attendance: {
                ...state.records.find(record => record.date === today)?.attendance,
                [currentUser.uid]: newEntry
              }
            },
            ...state.records.filter(record => record.date !== today)
          ],
          hasAttendance: true
        }));

      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  fetchAttendanceRecords: async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // 'all' is a superset of the current user's records, so both scopes are valid here
      if (get().lastFetchScope !== null) {
        return;
      }

      set({ loading: true, error: null });

      const attendanceRef = collection(db, 'attendance');
      const q = query(attendanceRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);

      const records = querySnapshot.docs
        .map(doc => ({ ...doc.data() } as AttendanceRecord))
        .filter(record => record.attendance?.[currentUser.uid]);

      set({ records, loading: false, lastFetchScope: 'user' });
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchAllUsersAttendance: async () => {
    try {
      // Refetch if the cache only holds the current user's records ('user' scope),
      // otherwise the admin view would silently show a single member's data.
      if (get().lastFetchScope === 'all') {
        return;
      }

      set({ loading: true, error: null });

      const attendanceRef = collection(db, 'attendance');
      const q = query(attendanceRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);

      const records = querySnapshot.docs
        .map(doc => ({ ...doc.data() } as AttendanceRecord))
        .filter(record => record.date && record.attendance);

      set({ records, loading: false, lastFetchScope: 'all' });
    } catch (error) {
      console.error('Error fetching all users attendance:', error);
      set({ error: (error as Error).message, loading: false });
    }
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

      if (!attendanceDoc.exists()) {
        await setDoc(attendanceRef, {
          date: formattedDate,
          attendance: {
            [userId]: newEntry
          }
        });
        set(state => ({
          records: [
            {
              date: formattedDate,
              attendance: {
                [userId]: newEntry
              }
            },
            ...state.records
          ].sort((a, b) => b.date.localeCompare(a.date))
        }));
      } else {
        await updateDoc(attendanceRef, {
          [`attendance.${userId}`]: newEntry
        });
        set(state => ({
          records: [
            {
              date: formattedDate,
              attendance: {
                ...state.records.find(record => record.date === formattedDate)?.attendance,
                [userId]: newEntry
              }
            },
            ...state.records.filter(record => record.date !== formattedDate)
          ].sort((a, b) => b.date.localeCompare(a.date))
        }));
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

      await updateDoc(attendanceRef, {
        [`attendance.${userId}.type`]: type
      });

      set(state => ({
        records: state.records.map(record => 
          record.date === formattedDate 
            ? { 
                ...record, 
                attendance: { 
                  ...record.attendance, 
                  [userId]: { 
                    ...record.attendance[userId], 
                    type 
                  } 
                } 
              } 
            : record
        )
      }));

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

      await updateDoc(attendanceRef, {
        [`attendance.${userId}`]: deleteField()
      });

      set(state => ({
        records: state.records.map(record => 
          record.date === formattedDate 
            ? { 
                ...record, 
                attendance: Object.fromEntries(
                  Object.entries(record.attendance).filter(([key]) => key !== userId)
                )
              } 
            : record
        ).filter(record => 
          Object.keys(record.attendance).length > 0 || record.date !== formattedDate
        )
      }));

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