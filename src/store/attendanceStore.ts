import { create } from 'zustand';
import { collection, doc, getDoc, setDoc, updateDoc, getDocs, query, orderBy, deleteField } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

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
  loading: boolean;
  error: string | null;
  records: AttendanceRecord[];
  checkAttendance: () => Promise<boolean>;
  markAttendance: (type?: 'full' | 'half') => Promise<void>;
  fetchAttendanceRecords: () => Promise<void>;
  fetchAllUsersAttendance: () => Promise<void>;
  markAttendanceForUser: (userId: string, date: string, type: 'full' | 'half') => Promise<string>;
  updateAttendance: (userId: string, date: Date, type: 'full' | 'half') => Promise<string>;
  removeAttendance: (userId: string, date: Date) => Promise<string>;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  loading: false,
  error: null,
  records: [],

  checkAttendance: async () => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) return false;

      const today = new Date().toISOString().split('T')[0];
      const attendanceRef = doc(db, 'attendance', today);
      const attendanceDoc = await getDoc(attendanceRef);

      if (!attendanceDoc.exists()) return false;

      const attendanceData = attendanceDoc.data();
      return !!attendanceData.attendance[currentUser.uid];
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

      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      const attendanceRef = doc(db, 'attendance', today);
      const attendanceDoc = await getDoc(attendanceRef);

      if (!attendanceDoc.exists()) {
        await setDoc(attendanceRef, {
          date: today,
          attendance: {
            [currentUser.uid]: {
              time: now,
              type
            }
          }
        });
      } else {
        await updateDoc(attendanceRef, {
          [`attendance.${currentUser.uid}`]: {
            time: now,
            type
          }
        });
      }

      // Refresh records after marking attendance
      await get().fetchAttendanceRecords();
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
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const attendanceRef = collection(db, 'attendance');
      const q = query(attendanceRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const records = querySnapshot.docs
        .map(doc => ({ ...doc.data() } as AttendanceRecord))
        .filter(record => record.attendance[currentUser.uid]); // Only get records where user is present

      set({ records, loading: false });
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchAllUsersAttendance: async () => {
    try {
      set({ loading: true, error: null });
      
      const attendanceRef = collection(db, 'attendance');
      const q = query(attendanceRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const records = querySnapshot.docs.map(doc => ({
        ...doc.data()
      })) as AttendanceRecord[];

      set({ records, loading: false });
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

      // Format the timestamp for the selected date
      const timestamp = new Date(date).toISOString();
      const formattedDate = date.split('T')[0];

      const attendanceRef = doc(db, 'attendance', formattedDate);
      const attendanceDoc = await getDoc(attendanceRef);

      if (!attendanceDoc.exists()) {
        await setDoc(attendanceRef, {
          date: formattedDate,
          attendance: {
            [userId]: {
              time: timestamp,
              type
            }
          }
        });
      } else {
        await updateDoc(attendanceRef, {
          [`attendance.${userId}`]: {
            time: timestamp,
            type
          }
        });
      }

      // Refresh records after marking attendance
      await get().fetchAllUsersAttendance();
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

      // console.log("before formattedDate", date);
      const dateObj = new Date(date);
      const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      // console.log("formattedDate", formattedDate);
      const attendanceRef = doc(db, 'attendance', formattedDate);
      const attendanceDoc = await getDoc(attendanceRef);

      if (!attendanceDoc.exists()) {
        throw new Error('Attendance record not found');
      }

      const attendanceData = attendanceDoc.data();
      if (!attendanceData.attendance[userId]) {
        throw new Error('No attendance record found for this user');
      }

      console.log("attendanceData",attendanceData)

      await updateDoc(attendanceRef, {
        [`attendance.${userId}.type`]: type
      });

      // Refresh records after updating attendance
      await get().fetchAllUsersAttendance();
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

      const dateObj = new Date(date);
      const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      const attendanceRef = doc(db, 'attendance', formattedDate);
      const attendanceDoc = await getDoc(attendanceRef);

      if (!attendanceDoc.exists()) {
        throw new Error('Attendance record not found');
      }

      const attendanceData = attendanceDoc.data();
      if (!attendanceData.attendance[userId]) {
        throw new Error('No attendance record found for this user');
      }

      await updateDoc(attendanceRef, {
        [`attendance.${userId}`]: deleteField()
      });

      // Refresh records after removing attendance
      await get().fetchAllUsersAttendance();
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