import { create } from 'zustand';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { Task, useTaskStore } from './taskStore';
import { useProjectStore } from './projectStore';

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
  endClient: string;
  deadLine:string
}

interface TaskWithEnquiryId extends Task {
  enquiryId: string;
}

interface EnquiryState {
  enquiries: Enquiry[];
  loading: boolean;
  error: string | null;
  cache: {
    [key: string]: Enquiry; // Cache keyed by enquiry ID
  };
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
  cache: {},

  // Fetch all enquiries
  fetchEnquiries: async () => {
    try {
      set({ loading: true, error: null });

      // Check if enquiries are already cached
      const cachedEnquiries = get().enquiries;
      if (cachedEnquiries.length > 0) {
        set({ loading: false });
        return;
      }

      console.log('Fetching enquiries from Firestore...');
      

      // Fetch from Firestore if not cached
      const querySnapshot = await getDocs(collection(db, 'enquiries'));
      const enquiries = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as Enquiry[];

      // Update cache and state
      const cache = enquiries.reduce((acc, enquiry) => {
        acc[enquiry.id!] = enquiry;
        return acc;
      }, {} as { [key: string]: Enquiry });

      set({ enquiries, cache, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  // Fetch a single enquiry by ID
  fetchEnquiry: async (id: string) => {
    try {
      set({ loading: true, error: null });

      // Check if enquiry is already cached
      const cachedEnquiry = get().cache[id];
      if (cachedEnquiry) {
        set({ loading: false });
        return cachedEnquiry;
      }

      console.log('Fetching enquiry from Firestore...');

      // Fetch from Firestore if not cached
      const docRef = doc(db, 'enquiries', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const enquiry = { ...docSnap.data(), id: docSnap.id } as Enquiry;

        // Update cache
        set((state) => ({
          cache: { ...state.cache, [id]: enquiry },
          loading: false,
        }));

        return enquiry;
      }

      set({ loading: false });
      return null;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      return null;
    }
  },

  // Create a new enquiry
  createEnquiry: async (enquiryData) => {
    try {
      set({ loading: true, error: null });
      const newEnquiry = {
        ...enquiryData,
        __id: `E-${enquiryData.enquiryNumber}`,
        createdAt: new Date().toISOString(),
        type: 'enquiry' as const,
        status: 'on hold' as const,
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, 'enquiries'), newEnquiry);
      const enquiryWithId = { ...newEnquiry, id: docRef.id };

      // Update cache and state
      set((state) => ({
        enquiries: [...state.enquiries, enquiryWithId],
        cache: { ...state.cache, [docRef.id]: enquiryWithId },
        loading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  // Update an existing enquiry
  updateEnquiry: async (id: string, enquiryData) => {
    try {
      set({ loading: true, error: null });

      // Update in Firestore
      const docRef = doc(db, 'enquiries', id);
      await updateDoc(docRef, { ...enquiryData, type: 'enquiry' });

      // Update cache and state
      const updatedEnquiry = { ...enquiryData, id, __id: `E-${enquiryData.enquiryNumber}`, type: 'enquiry' };
      const state = get();
      set({
        enquiries: state.enquiries.map((enquiry) =>
          enquiry.id === id ? updatedEnquiry : enquiry
        ) as Enquiry[],
        cache: { ...state.cache, [id]: updatedEnquiry } as { [key: string]: Enquiry; },
        loading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  // Delete an enquiry
  deleteEnquiry: async (id: string) => {
    try {
      set({ loading: true, error: null });

      // Delete from Firestore
      await deleteDoc(doc(db, 'enquiries', id));

      // Remove from cache and state
      set((state) => ({
        enquiries: state.enquiries.filter((enquiry) => enquiry.id !== id),
        cache: Object.fromEntries(
          Object.entries(state.cache).filter(([key]) => key !== id)
        ),
        loading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  // Convert enquiry to project
  convertToProject: async (enquiryId: string) => {
    try {
      set({ loading: true, error: null });

      const enquiry = await get().fetchEnquiry(enquiryId);
      if (!enquiry) throw new Error('Enquiry not found');

      // Get customer details from customer_id
      const customerDoc = await getDoc(doc(db, 'customers', enquiry.customer_id));
      const customerData = customerDoc.exists() ? customerDoc.data() : null;

      // Create customer object for project
      const customer = customerData
        ? {
            name: customerData.name,
            phone: customerData.contactPersons[0]?.phone || '',
            address: customerData.address,
          }
        : {
            name: '',
            phone: '',
            address: '',
          };

      const projectId = 'P-' + enquiry.__id.split('-')[1];

      // Calculate total cost for all tasks
      const total_amount = enquiry.deliverables.reduce((total, deliverable) => {
        const cost = (deliverable.hours || 0) * (deliverable.costPerHour || 0);
        return total + cost;
      }, 0);

      // Create tasks in the tasks collection
      const taskPromises = enquiry.deliverables.map((deliverable) =>
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
          updatedAt: new Date().toISOString(),
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
        __id: 'P-' + enquiry.__id.split('-')[1],
        type: 'project' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'not-started' as const,
        projectNumber: enquiry.enquiryNumber,
        project_due_date: null,
        project_start_date: null,
        endClient: enquiry.endClient,
        settlement: "not-defined",
        total_amount, // Assign the calculated total amount
      };

      // Create project in Firestore
      const docRef = await addDoc(collection(db, 'projects'), projectData);
      const projectWithId = { ...projectData, id: docRef.id };

      // Update project store state directly
      const { projects } = useProjectStore.getState();
      useProjectStore.setState({
        projects: [...projects, projectWithId], // Add the new project to the projects array
      });

      // Update enquiry status
      await updateDoc(doc(db, 'enquiries', enquiryId), {
        status: 'moved to projects',
      });

      // Update local state - just update the status instead of filtering out
      const updatedEnquiries = get().enquiries.map((e) =>
        e.id === enquiryId ? { ...e, status: 'moved to projects' } : e
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

  // Update enquiry status
  updateEnquiryStatus: async (id: string, status: string) => {
    try {
      set({ loading: true, error: null });

      // Update in Firestore
      const docRef = doc(db, 'enquiries', id);
      await updateDoc(docRef, { status });

      // Update cache and state
      set((state) => ({
        enquiries: state.enquiries.map((enquiry) =>
          enquiry.id === id ? { ...enquiry, status } : enquiry
        ),
        cache: { ...state.cache, [id]: { ...state.cache[id], status } },
        loading: false,
      }));

      toast.success('Status updated successfully');
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      toast.error('Failed to update status');
    }
  },

  // Add a task to an enquiry
  addTaskToEnquiry: async (enquiryId, task) => {
    const { addTask } = useTaskStore.getState();
    const taskWithEnquiryId = { ...task, enquiryId }; // Ensure enquiryId is included
    await addTask(taskWithEnquiryId);
  },

  // Delete a task from an enquiry
  deleteTaskFromEnquiry: async (taskId) => {
    const { deleteTask } = useTaskStore.getState();
    await deleteTask(taskId);
  },
}));