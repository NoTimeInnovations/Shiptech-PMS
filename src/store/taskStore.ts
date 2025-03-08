import { create } from "zustand";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  where,
  query,
  getDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export interface TimeEntry {
  id: string;
  userId: string;
  userName: string;
  startTime: string;
  duration: number; // duration in minutes
}

export interface Task {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  description: string;
  hours?: number;
  costPerHour?: number;
  assignedTo?: {
    name: string;
    email: string;
    id: string;
  }[];
  deadline?: string | null;
  completed: boolean;
  timeEntries?: TimeEntry[];
  percentage: number;
  maxAllowedPercentage?: number;
  createdAt: string;
  updatedAt: string;
  children?: Task[];
}

interface TaskState {
  tasks: Task[];
  taskNodes: Task[];
  task: Task | null;
  loading: boolean;
  error: string | null;
  fetchTask: (taskId: string) => Promise<Task | null>;
  fetchUserTasks: (user: {
    id: string;
    name: string;
    email: string;
  }) => Promise<void>;
  addTask: (task: Omit<Task, "id">) => Promise<void>;
  updateTask: (
    id: string,
    updates: Omit<Partial<Task>, "children"> & { id?: string },
    isParent?: boolean
  ) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  fetchAllTasksWithChildren: (
    projectId: string,
    taskId?: string,
    forceFetch?: boolean
  ) => Promise<Task[]>;
  checkActiveTime: (taskId: string) => Promise<number | null>;
  getTaskTimeEntries: (taskId: string) => Promise<TimeEntry[] | null>;
  startTimer: (
    taskId: string,
    user: { id: string; name: string }
  ) => Promise<void>;
  stopTimer: (
    taskId: string,
    user: { id: string; name: string }
  ) => Promise<void>;
  searchTaskFromTree: (taskId: string, tasks: Task[]) => Task | null;
  convertNodesToTree: (nodes: Task[]) => Task[];
  fetchSiblingTasks: (
    parentId: string,
    taskId: string,
    projectId: string
  ) => Promise<Task[]>;
  getTaskPath: (taskId: string, projectId: string) => Promise<string>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  taskNodes: [],
  task: null,
  loading: false,
  error: null,

  fetchTask: async (taskId: string) => {
    try {
      set({ loading: true, error: null });

      if (
        get().tasks.length > 0 &&
        get().tasks.some((task) => task.id === taskId)
      ) {
        set({
          task: get().tasks.find((task) => task.id === taskId) || null,
          loading: false,
        });
        return get().tasks.find((task) => task.id === taskId) || null;
      }

      const docRef = doc(db, "tasks", taskId);
      const querySnapshot = await getDoc(docRef);
      const task = querySnapshot.data() as Task;
      set({ task: task, loading: false });
      return task || null;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      return null;
    }
  },

  fetchUserTasks: async (user: { id: string; name: string; email: string }) => {
    try {
      set({ loading: true, error: null });

      const q = query(
        collection(db, "tasks"),
        where("assignedTo", "array-contains", {
          id: user.id,
          name: user.name,
          email: user.email,
        })
      );
      const querySnapshot = await getDocs(q);

      const userTasks = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Task)
      );

      set({ tasks: userTasks, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchAllTasksWithChildren: async (
    projectId: string,
    taskId?: string,
    forceFetch = false
  ) => {
    try {

      if (!forceFetch) {
        if (
          get().tasks.length > 0 &&
          get().tasks.some((task) => task.projectId === projectId)
        ) {
          if (taskId) {
            const task = get().searchTaskFromTree(taskId, get().tasks);
            if (task) {
              set({ task, loading: false });
            }
          }
          return get().tasks;
        }
      }

      set({ loading: true, error: null });
      const querySnapshot = await getDocs(
        query(collection(db, "tasks"), where("projectId", "==", projectId))
      );

      const tasks = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Task)
      );

      const hierarchicalTasks = get().convertNodesToTree(tasks);

      if (taskId) {
        set({
          task: get().searchTaskFromTree(taskId, hierarchicalTasks) || null,
          loading: false,
        });
      }

      set({ tasks: hierarchicalTasks, taskNodes: tasks });
      return hierarchicalTasks;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      return [];
    }
  },

  fetchSiblingTasks: async (
    parentId: string,
    taskId: string,
    projectId: string
  ) => {
    let taskN: Task[] = [];
    if (parentId) {
      taskN = get().taskNodes.filter((task) => task.parentId === parentId);
    } else {
      taskN = get().taskNodes.filter(
        (task) =>
          (task.parentId === null ||
            task.parentId === undefined ||
            task.parentId === "") &&
          task.projectId === projectId
      );
    }

    if (taskN) {
      return taskN;
    }
    return [];
  },

