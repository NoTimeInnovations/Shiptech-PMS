import { create } from 'zustand';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

interface User {
  id: string;
  fullName: string;
  email: string;
}

interface TimeEntry {
  id: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime?: string;
  duration?: number; // in minutes
}

export interface Task {
  id: string;
  name: string;
  description: string;
  hours?: number;
  costPerHour?: number;
  assignedTo?: User[];
  deadline?: string;
  completed: boolean;
  children: Task[];
  projectId?: string;
  path?: string;
  timeEntries?: TimeEntry[];
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
  status: 'completed' | 'ongoing' | 'not-started';
  type: 'project';
  project_due_date?: string | null;
  project_start_date?: string | null;
}

interface PathItem {
  id: string;
}

interface ProjectState {
  projects: Project[];
  userTasks: Task[];
  loading: boolean;
  error: string | null;
  currentPath: PathItem[];
  activeTimer: {
    taskId: string | null;
    projectId: string | null;
    startTime: string | null;
  };
  setCurrentPath: (path: PathItem[]) => void;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<Project | null>;
  createProject: (project: Omit<Project, 'id' | '__id' | 'createdAt' | 'tasks' | 'type' | 'project_due_date'>) => Promise<void>;
  updateProject: (id: string, project: Omit<Project, 'id' | '__id' | 'createdAt' | 'type'>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addTask: (projectId: string, path: PathItem[], task: Omit<Task, 'id' | 'children' | 'completed'>) => Promise<void>;
  updateTask: (projectId: string, path: PathItem[], taskId: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (projectId: string, path: PathItem[], taskId: string) => Promise<void>;
  getTaskByPath: (projectId: string, path: PathItem[]) => Promise<Task | null>;
  toggleTaskCompletion: (projectId: string, path: PathItem[]) => Promise<void>;
  updateProjectDueDate: (projectId: string, dueDate: string | null) => Promise<void>;
  updateProjectStartDate: (projectId: string, startDate: string | null) => Promise<void>;
  fetchUserTasks: () => Promise<void>;
  startTimer: (projectId: string, taskId: string) => Promise<void>;
  stopTimer: (projectId: string, taskId: string) => Promise<void>;
  getTaskTimeEntries: (projectId: string, taskId: string) => Promise<TimeEntry[]>;
  checkActiveTimer: () => Promise<void>;
  updateProjectStatus: (status: 'completed' | 'ongoing' | 'not-started', projectId: string) => Promise<void>;
  getItemByPath: (projectId: string, pathArray: { type: 'deliverable' | 'subtask'; id: string }[]) => Promise<any>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  userTasks: [],
  loading: false,
  error: null,
  currentPath: [],
  activeTimer: {
    taskId: null,
    projectId: null,
    startTime: null,
  },

  setCurrentPath: (path) => set({ currentPath: path }),

  fetchProjects: async () => {
    try {
      set({ loading: true, error: null });
      const querySnapshot = await getDocs(collection(db, 'projects'));
      const projects = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        tasks: doc.data().tasks || []
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
          tasks: docSnap.data().tasks || []
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
        tasks: [],
        project_due_date: null
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
      
      const cleanTasks = (tasks: Task[]): any[] => {
        return tasks.map(task => ({
          id: task.id,
          name: task.name || '',
          description: task.description || '',
          hours: task.hours || 0,
          costPerHour: task.costPerHour || 0,
          assignedTo: task.assignedTo ? task.assignedTo.map(user => ({
            id: user.id,
            fullName: user.fullName,
            email: user.email
          })) : [],
          deadline: task.deadline || null,
          completed: Boolean(task.completed),
          children: task.children ? cleanTasks(task.children) : [],
          timeEntries: task.timeEntries || []
        }));
      };

      const cleanProjectData = {
        name: projectData.name || '',
        description: projectData.description || '',
        customer: {
          name: projectData.customer?.name || '',
          phone: projectData.customer?.phone || '',
          address: projectData.customer?.address || ''
        },
        tasks: cleanTasks(projectData.tasks || []),
        type: 'project' as const,
        project_due_date: projectData.project_due_date || null
      };

      await updateDoc(docRef, cleanProjectData);
      
      const updatedProjects = get().projects.map(project =>
        project.id === id ? { 
          ...project,
          ...cleanProjectData,
          id,
          __id: project.__id,
          createdAt: project.createdAt
        } : project
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
        name: taskData.name || '',
        description: taskData.description || '',
        completed: false,
        children: [],
        timeEntries: []
      };

      const updateNestedTasks = (tasks: Task[], currentPath: PathItem[]): Task[] => {
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
            return {
              ...task,
              ...data,
              name: data.name || task.name,
              description: data.description || task.description,
              children: task.children || [],
              timeEntries: task.timeEntries || []
            };
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
  },

  updateProjectDueDate: async (projectId, dueDate) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, 'projects', projectId);
      await updateDoc(docRef, { project_due_date: dueDate });
      
      const updatedProjects = get().projects.map(project =>
        project.id === projectId ? { ...project, project_due_date: dueDate } : project
      );
      
      set({ projects: updatedProjects, loading: false });
    } catch (error) {
      console.error('Error updating project due date:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  updateProjectStartDate: async (projectId, startDate) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, 'projects', projectId);
      await updateDoc(docRef, { project_start_date: startDate });
      
      const updatedProjects = get().projects.map(project =>
        project.id === projectId ? { ...project, project_start_date: startDate } : project
      );
      
      set({ projects: updatedProjects, loading: false });
    } catch (error) {
      console.error('Error updating project due date:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  fetchUserTasks: async () => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        set({ userTasks: [], loading: false });
        return;
      }

      const querySnapshot = await getDocs(collection(db, 'projects'));
      const projects = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        tasks: doc.data().tasks || []
      })) as Project[];

      const flattenTasks = (tasks: Task[], projectId: string, parentPath: string = ''): Task[] => {
        return tasks.reduce((acc: Task[], task) => {
          const currentPath = parentPath ? `${parentPath}/${task.id}` : task.id;
          const isAssignedToUser = task.assignedTo?.some(user => user.id === currentUser.uid);
          
          const flatTask = isAssignedToUser ? [{
            ...task,
            projectId,
            path: currentPath
          }] : [];

          return [
            ...acc,
            ...flatTask,
            ...flattenTasks(task.children || [], projectId, currentPath)
          ];
        }, []);
      };

      const userTasks = projects.reduce((acc: Task[], project) => {
        if (!project.id) return acc;
        const projectTasks = flattenTasks(project.tasks, project.id);
        return [...acc, ...projectTasks];
      }, []);

      set({ userTasks, loading: false });
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  startTimer: async (projectId: string, taskId: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      const updateTaskTimer = (tasks: Task[]): Task[] => {
        return tasks.map(task => {
          if (task.id === taskId) {
            const timeEntry: TimeEntry = {
              id: crypto.randomUUID(),
              userId: currentUser.uid,
              userName: currentUser.displayName || currentUser.email || 'Unknown User',
              startTime: new Date().toISOString(),
            };
            return {
              ...task,
              timeEntries: [...(task.timeEntries || []), timeEntry]
            };
          }
          if (task.children && task.children.length > 0) {
            return {
              ...task,
              children: updateTaskTimer(task.children)
            };
          }
          return task;
        });
      };

      const updatedTasks = updateTaskTimer(project.tasks);
      await get().updateProject(projectId, { ...project, tasks: updatedTasks });
      
      set({ 
        activeTimer: {
          taskId,
          projectId,
          startTime: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error starting timer:', error);
      throw error;
    }
  },

  stopTimer: async (projectId: string, taskId: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      const updateTaskTimer = (tasks: Task[]): Task[] => {
        return tasks.map(task => {
          if (task.id === taskId) {
            const timeEntries = task.timeEntries || [];
            const lastEntry = timeEntries[timeEntries.length - 1];
            if (lastEntry && !lastEntry.endTime && lastEntry.userId === currentUser.uid) {
              const endTime = new Date().toISOString();
              const duration = Math.round(
                (new Date(endTime).getTime() - new Date(lastEntry.startTime).getTime()) / 60000
              );
              const updatedEntry = {
                ...lastEntry,
                endTime,
                duration
              };
              return {
                ...task,
                timeEntries: [...timeEntries.slice(0, -1), updatedEntry]
              };
            }
            return task;
          }
          if (task.children && task.children.length > 0) {
            return {
              ...task,
              children: updateTaskTimer(task.children)
            };
          }
          return task;
        });
      };

      const updatedTasks = updateTaskTimer(project.tasks);
      await get().updateProject(projectId, { ...project, tasks: updatedTasks });
      
      set({ 
        activeTimer: {
          taskId: null,
          projectId: null,
          startTime: null
        }
      });
    } catch (error) {
      console.error('Error stopping timer:', error);
      throw error;
    }
  },

  getTaskTimeEntries: async (projectId: string, taskId: string) => {
    try {
      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      const findTask = (tasks: Task[]): Task | null => {
        for (const task of tasks) {
          if (task.id === taskId) return task;
          if (task.children && task.children.length > 0) {
            const found = findTask(task.children);
            if (found) return found;
          }
        }
        return null;
      };

      const task = findTask(project.tasks);
      return task?.timeEntries || [];
    } catch (error) {
      console.error('Error getting task time entries:', error);
      return [];
    }
  },

  checkActiveTimer: async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        set({ 
          activeTimer: {
            taskId: null,
            projectId: null,
            startTime: null
          }
        });
        return;
      }

      const querySnapshot = await getDocs(collection(db, 'projects'));
      let foundActiveTimer = false;

      for (const projectDoc of querySnapshot.docs) {
        const projectData = projectDoc.data();
        const tasks = projectData.tasks || [];

        const findActiveTimer = (tasks: Task[]): boolean => {
          for (const task of tasks) {
            const timeEntries = task.timeEntries || [];
            const lastEntry = timeEntries[timeEntries.length - 1];
            
            if (lastEntry && 
                lastEntry.userId === currentUser.uid && 
                !lastEntry.endTime) {
              set({ 
                activeTimer: {
                  taskId: task.id,
                  projectId: projectDoc.id,
                  startTime: lastEntry.startTime
                }
              });
              return true;
            }

            if (task.children && task.children.length > 0) {
              if (findActiveTimer(task.children)) {
                return true;
              }
            }
          }
          return false;
        };

        if (findActiveTimer(tasks)) {
          foundActiveTimer = true;
          break;
        }
      }

      if (!foundActiveTimer) {
        set({
          activeTimer: {
            taskId: null,
            projectId: null,
            startTime: null
          }
        });
      }
    } catch (error) {
      console.error('Error checking active timer:', error);
      set({
        activeTimer: {
          taskId: null,
          projectId: null,
          startTime: null
        }
      });
    }
  },

  updateProjectStatus: async (status: 'completed' | 'ongoing' | 'not-started', projectId: string) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, 'projects', projectId);
      await updateDoc(docRef, { status });
      
      const updatedProjects = get().projects.map(project =>
        project.id === projectId ? { ...project, status } : project
      );
      
      set({ projects: updatedProjects, loading: false });
    } catch (error) {
      console.error('Error updating project status:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  getItemByPath: async (projectId, pathArray) => {
    const response = await fetch(`/api/projects/${projectId}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pathArray }),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch item by path');
    }
    return response.json();
  },
}));