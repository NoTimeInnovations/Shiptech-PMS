import { create } from 'zustand';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  Timestamp,
  where,
  query
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project } from './projectStore';

export interface ContactPerson {
  name: string;
  countryCode?:string;
  phone: string;
  email:string;
}

export interface Customer {
  id?: string;
  name: string;
  nickname:string;
  userId?: string;
  address: string;
  billingAddress: string;
  shippingAddress:string;
  phone?: string;
  gstNumber: string;
  contactPersons: ContactPerson[];
  email: string;
  logoUrl?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

interface CustomerState {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  cache: {
    customers: { [key: string]: Customer }; // Cache for customers by ID
    projects: { [key: string]: Project[] }; // Cache for projects by customer ID
  };
  fetchCustomers: () => Promise<Customer[]>;
  fetchCustomer: (id: string) => Promise<Customer | null>;
  fetchCustomerByUserId: (id: string) => Promise<Customer | null>;
  fetchCustomerProjects: (customer: { 
    id: string;
    name: string;
    phone: string;
    address: string;
  }) => Promise<Project[]>;
  createCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Customer>;
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  loading: false,
  error: null,
  cache: {
    customers: {},
    projects: {},
  },

  // Fetch all customers
  fetchCustomers: async () => {
    set({ loading: true, error: null });
    try {
      // Check if customers are already cached
      const cachedCustomers = Object.values(get().cache.customers);
      if (cachedCustomers.length > 0) {
        set({ customers: cachedCustomers, loading: false });
        return cachedCustomers;
      }

      console.log('Fetching customers from Firestore...');
      

      // Fetch from Firestore if not cached
      const customersCollection = collection(db, 'customers');
      const customersSnapshot = await getDocs(customersCollection);
      
      if (customersSnapshot.empty) {
        set({ customers: [], loading: false });
        return [];
      }
      
      const customersList = customersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Customer[];

      // Update cache
      const customersCache = customersList.reduce((acc, customer) => {
        acc[customer.id!] = customer;
        return acc;
      }, {} as { [key: string]: Customer });

      set({ customers: customersList, cache: { ...get().cache, customers: customersCache }, loading: false });
      return customersList;
    } catch (error) {
      console.error('Error fetching customers:', error);
      set({ error: 'Failed to fetch customers', loading: false });
      return [];
    }
  },

  // Fetch a single customer by ID
  fetchCustomer: async (id: string) => {
    set({ loading: true, error: null });
    try {
      // Check if customer is already cached
      const cachedCustomer = get().cache.customers[id];
      if (cachedCustomer) {
        set({ loading: false });
        return cachedCustomer;
      }

      // Fetch from Firestore if not cached
      const customerDoc = await getDoc(doc(db, 'customers', id));
      
      if (!customerDoc.exists()) {
        set({ loading: false });
        return null;
      }

      console.log('Fetching customer from Firestore...');
      
      
      const customerData = {
        id: customerDoc.id,
        ...customerDoc.data()
      } as Customer;

      // Update cache
      set((state) => ({
        cache: { ...state.cache, customers: { ...state.cache.customers, [id]: customerData } },
        loading: false,
      }));

      return customerData;
    } catch (error) {
      console.error('Error fetching customer:', error);
      set({ error: 'Failed to fetch customer', loading: false });
      return null;
    }
  },

  // Fetch a customer by user ID
  fetchCustomerByUserId: async (id: string) => {
    set({ loading: true, error: null });
    try {
      // Check if customer is already cached
      const cachedCustomer = Object.values(get().cache.customers).find(customer => customer.userId === id);
      if (cachedCustomer) {
        set({ loading: false });
        return cachedCustomer;
      }

      console.log('Fetching customer by user ID from Firestore...');
      

      // Fetch from Firestore if not cached
      const customersCollection = collection(db, 'customers');
      const q = query(customersCollection, where('userId', '==', id));
      const customersSnapshot = await getDocs(q);

      if (customersSnapshot.empty) {
        set({ loading: false });
        return null;
      }

      const customerDoc = customersSnapshot.docs[0];
      const customerData = {
        id: customerDoc.id,
        ...customerDoc.data()
      } as Customer;

      // Update cache
      set((state) => ({
        cache: { ...state.cache, customers: { ...state.cache.customers, [customerData.id!]: customerData } },
        loading: false,
      }));

      return customerData;
    } catch (error) {
      console.error('Error fetching customer:', error);
      set({ error: 'Failed to fetch customer', loading: false });
      return null;
    }
  },

