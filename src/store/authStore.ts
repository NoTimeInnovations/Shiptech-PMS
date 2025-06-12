import { create } from 'zustand';
import { auth, db } from '../lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';

export interface UserData {
  id: string;
  createdAt: string;
  email: string;
  fullName: string;
  projectId?: string;
  role: 'admin' | 'member' | 'customer';
  verified: boolean;
  designation: string;
  phone?: string;
  address?: string;
}

interface AuthState {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  updateUserData: (userID: string, userDesign: string) => Promise<void>
  signUpCustomer: (email: string, password: string, fullName: string) => Promise<User | null>;
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
            // Query users collection by email
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', user.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const userData = querySnapshot.docs[0].data() as UserData;
              set({ user, userData, initialized: true });
            } else {
              set({ user, userData: null, initialized: true });
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
            set({ user, userData: null, initialized: true });
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
        id: user.uid,
        fullName,
        email,
        role: 'member',
        createdAt: new Date().toISOString(),
        verified: false,
        designation: ''
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
  signUpCustomer: async (email: string, password: string, fullName: string) => {
    try {
      set({ loading: true, error: null });

      // Store current user's auth
      const currentUser = auth.currentUser;

      // Create new customer account
      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      const userData: UserData = {
        id: user.uid,
        fullName,
        email,
        role: 'customer',
        createdAt: new Date().toISOString(),
        verified: true,
        designation: ''
      };

      // Store user data in Firestore
      await setDoc(doc(db, 'users', user.uid), userData);

      // Delete the new customer's auth session
      await auth.updateCurrentUser(currentUser);

      set({ loading: false });
      return user;
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
  },
  updateUserData: async (userEmail: string, userDesign: string) => {
 

    const state = useAuthStore.getState()
    const usrEmail = state.userData?.email
  

    try {
      if (userEmail=== usrEmail) {
        const updatedUserData = {
          ...state.userData!,
          designation: userDesign
        }
        set({ userData: updatedUserData, loading: false })
        console.log("Designation changed,", updatedUserData);

      }
    } catch (error) {
      console.error('User id not matching', error);
    }
  }
}

));
