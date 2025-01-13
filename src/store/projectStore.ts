import { create } from 'zustand';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface User {
  id: string;
  fullName: string;
  email: string;
}

interface SubTask {
  id: string;
  name: string;
  description?: string;
  assignedTo?: User;
  deadline?: string;
  completed: boolean;
  subTasks: SubTask[];
}

interface Deliverable {
  id: string;
  name: string;
  description: string;
  hours?: number;
  costPerHour?: number;
  assignedTo?: User;
  deadline?: string;
  completed: boolean;
  subTasks: SubTask[];
}

interface Project {
  id?: string;
  __id: string;
  name: string;
  description: string;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  deliverables: Deliverable[];
  createdAt: string;
  type: 'project';
}

interface PathItem {
  type: 'deliverable' | 'subtask';
  id: string;
}

interface ProjectState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  currentPath: PathItem[];
  setCurrentPath: (path: PathItem[]) => void;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<Project | null>;
  createProject: (project: Omit<Project, 'id' | '__id' | 'createdAt'>) => Promise<void>;
  updateProject: (id: string, project: Omit<Project, 'id' | '__id' | 'createdAt'>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  getItemByPath: (projectId: string, path: PathItem[]) => Promise<Deliverable | SubTask | null>;
  addDeliverable: (projectId: string, deliverable: Omit<Deliverable, 'id' | 'subTasks' | 'completed'>) => Promise<void>;
  updateDeliverable: (projectId: string, deliverableId: string, data: Partial<Deliverable>) => Promise<void>;
  deleteDeliverable: (projectId: string, deliverableId: string) => Promise<void>;
  addSubTask: (projectId: string, deliverableId: string, parentTaskId: string | null, task: Omit<SubTask, 'id' | 'subTasks' | 'completed'>) => Promise<void>;
  updateSubTask: (projectId: string, deliverableId: string, taskId: string, data: Partial<SubTask>) => Promise<void>;
  deleteSubTask: (projectId: string, deliverableId: string, taskId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,
  error: null,
  currentPath: [],

  setCurrentPath: (path) => set({ currentPath: path }),

  fetchProjects: async () => {
    try {
      set({ loading: true, error: null });
      const querySnapshot = await getDocs(collection(db, 'projects'));
      const projects = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as Project[];
      set({ projects, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchProject: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, 'projects', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const project = { ...docSnap.data(), id: docSnap.id } as Project;
        set({ loading: false });
        return project;
      }
      set({ loading: false });
      return null;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      return null;
    }
  },

  createProject: async (projectData) => {
    try {
      set({ loading: true, error: null });
      const internalId = 'p-' + Math.random().toString().slice(2, 8);
      const newProject = {
        ...projectData,
        __id: internalId,
        createdAt: new Date().toISOString(),
        type: 'project' as const
      };
      const docRef = await addDoc(collection(db, 'projects'), newProject);
      const projectWithId = { ...newProject, id: docRef.id };
      const projects = [...get().projects, projectWithId];
      set({ projects, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  updateProject: async (id: string, projectData) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, 'projects', id);
      await updateDoc(docRef, projectData);
      const updatedProjects = get().projects.map(project =>
        project.id === id ? { ...projectData, id, __id: project.__id } : project
      );
      set({ projects: updatedProjects, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  deleteProject: async (id: string) => {
    try {
      set({ loading: true, error: null });
      await deleteDoc(doc(db, 'projects', id));
      const updatedProjects = get().projects.filter(project => project.id !== id);
      set({ projects: updatedProjects, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  getItemByPath: async (projectId: string, path: PathItem[]) => {
    try {
      const project = await get().fetchProject(projectId);
      if (!project) return null;

      let currentItem: Deliverable | SubTask | null = null;
      
      for (let i = 0; i < path.length; i++) {
        const { type, id } = path[i];
        
        if (i === 0 && type === 'deliverable') {
          currentItem = project.deliverables.find(d => d.id === id) || null;
        } else if (currentItem) {
          currentItem = currentItem.subTasks.find(t => t.id === id) || null;
        }
        
        if (!currentItem) return null;
      }

      return currentItem;
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    }
  },

  addDeliverable: async (projectId: string, deliverable: Omit<Deliverable, 'id' | 'subTasks' | 'completed'>) => {
    try {
      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      const newDeliverable: Deliverable = {
        ...deliverable,
        id: crypto.randomUUID(),
        completed: false,
        subTasks: []
      };

      const updatedProject = {
        ...project,
        deliverables: [...project.deliverables, newDeliverable]
      };

      await get().updateProject(projectId, updatedProject);
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  updateDeliverable: async (projectId: string, deliverableId: string, data: Partial<Deliverable>) => {
    try {
      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      const updatedDeliverables = project.deliverables.map(d =>
        d.id === deliverableId ? { ...d, ...data } : d
      );

      await get().updateProject(projectId, { ...project, deliverables: updatedDeliverables });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  deleteDeliverable: async (projectId: string, deliverableId: string) => {
    try {
      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      const updatedDeliverables = project.deliverables.filter(d => d.id !== deliverableId);
      await get().updateProject(projectId, { ...project, deliverables: updatedDeliverables });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  addSubTask: async (projectId: string, deliverableId: string, parentTaskId: string | null, task: Omit<SubTask, 'id' | 'subTasks' | 'completed'>) => {
    try {
      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      const newTask: SubTask = {
        ...task,
        id: crypto.randomUUID(),
        completed: false,
        subTasks: []
      };

      const addTaskToItem = (items: (Deliverable | SubTask)[]): (Deliverable | SubTask)[] => {
        return items.map(item => {
          if (item.id === (parentTaskId || deliverableId)) {
            return {
              ...item,
              subTasks: [...item.subTasks, newTask]
            };
          }
          if (item.subTasks.length > 0) {
            return {
              ...item,
              subTasks: addTaskToItem(item.subTasks)
            };
          }
          return item;
        });
      };

      const updatedDeliverables = addTaskToItem(project.deliverables);
      await get().updateProject(projectId, { ...project, deliverables: updatedDeliverables });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  updateSubTask: async (projectId: string, deliverableId: string, taskId: string, data: Partial<SubTask>) => {
    try {
      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      const updateTaskInItem = (items: (Deliverable | SubTask)[]): (Deliverable | SubTask)[] => {
        return items.map(item => {
          if (item.id === taskId) {
            return { ...item, ...data };
          }
          if (item.subTasks.length > 0) {
            return {
              ...item,
              subTasks: updateTaskInItem(item.subTasks)
            };
          }
          return item;
        });
      };

      const updatedDeliverables = updateTaskInItem(project.deliverables);
      await get().updateProject(projectId, { ...project, deliverables: updatedDeliverables });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  deleteSubTask: async (projectId: string, deliverableId: string, taskId: string) => {
    try {
      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      const deleteTaskFromItem = (items: (Deliverable | SubTask)[]): (Deliverable | SubTask)[] => {
        return items.map(item => ({
          ...item,
          subTasks: item.subTasks
            .filter(t => t.id !== taskId)
            .map(t => ({
              ...t,
              subTasks: deleteTaskFromItem(t.subTasks)
            }))
        }));
      };

      const updatedDeliverables = deleteTaskFromItem(project.deliverables);
      await get().updateProject(projectId, { ...project, deliverables: updatedDeliverables });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  }
}));