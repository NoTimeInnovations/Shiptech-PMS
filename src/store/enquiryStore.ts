import { create } from 'zustand';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { Task, useTaskStore } from './taskStore';

export interface Deliverable {
  id: string;
  name: string;
  description?: string;
  hours?: number;
  costPerHour?: number;
  total: number;
}

export interface CurrencyDetails {
  id: string;
  name: string;
  symbol: string;
  mandatory: boolean;
}

export interface Enquiry {
  id?: string;
  __id: string;
  enquiryNumber: string;
  name: string;
  description: string;
  customer_id: string; // Changed from customer object to customer_id
  deliverables: Deliverable[];
  scopeOfWork: string;
  createdAt: string;
  type: 'enquiry';
  inputsRequired: string[];
  exclusions: string[];
  charges: string[];
  status: string;
  currency?: CurrencyDetails;
}

interface TaskWithEnquiryId extends Task {
  enquiryId: string;
}

interface EnquiryState {
  enquiries: Enquiry[];
  loading: boolean;
  error: string | null;
  fetchEnquiries: () => Promise<void>;
  fetchEnquiry: (id: string) => Promise<Enquiry | null>;
  createEnquiry: (enquiry: Omit<Enquiry, 'id' | '__id' | 'createdAt' | 'type'>) => Promise<void>;
  updateEnquiry: (id: string, enquiry: Omit<Enquiry, 'id' | '__id' | 'createdAt' | 'type'>) => Promise<void>;
  deleteEnquiry: (id: string) => Promise<void>;
  convertToProject: (enquiryId: string) => Promise<void>;
  updateEnquiryStatus: (id: string, status: string) => Promise<void>;
  addTaskToEnquiry: (enquiryId: string, task: Omit<TaskWithEnquiryId, 'id'>) => Promise<void>;
  deleteTaskFromEnquiry: (taskId: string) => Promise<void>;
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
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchEnquiry: async (id: string) => {
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
      set({ error: (error as Error).message, loading: false });
      return null;
    }
  },

  createEnquiry: async (enquiryData) => {
    try {
      set({ loading: true, error: null });
      const newEnquiry = {
        ...enquiryData,
        __id: `e-${enquiryData.enquiryNumber}`,
        createdAt: new Date().toISOString(),
        type: 'enquiry' as const,
        status: 'on hold' as const
      };
      const docRef = await addDoc(collection(db, 'enquiries'), newEnquiry);
      const enquiryWithId = { ...newEnquiry, id: docRef.id };
      set({ enquiries: [...get().enquiries, enquiryWithId], loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  updateEnquiry: async (id: string, enquiryData) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, 'enquiries', id);
      await updateDoc(docRef, { ...enquiryData, type: 'enquiry' });
      const updatedEnquiries = get().enquiries.map(enquiry =>
        enquiry.id === id ? { ...enquiryData, id, __id: enquiry.__id, type: 'enquiry' } : enquiry
      );
      set({ enquiries: updatedEnquiries as Enquiry[], loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  deleteEnquiry: async (id: string) => {
    try {
      set({ loading: true, error: null });
      await deleteDoc(doc(db, 'enquiries', id));
      const updatedEnquiries = get().enquiries.filter(enquiry => enquiry.id !== id);
      set({ enquiries: updatedEnquiries, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  convertToProject: async (enquiryId: string) => {
    try {
      set({ loading: true, error: null });

      const enquiry = await get().fetchEnquiry(enquiryId);
      if (!enquiry) throw new Error('Enquiry not found');

      // Get customer details from customer_id
      const customerDoc = await getDoc(doc(db, 'customers', enquiry.customer_id));
      const customerData = customerDoc.exists() ? customerDoc.data() : null;
      
      // Create customer object for project
      const customer = customerData ? {
        name: customerData.name,
        phone: customerData.contactPersons[0]?.phone || '',
        address: customerData.address
      } : {
        name: '',
        phone: '',
        address: ''
      };

      const projectId = 'p-' + enquiry.__id.split('-')[1];

      // Create tasks in the tasks collection
      const taskPromises = enquiry.deliverables.map(deliverable => 
        addDoc(collection(db, 'tasks'), {
          projectId: projectId,
          name: deliverable.name,
          description: deliverable.description || '',
          hours: deliverable.hours || 0,
          costPerHour: deliverable.costPerHour || 0,
          total: deliverable.total,
          completed: false,
          parentId: null, // Root level task
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      );

      // Wait for all tasks to be created
      await Promise.all(taskPromises);

      // Create project data (without tasks array)
      const projectData = {
        name: enquiry.name,
        description: enquiry.description,
        customer_id: enquiry.customer_id,
        customer, // Include customer details for backward compatibility
        __id: 'p-' + enquiry.__id.split('-')[1],
        type: 'project' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Create project in Firestore
      await addDoc(collection(db, 'projects'), projectData);

      // Update enquiry status
      await updateDoc(doc(db, 'enquiries', enquiryId), {
        status: 'moved to projects'
      });

      // Update local state - just update the status instead of filtering out
      const updatedEnquiries = get().enquiries.map(e => 
        e.id === enquiryId 
          ? { ...e, status: 'moved to projects' }
          : e
      );
      set({ enquiries: updatedEnquiries, loading: false });

      toast.success('Successfully converted to project');
    } catch (error) {
      console.error('Error converting to project:', error);
      set({ error: (error as Error).message, loading: false });
      toast.error('Failed to convert to project');
      throw error;
    }
  },

  updateEnquiryStatus: async (id: string, status: string) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, 'enquiries', id);
      await updateDoc(docRef, { status });
      
      const updatedEnquiries = get().enquiries.map(enquiry =>
        enquiry.id === id ? { ...enquiry, status } : enquiry
      );
      set({ enquiries: updatedEnquiries, loading: false });
      toast.success('Status updated successfully');
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      toast.error('Failed to update status');
    }
  },

  addTaskToEnquiry: async (enquiryId, task) => {
    const { addTask } = useTaskStore.getState();
    const taskWithEnquiryId = { ...task, enquiryId }; // Ensure enquiryId is included
    await addTask(taskWithEnquiryId);
  },

  deleteTaskFromEnquiry: async (taskId) => {
    const { deleteTask } = useTaskStore.getState();
    await deleteTask(taskId);
  },
}));