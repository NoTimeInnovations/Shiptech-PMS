import { create } from 'zustand';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, getDoc, doc, query, where, updateDoc, deleteDoc } from 'firebase/firestore';

export interface Document {
  id: string;
  enquiryNumber: string;
  projectNumber: string;
  documentNumber: string;
  sentBy: string;
  date: string;
  medium: 'email' | 'physical' | 'other';
  fileUrl: string;
  fileName: string;
  projectId: string;
  createdAt: string;
}

interface DocumentState {
  documents: Document[];
  loading: boolean;
  error: string | null;
  fetchDocuments: (projectId: string) => Promise<void>;
  fetchDocument: (id: string) => Promise<Document | null>;
  createDocument: (document: Omit<Document, 'id' | 'createdAt'>) => Promise<Document>;
  updateDocument: (id: string, data: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  loading: false,
  error: null,

  fetchDocuments: async (projectId) => {
    set({ loading: true });
    try {
      const q = query(collection(db, 'documents'), where('projectId', '==', projectId));
      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Document[];
      set({ documents, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch documents', loading: false });
      console.log(error);
      
    }
  },

  fetchDocument: async (id) => {
    try {
      const docRef = doc(db, 'documents', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Document;
      }
      return null;
    } catch (error) {
      set({ error: 'Failed to fetch document' });
      console.log(error);
      return null;
    }
  },

  createDocument: async (documentData) => {
    set({ loading: true });
    try {
      const newDocument = {
        ...documentData,
        createdAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, 'documents'), newDocument);
      const document = { ...newDocument, id: docRef.id };
      set(state => ({
        documents: [...state.documents, document],
        loading: false
      }));
      return document;
    } catch (error) {
      set({ error: 'Failed to create document', loading: false });
      throw error;
    }
  },

  updateDocument: async (id: string, data: Partial<Document>) => {
    set({ loading: true });
    try {
      await updateDoc(doc(db, 'documents', id), data);
      set(state => ({
        documents: state.documents.map(doc => 
          doc.id === id ? { ...doc, ...data } : doc
        )
      }));
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteDocument: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'documents', id));
      set((state) => ({
        documents: state.documents.filter((doc) => doc.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  },
}));