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
  subTasks: SubTask[]; // Ensure subTasks is always an array
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
  subTasks: SubTask[]; // Ensure subTasks is always an array
}

export interface Project {
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
  addDeliverable: (projectId: string, deliverable: Omit<Deliverable, 'id' | 'subTasks' | 'completed'>) => Promise<void>;
  updateDeliverable: (projectId: string, deliverableId: string, data: Partial<Deliverable>) => Promise<void>;
  deleteDeliverable: (projectId: string, deliverableId: string) => Promise<void>;
  addSubTask: (projectId: string, path: PathItem[], task: Omit<SubTask, 'id' | 'subTasks' | 'completed'>) => Promise<void>;
  updateSubTask: (projectId: string, path: PathItem[], taskId: string, data: Partial<SubTask>) => Promise<void>;
  deleteSubTask: (projectId: string, path: PathItem[], taskId: string) => Promise<void>;
  getItemByPath: (projectId: string, path: PathItem[]) => Promise<Deliverable | SubTask | null>;
  toggleTaskCompletion: (projectId: string, path: PathItem[]) => Promise<void>;
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

  addDeliverable: async (projectId, deliverable) => {
    try {
      set({ loading: true, error: null });
      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      const newDeliverable: Deliverable = {
        ...deliverable,
        id: crypto.randomUUID(),
        completed: false,
        subTasks: [] // Initialize subTasks as an empty array
      };

      const updatedDeliverables = [...project.deliverables, newDeliverable];
      await get().updateProject(projectId, { ...project, deliverables: updatedDeliverables });

      set({ loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  updateDeliverable: async (projectId, deliverableId, data) => {
    try {
      set({ loading: true, error: null });
      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      const updatedDeliverables = project.deliverables.map(deliverable =>
        deliverable.id === deliverableId ? { ...deliverable, ...data } : deliverable
      );

      await get().updateProject(projectId, { ...project, deliverables: updatedDeliverables });
      set({ loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  deleteDeliverable: async (projectId, deliverableId) => {
    try {
      set({ loading: true, error: null });
      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      const updatedDeliverables = project.deliverables.filter(d => d.id !== deliverableId);
      await get().updateProject(projectId, { ...project, deliverables: updatedDeliverables });

      set({ loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  addSubTask: async (projectId, path, task) => {
    try {
      set({ loading: true, error: null });
      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      // Ensure subTasks is initialized as an empty array
      const newTask: SubTask = {
        ...task,
        id: crypto.randomUUID(),
        completed: false,
        subTasks: [] // Initialize subTasks as an empty array
      };

      const updateNestedTasks = (items: (Deliverable | SubTask)[], currentPath: PathItem[]): (Deliverable | SubTask)[] => {
        return items.map(item => {
          if (item.id === currentPath[0].id) {
            if (currentPath.length === 1) {
              return {
                ...item,
                subTasks: [...(item.subTasks || []), newTask] // Use fallback empty array
              };
            }
            return {
              ...item,
              subTasks: updateNestedTasks(item.subTasks || [], currentPath.slice(1)) // Use fallback empty array
            };
          }
          return item;
        });
      };

      const updatedDeliverables = updateNestedTasks(project.deliverables, path);
      await get().updateProject(projectId, { ...project, deliverables: updatedDeliverables });
      set({ loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  updateSubTask: async (projectId, path, taskId, data) => {
    try {
      set({ loading: true, error: null });
      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      const updateNestedTasks = (items: (Deliverable | SubTask)[], currentPath: PathItem[]): (Deliverable | SubTask)[] => {
        return items.map(item => {
          if (item.id === currentPath[0].id) {
            if (currentPath.length === 1) {
              return { ...item, ...data };
            }
            return {
              ...item,
              subTasks: updateNestedTasks(item.subTasks || [], currentPath.slice(1)) // Use fallback empty array
            };
          }
          return item;
        });
      };

      const updatedDeliverables = updateNestedTasks(project.deliverables, path);
      await get().updateProject(projectId, { ...project, deliverables: updatedDeliverables });

      set({ loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  deleteSubTask: async (projectId, path, taskId) => {
    try {
      set({ loading: true, error: null });
      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      const deleteNestedTask = (items: (Deliverable | SubTask)[], currentPath: PathItem[]): (Deliverable | SubTask)[] => {
        return items.map(item => {
          if (item.id === currentPath[0].id) {
            if (currentPath.length === 1) {
              return {
                ...item,
                subTasks: item.subTasks.filter(t => t.id !== taskId)
              };
            }
            return {
              ...item,
              subTasks: deleteNestedTask(item.subTasks || [], currentPath.slice(1)) // Use fallback empty array
            };
          }
          return item;
        });
      };

      const updatedDeliverables = deleteNestedTask(project.deliverables, path);
      await get().updateProject(projectId, { ...project, deliverables: updatedDeliverables });

      set({ loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  getItemByPath: async (projectId, path) => {
  try {
    const project = await get().fetchProject(projectId);
    if (!project) return null;

    let current: Deliverable | SubTask | null = null;
    let items = project.deliverables;

    for (const pathItem of path) {
      const found = items.find((item) => item.id === pathItem.id);
      if (!found) return null;
      current = found;
      items = found.subTasks || []; // Use fallback empty array
    }

    return current;
  } catch (error) {
    console.error('Error getting item by path:', error);
    return null;
  }
},

  toggleTaskCompletion: async (projectId, path) => {
    try {
      const item = await get().getItemByPath(projectId, path);
      if (!item) throw new Error('Item not found');

      const lastPathItem = path[path.length - 1];
      await get().updateSubTask(projectId, path.slice(0, -1), lastPathItem.id, {
        completed: !item.completed
      });
    } catch (error) {
      console.error('Error toggling task completion:', error);
      throw error;
    }
  }
}));