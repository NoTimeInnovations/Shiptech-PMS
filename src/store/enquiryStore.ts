import { create } from 'zustand';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Task } from './projectStore';

interface Enquiry {
  id?: string;
  __id: string;
  name: string;
  description: string;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  tasks: Task[];
  createdAt: string;
  type: 'enquiry';
}

interface EnquiryState {
  enquiries: Enquiry[];
  loading: boolean;
  error: string | null;
  fetchEnquiries: () => Promise<void>;
  fetchEnquiry: (id: string) => Promise<Enquiry | null>;
  createEnquiry: (enquiry: Omit<Enquiry, 'id' | '__id' | 'createdAt' | 'tasks'>) => Promise<void>;
  updateEnquiry: (id: string, enquiry: Omit<Enquiry, 'id' | '__id' | 'createdAt'>) => Promise<void>;
  deleteEnquiry: (id: string) => Promise<void>;
  convertToProject: (enquiryId: string) => Promise<void>;
}

export const useEnquiryStore = create<EnquiryState>((set, get) => ({
  enquiries: [],
  loading: false,
  error: null,

  fetchEnquiries: async () => {
    try {
      set({ loading: true, error: null });
      const querySnapshot = await getDocs(collection(db, 'enquiries'));
      const enquiries = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as Enquiry[];
      set({ enquiries, loading: false });
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchEnquiry: async (id) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, 'enquiries', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const enquiry = { ...docSnap.data(), id: docSnap.id } as Enquiry;
        set({ loading: false });
        return enquiry;
      }
      set({ loading: false });
      return null;
    } catch (error) {
      console.error('Error fetching enquiry:', error);
      set({ error: (error as Error).message, loading: false });
      return null;
    }
  },

  createEnquiry: async (enquiryData) => {
    try {
      set({ loading: true, error: null });
      const internalId = 'e-' + Math.random().toString().slice(2, 8);
      const newEnquiry = {
        ...enquiryData,
        __id: internalId,
        createdAt: new Date().toISOString(),
        type: 'enquiry' as const,
        tasks: [] // Initialize empty tasks array
      };
      const docRef = await addDoc(collection(db, 'enquiries'), newEnquiry);
      const enquiryWithId = { ...newEnquiry, id: docRef.id };
      const enquiries = [...get().enquiries, enquiryWithId];
      set({ enquiries, loading: false });
    } catch (error) {
      console.error('Error creating enquiry:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  updateEnquiry: async (id, enquiryData) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, 'enquiries', id);
      await updateDoc(docRef, enquiryData);
      const updatedEnquiries = get().enquiries.map(enquiry =>
        enquiry.id === id ? { ...enquiryData, id, __id: enquiry.__id } : enquiry
      );
      set({ enquiries: updatedEnquiries, loading: false });
    } catch (error) {
      console.error('Error updating enquiry:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  deleteEnquiry: async (id) => {
    try {
      set({ loading: true, error: null });
      await deleteDoc(doc(db, 'enquiries', id));
      const updatedEnquiries = get().enquiries.filter(enquiry => enquiry.id !== id);
      set({ enquiries: updatedEnquiries, loading: false });
    } catch (error) {
      console.error('Error deleting enquiry:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  convertToProject: async (enquiryId) => {
    try {
      set({ loading: true, error: null });
      const enquiry = await get().fetchEnquiry(enquiryId);
      if (!enquiry) throw new Error('Enquiry not found');

      const projectInternalId = 'p-' + enquiry.__id.split('-')[1];
      const projectData = {
        name: enquiry.name,
        description: enquiry.description,
        customer: enquiry.customer,
        __id: projectInternalId,
        type: 'project' as const,
        tasks: enquiry.tasks || [], // Convert tasks
        createdAt: new Date().toISOString()
      };

      // Create new project document
      const docRef = await addDoc(collection(db, 'projects'), projectData);
      
      // Delete original enquiry
      await deleteDoc(doc(db, 'enquiries', enquiryId));
      
      const updatedEnquiries = get().enquiries.filter(e => e.id !== enquiryId);
      set({ enquiries: updatedEnquiries, loading: false });
      
      return { ...projectData, id: docRef.id };
    } catch (error) {
      console.error('Error converting to project:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  }
}));