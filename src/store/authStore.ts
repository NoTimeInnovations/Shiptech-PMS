import { create } from 'zustand';
import { auth, db } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AuthState {
  user: User | null;
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
  loading: false,
  error: null,
  initialized: false,

  initialize: async () => {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          // User is signed in
          set({ user, initialized: true });
        } else {
          // User is signed out
          set({ user: null, initialized: true });
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
      
      // Store user data in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        fullName,
        email,
        role: 'member',
        createdAt: new Date().toISOString(),
        verified: false
      });

      // Store credentials in localStorage
      localStorage.setItem('userCredentials', JSON.stringify({ email, password }));

      set({ user, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });
      const { user } = await signInWithEmailAndPassword(auth, email, password);

      // Store credentials in localStorage
      localStorage.setItem('userCredentials', JSON.stringify({ email, password }));

      set({ user, loading: false });
      return user;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  signOut: async () => {
    try {
      await firebaseSignOut(auth);
      // Remove credentials from localStorage
      localStorage.removeItem('userCredentials');
      set({ user: null });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  }
}));