  // Fetch projects for a customer
  fetchCustomerProjects: async (customer: { 
    id: string;
    name: string;
    phone: string;
    address: string;
  }) => {
    try {
      // Check if projects are already cached
      const cachedProjects = get().cache.projects[customer.id];
      if (cachedProjects) {
        return cachedProjects;
      }

      console.log('Fetching customer projects from Firestore...');
      

      // Fetch from Firestore if not cached
      const projectsCollection = collection(db, 'projects');
      const q = query(projectsCollection, where('customer', '==', customer));
      const projectsSnapshot = await getDocs(q);
      
      if (projectsSnapshot.empty) {
        return [];
      }
      
      const projectsList = projectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];

      // Update cache
      set((state) => ({
        cache: { ...state.cache, projects: { ...state.cache.projects, [customer.id]: projectsList } },
      }));

      return projectsList;
    } catch (error) {
      console.error('Error fetching customer projects:', error);
      return [];
    }
  },

  // Create a new customer
  createCustomer: async (customer) => {
    set({ loading: true, error: null });
    try {
      const customerData = {
        ...customer,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'customers'), customerData);
      const newCustomer = {
        id: docRef.id,
        ...customerData
      } as Customer;

      // Update cache and state
      set((state) => ({
        customers: [...state.customers, newCustomer],
        cache: { ...state.cache, customers: { ...state.cache.customers, [docRef.id]: newCustomer } },
        loading: false,
      }));

      return newCustomer;
    } catch (error) {
      console.error('Error creating customer:', error);
      set({ error: 'Failed to create customer', loading: false });
      throw error;
    }
  },

  // Update an existing customer
  updateCustomer: async (id, customerUpdates) => {
    set({ loading: true, error: null });
    try {
      const customerRef = doc(db, 'customers', id);
      
      await updateDoc(customerRef, {
        ...customerUpdates,
        updatedAt: serverTimestamp()
      });

      // Update cache and state
      set((state) => ({
        customers: state.customers.map(customer => 
          customer.id === id ? { ...customer, ...customerUpdates } : customer
        ),
        cache: { ...state.cache, customers: { ...state.cache.customers, [id]: { ...state.cache.customers[id], ...customerUpdates } } },
        loading: false,
      }));
    } catch (error) {
      console.error('Error updating customer:', error);
      set({ error: 'Failed to update customer', loading: false });
      throw error;
    }
  },

  // Delete a customer
  deleteCustomer: async (id) => {
    set({ loading: true, error: null });
    try {
      // First, get the customer's email
      const customerDoc = await getDoc(doc(db, 'customers', id));
      if (!customerDoc.exists()) {
        throw new Error('Customer not found');
      }
      const customerData = customerDoc.data();
      const customerEmail = customerData.email;

      // Find the user document in the users collection
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', customerEmail));
      const userSnapshot = await getDocs(q);
      
      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        
        // Delete the user document from Firestore
        await deleteDoc(doc(db, 'users', userDoc.id));
      }

      // Finally, delete the customer document
      await deleteDoc(doc(db, 'customers', id));
      
      // Update cache and state
      set((state) => ({
        customers: state.customers.filter(customer => customer.id !== id),
        cache: { ...state.cache, customers: Object.fromEntries(Object.entries(state.cache.customers).filter(([key]) => key !== id),) },
        loading: false,
      }));
    } catch (error) {
      console.error('Error deleting customer:', error);
      set({ error: 'Failed to delete customer', loading: false });
      throw error;
    }
  },
}));