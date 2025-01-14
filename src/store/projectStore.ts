import { create } from 'zustand';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface User {
  id: string;
  fullName: string;
  email: string;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  hours?: number;
  costPerHour?: number;
  assignedTo?: User;
  deadline?: string;
  completed: boolean;
  children: Task[];
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
  tasks: Task[];
  createdAt: string;
  type: 'project';
}

interface PathItem {
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
  createProject: (project: Omit<Project, 'id' | '__id' | 'createdAt' | 'tasks'>) => Promise<void>;
  updateProject: (id: string, project: Omit<Project, 'id' | '__id' | 'createdAt'>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addTask: (projectId: string, path: PathItem[], task: Omit<Task, 'id' | 'children' | 'completed'>) => Promise<void>;
  updateTask: (projectId: string, path: PathItem[], taskId: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (projectId: string, path: PathItem[], taskId: string) => Promise<void>;
  getTaskByPath: (projectId: string, path: PathItem[]) => Promise<Task | null>;
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
        tasks: doc.data().tasks || [] // Ensure tasks array exists
      })) as Project[];
      set({ projects, loading: false });
    } catch (error) {
      console.error('Error fetching projects:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchProject: async (id) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, 'projects', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const project = {
          ...docSnap.data(),
          id: docSnap.id,
          tasks: docSnap.data().tasks || [] // Ensure tasks array exists
        } as Project;
        set({ loading: false });
        return project;
      }
      set({ loading: false });
      return null;
    } catch (error) {
      console.error('Error fetching project:', error);
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
        type: 'project' as const,
        tasks: [] // Initialize empty tasks array
      };
      const docRef = await addDoc(collection(db, 'projects'), newProject);
      const projectWithId = { ...newProject, id: docRef.id };
      const projects = [...get().projects, projectWithId];
      set({ projects, loading: false });
    } catch (error) {
      console.error('Error creating project:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  updateProject: async (id, projectData) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, 'projects', id);
      await updateDoc(docRef, projectData);
      const updatedProjects = get().projects.map(project =>
        project.id === id ? { ...projectData, id, __id: project.__id } : project
      );
      set({ projects: updatedProjects, loading: false });
    } catch (error) {
      console.error('Error updating project:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  deleteProject: async (id) => {
    try {
      set({ loading: true, error: null });
      await deleteDoc(doc(db, 'projects', id));
      const updatedProjects = get().projects.filter(project => project.id !== id);
      set({ projects: updatedProjects, loading: false });
    } catch (error) {
      console.error('Error deleting project:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  getTaskByPath: async (projectId, path) => {
    try {
      const project = await get().fetchProject(projectId);
      if (!project) return null;

      let current: Task | null = null;
      let items = project.tasks;

      for (const pathItem of path) {
        const found = items.find(item => item.id === pathItem.id);
        if (!found) return null;
        current = found;
        items = found.children || [];
      }

      return current;
    } catch (error) {
      console.error('Error getting task by path:', error);
      return null;
    }
  },

  addTask: async (projectId, path, taskData) => {
    try {
      set({ loading: true, error: null });
      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      const newTask: Task = {
        ...taskData,
        id: crypto.randomUUID(),
        completed: false,
        children: []
      };

      const updateNestedTasks = (tasks: Task[] = [], currentPath: PathItem[]): Task[] => {
        if (currentPath.length === 0) {
          return [...tasks, newTask];
        }

        return tasks.map(task => {
          if (task.id === currentPath[0].id) {
            return {
              ...task,
              children: updateNestedTasks(task.children || [], currentPath.slice(1))
            };
          }
          return task;
        });
      };

      const updatedTasks = path.length === 0 
        ? [...project.tasks, newTask]
        : updateNestedTasks(project.tasks, path);

      await get().updateProject(projectId, { ...project, tasks: updatedTasks });
      set({ loading: false });
    } catch (error) {
      console.error('Error adding task:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  updateTask: async (projectId, path, taskId, data) => {
    try {
      set({ loading: true, error: null });
      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      const updateNestedTask = (tasks: Task[]): Task[] => {
        return tasks.map(task => {
          if (task.id === taskId) {
            return { ...task, ...data };
          }
          if (task.children && task.children.length > 0) {
            return {
              ...task,
              children: updateNestedTask(task.children)
            };
          }
          return task;
        });
      };

      const updatedTasks = updateNestedTask(project.tasks);
      await get().updateProject(projectId, { ...project, tasks: updatedTasks });
      set({ loading: false });
    } catch (error) {
      console.error('Error updating task:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  deleteTask: async (projectId, path, taskId) => {
    try {
      set({ loading: true, error: null });
      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      const deleteNestedTask = (tasks: Task[]): Task[] => {
        return tasks.filter(task => {
          if (task.id === taskId) return false;
          if (task.children && task.children.length > 0) {
            task.children = deleteNestedTask(task.children);
          }
          return true;
        });
      };

      const updatedTasks = deleteNestedTask(project.tasks);
      await get().updateProject(projectId, { ...project, tasks: updatedTasks });
      set({ loading: false });
    } catch (error) {
      console.error('Error deleting task:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  toggleTaskCompletion: async (projectId, path) => {
    try {
      const task = await get().getTaskByPath(projectId, path);
      if (!task) throw new Error('Task not found');

      const lastPathItem = path[path.length - 1];
      await get().updateTask(projectId, path.slice(0, -1), lastPathItem.id, {
        completed: !task.completed
      });
    } catch (error) {
      console.error('Error toggling task completion:', error);
      throw error;
    }
  }
}));