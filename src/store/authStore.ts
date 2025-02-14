import { create } from 'zustand';
import { auth, db } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';

interface UserData {
  createdAt: string;
  email: string;
  fullName: string;
  projectId?: string;
  role: 'admin' | 'member' | 'customer';
  verified: boolean;
}

interface AuthState {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<User | null>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userData: null,
  loading: false,
  error: null,
  initialized: false,

  initialize: async () => {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          // User is signed in
          try {
            // Fetch user data by user ID
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data() as UserData;
              set({ user, userData, initialized: true });
            } else {
              set({ user, userData: null, initialized: true });
            }
          } catch (error) {
            if ((error as any).code === 'permission-denied') {
              console.error('Error fetching user data: Missing or insufficient permissions');
            } else {
              console.error('Error fetching user data:', error);
            }
            set({ user: null, userData: null, initialized: true });
          }
        } else {
          // User is signed out
          set({ user: null, userData: null, initialized: true });
        }
        unsubscribe(); // Cleanup subscription
        resolve();
      });
    });
  },

  signUp: async (email: string, password: string, fullName: string) => {
    try {
      set({ loading: true, error: null });
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      const userData: UserData = {
        fullName,
        email,
        role: 'member',
        createdAt: new Date().toISOString(),
        verified: false
      };

      // Store user data in Firestore
      await setDoc(doc(db, 'users', user.uid), userData);

      // Store credentials in localStorage
      localStorage.setItem('userCredentials', JSON.stringify({ email, password }));

      set({ user, userData, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });
      const { user } = await signInWithEmailAndPassword(auth, email, password);

      // Fetch user data from Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data() as UserData;
        set({ user, userData, loading: false });
      }

      // Store credentials in localStorage
      localStorage.setItem('userCredentials', JSON.stringify({ email, password }));

      return user;
    } catch (error) {
      if ((error as any).code === 'permission-denied') {
        console.error('Error signing in: Missing or insufficient permissions');
      } else {
        console.error('Error signing in:', error);
      }
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  signOut: async () => {
    try {
      await firebaseSignOut(auth);
      // Remove credentials from localStorage
      localStorage.removeItem('userCredentials');
      set({ user: null, userData: null });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  }
}));