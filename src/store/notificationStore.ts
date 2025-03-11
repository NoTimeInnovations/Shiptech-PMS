import { create } from 'zustand';
import { db } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc, getDocs, query, where, orderBy } from 'firebase/firestore';

interface Notification {
  id: string;
  content: string;
  url: string;
  createdAt: Date;
  userId: string;
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (content: string, url: string, userId: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: (userId: string) => Promise<void>;
  fetchNotifications: (userId: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],

  addNotification: async (content: string, url: string, userId: string) => {
    try {
      const notificationRef = await addDoc(collection(db, 'notifications'), {
        content,
        url,
        userId,
        createdAt: new Date(),
      });

      set((state) => ({
        notifications: [...state.notifications, {
          id: notificationRef.id,
          content,
          url,
          createdAt: new Date(),
          userId,
        }],
      }));
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  },

  deleteNotification: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
      set((state) => ({
        notifications: state.notifications.filter((notification) => notification.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  },

  clearAllNotifications: async (userId: string) => {
    try {
      const q = query(collection(db, 'notifications'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });

      set({ notifications: [] });
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  },

  fetchNotifications: async (userId: string) => {
    try {
      const q = query(
        collection(db, 'notifications'), 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const notifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as Notification[];

      set({ notifications });
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  },
})); 