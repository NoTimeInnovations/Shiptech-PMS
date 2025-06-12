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
  increment,
  writeBatch,
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
  outsource_team_id: string;
}

interface TaskState {
  tasks: Task[];
  taskNodes: Task[];
  task: Task | null;
  addOrPencilEdit : boolean;
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
  fetchTasksByOutsourceTeam: (teamId: string) => Promise<Task[]>;
  SetaddOrPencilEdit: (check : boolean) => Promise<void>;
  clearTask: () => void;
  setTask: (task: Task | null) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  taskNodes: [],
  task: null,
  addOrPencilEdit: false,
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


  SetaddOrPencilEdit: async (check : boolean) => {
    set({ addOrPencilEdit : check })
  },

  clearTask: () => set({ task: null }),

  setTask: (task: Task | null) => set({ task }),
  fetchUserTasks: async (user: { id: string; name: string; email: string }) => {
    try {
      set({ loading: true, error: null });

      // Check if tasks are already fetched
      // if (get().tasks.length > 0) {
      //   set({ loading: false });
      //   return; // No need to fetch from Firebase
      // }

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

      console.log("userTasks", userTasks);

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
        outsource_team_id: task.outsource_team_id || "",
      });

      console.log("docRef", docRef);

      if (task.parentId === null && task.costPerHour  && task.hours) {
        const totalAmount = task.costPerHour * task.hours;
        const projectRef = doc(db, "projects", task.projectId);
        await updateDoc(projectRef, {
          total_amount: increment(totalAmount),
        });
      }

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
            outsource_team_id: task.outsource_team_id || "",
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

      const currentTask = get().tasks.find((task) => task.id === id);
      if (
        updatesWithoutId &&
        updatesWithoutId.costPerHour &&
        updatesWithoutId.hours &&
        updatesWithoutId.projectId &&
        currentTask &&
        currentTask.costPerHour &&
        currentTask.hours
      ) {
        const oldTotalAmount = currentTask.costPerHour * currentTask.hours;
        const newTotalAmount =
          updatesWithoutId.costPerHour * updatesWithoutId.hours;
        const projectRef = doc(db, "projects", updatesWithoutId.projectId);

        await updateDoc(projectRef, {
          total_amount: increment(newTotalAmount - oldTotalAmount),
        });
      }

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

      const currentTask = get().tasks.find((task) => task.id === id);
      const parentId = currentTask?.parentId;

      // Get all task IDs to delete (including children) from local state
      const getAllTaskIds = (taskId: string): string[] => {
        const ids = [taskId];
        const children = get().taskNodes.filter(
          (task) => task.parentId === taskId
        );

        for (const child of children) {
          ids.push(...getAllTaskIds(child.id));
        }

        return ids;
      };

      const taskIdsToDelete = getAllTaskIds(id);
      const tasksToDelete = get().taskNodes.filter((task) =>
        taskIdsToDelete.includes(task.id)
      );

      // Process deletions in a batch
      const batch = writeBatch(db);

      // Handle project amount reduction if deleting a root task
      const rootTask = get().taskNodes.find((task) => task.id === id);
      if (rootTask?.parentId === null || rootTask?.parentId === "") {
        const projectId = rootTask.projectId;
        const totalReduction = tasksToDelete.reduce((sum, task) => {
          return sum + (task.costPerHour || 0) * (task.hours || 0);
        }, 0);

        const projectRef = doc(db, "projects", projectId);
        batch.update(projectRef, {
          total_amount: increment(-totalReduction),
        });
      }

      // Add all task deletions to batch
      for (const taskId of taskIdsToDelete) {
        const taskRef = doc(db, "tasks", taskId);
        batch.delete(taskRef);
      }

      // Delete all settlements associated with these tasks
      const settlementsQuery = query(
        collection(db, "settlements"),
        where("task_id", "in", taskIdsToDelete)
      );
      const settlementsSnapshot = await getDocs(settlementsQuery);

      settlementsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      // Update local state
      const remainingTasks = get().taskNodes.filter(
        (task) => !taskIdsToDelete.includes(task.id)
      );
      set({
        taskNodes: remainingTasks,
        tasks: get().convertNodesToTree(remainingTasks),
        task: parentId
          ? get().searchTaskFromTree(parentId, remainingTasks)
          : null,
      });

      set({ loading: false });
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
    const projectTasks = await get().fetchAllTasksWithChildren(
      projectId,
      undefined,
      true
    );
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

  fetchTasksByOutsourceTeam: async (teamId: string) => {
    try {
      set({ loading: true, error: null });
      const q = query(
        collection(db, "tasks"),
        where("outsource_team_id", "==", teamId)
      );
      const querySnapshot = await getDocs(q);
      const tasks = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Task)
      );
      return tasks;
    } catch (error) {
      console.error("Error fetching outsourced tasks:", error);
      set({ error: (error as Error).message });
      return [];
    } finally {
      set({ loading: false });
    }
  },


}));