  addTask: async (task) => {
    try {
      set({ loading: true, error: null });
      const docRef = await addDoc(collection(db, "tasks"), {
        name: task.name,
        description: task.description,
        projectId: task.projectId,
        parentId: task.parentId,
        assignedTo: task.assignedTo,
        deadline: task.deadline,
        completed: task.completed,
        percentage: task.percentage,
        hours: task.hours,
        costPerHour: task.costPerHour,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      });

      set({
        taskNodes: [
          ...get().taskNodes,
          {
            id: docRef.id,
            name: task.name,
            description: task.description,
            projectId: task.projectId,
            parentId: task.parentId,
            assignedTo: task.assignedTo,
            deadline: task.deadline,
            completed: task.completed,
            percentage: task.percentage,
            hours: task.hours,
            costPerHour: task.costPerHour,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
          },
        ],
      });
      set({ tasks: get().convertNodesToTree(get().taskNodes) });
      set({
        task: get().searchTaskFromTree(task.parentId as string, get().tasks),
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  updateTask: async (
    id: string,
    updates: Omit<Partial<Task>, "children"> & { id?: string },
    isParent?: boolean
  ) => {
    try {
      set({ loading: true, error: null });
      const taskRef = doc(db, "tasks", id);
      const { id: _, ...updatesWithoutId } = updates;
      await updateDoc(taskRef, updatesWithoutId);
      set({
        taskNodes: get().taskNodes.map((task) =>
          task.id === id ? { ...task, ...updates } : task
        ),
      });
      set({ tasks: get().convertNodesToTree(get().taskNodes) });

      if (isParent) {
        set({
          task: get().searchTaskFromTree(
            updates.parentId as string,
            get().tasks
          ),
        });
      } else {
        set({ task: get().searchTaskFromTree(id, get().tasks) });
      }
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  deleteTask: async (id) => {
    try {
      set({ loading: true, error: null });
      const taskRef = doc(db, "tasks", id);
      await deleteDoc(taskRef);
      set({ taskNodes: get().taskNodes.filter((task) => task.id !== id) });
      set({ tasks: get().convertNodesToTree(get().taskNodes) });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  checkActiveTime: async (taskId: string) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (task && task.timeEntries) {
      const activeTime = task.timeEntries.reduce(
        (total, entry) => total + entry.duration,
        0
      );
      return activeTime;
    }
    return null;
  },

  getTaskTimeEntries: async (taskId: string) => {
    const task = get().tasks.find((t) => t.id === taskId);
    return task ? task.timeEntries || [] : null;
  },

  startTimer: async (taskId: string, user: { id: string; name: string }) => {
    const task = get().tasks.find((t) => t.id === taskId);
    const startTime = new Date().toISOString();

    if (task) {
      const newTimeEntry: TimeEntry = {
        id: `${taskId}-${Date.now()}`,
        userId: user.id,
        userName: user.name,
        startTime,
        duration: 0,
      };

      const updatedTimeEntries = task.timeEntries || [];
      const existingEntry = updatedTimeEntries.find(
        (entry) => entry.userId === newTimeEntry.userId
      );

      if (existingEntry) {
        existingEntry.startTime = startTime;
      } else {
        updatedTimeEntries.push(newTimeEntry);
      }

      await get().updateTask(taskId, { timeEntries: updatedTimeEntries });
    }
  },

  stopTimer: async (taskId: string, user: { id: string; name: string }) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (task && task.timeEntries) {
      const existingEntry = task.timeEntries.find(
        (entry) => entry.userId === user.id
      );
      if (existingEntry) {
        const endTime = new Date().toISOString();
        const duration = Math.floor(
          (new Date(endTime).getTime() -
            new Date(existingEntry.startTime).getTime()) /
            60000
        ); // duration in minutes

        existingEntry.duration += duration;
        existingEntry.startTime = endTime;
      }

      await get().updateTask(taskId, { timeEntries: task.timeEntries });
    }
  },

  searchTaskFromTree: (taskId: string, tasks: Task[]): Task | null => {
    const findTask = (taskList: Task[]): Task | null => {
      for (const task of taskList) {
        if (task.id === taskId) {
          return task;
        }
        if (task.children) {
          const found = findTask(task.children);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };
    return findTask(tasks);
  },

  convertNodesToTree: (nodes: Task[]): Task[] => {
    const taskMap = new Map<string, Task & { children: Task[] }>();
    nodes.forEach((node) => {
      taskMap.set(node.id, { ...node, children: [] });
    });

    const tree: Task[] = [];
    taskMap.forEach((task) => {
      if (task.parentId) {
        const parent = taskMap.get(task.parentId);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(task);
        }
      } else {
        tree.push(task);
      }
    });

    set({ tasks: JSON.parse(JSON.stringify(tree)) });
    return JSON.parse(JSON.stringify(tree));
  },

  getTaskPath: async (taskId: string, projectId: string) => {
    const projectTasks = await get().fetchAllTasksWithChildren(projectId , undefined , true);
    const task = get().searchTaskFromTree(taskId, projectTasks);
    const path: string[] = [];

    const buildPath = (currentTask: Task | null) => {
      if (currentTask) {
        path.unshift(currentTask.id);
        buildPath(
          get().searchTaskFromTree(currentTask.parentId as string, projectTasks)
        );
      }
    };

    buildPath(task);
    return `${path.join("/")}`;
  },
}));
