import { create } from 'zustand';
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

interface Todo {
  id: string;
  userId: string;
  title: string;
  description: string;
  endDate: string;
  leadTime?: number;
  leadTimeUnit?: 'days' | 'weeks' | 'months';
  projectId?: string | null;
  taskId?: string | null;
  projectNumber?: string | null;
  projectName?: string | null;
  taskName?: string | null;
  createdAt: string;
  completed: boolean;
}

interface TodoState {
  todos: Todo[];
  taskTodos: Todo[];
  loading: boolean;
  error: string | null;
  cache: {
    [userId: string]: Todo[]; // Cache for user-specific todos
  };
  addTodo: (title: string, description: string, endDate: string, leadTime?: number, leadTimeUnit?: 'days' | 'weeks' | 'months', projectId?: string | null, taskId?: string | null, projectNumber?: string | null, projectName?: string | null, taskName?: string | null) => Promise<void>;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  fetchUserTodos: () => Promise<void>;
  fetchTaskTodos: (taskId: string) => Promise<void>;
  toggleTodoComplete: (id: string) => Promise<void>;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  taskTodos: [],
  loading: false,
  error: null,
  cache: {}, // Initialize cache

  // Add a new todo
  addTodo: async (title: string, description: string, endDate: string, leadTime?: number, leadTimeUnit?: 'days' | 'weeks' | 'months', projectId?: string | null, taskId?: string | null, projectNumber?: string | null, projectName?: string | null, taskName?: string | null) => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const todoRef = collection(db, 'todos');
      // Firestore rejects documents containing `undefined` field values,
      // so optional fields must be omitted entirely when not provided
      const newTodo: Omit<Todo, 'id'> = {
        userId: currentUser.uid,
        title,
        description,
        endDate,
        ...(leadTime !== undefined ? { leadTime } : {}),
        ...(leadTimeUnit !== undefined ? { leadTimeUnit } : {}),
        projectId: projectId || null,
        taskId: taskId || null,
        projectNumber: projectNumber || null,
        projectName: projectName || null,
        taskName: taskName || null,
        createdAt: new Date().toISOString(),
        completed: false,
      };

      const docRef = await addDoc(todoRef, newTodo);
      const todoWithId = { ...newTodo, id: docRef.id };

      // Update cache and state
      set((state) => ({
        todos: [...state.todos, todoWithId],
        taskTodos: taskId ? [...state.taskTodos, todoWithId] : state.taskTodos,
        cache: {
          ...state.cache,
          [currentUser.uid]: [...(state.cache[currentUser.uid] || []), todoWithId],
        },
      }));
    } catch (error) {
      console.error('Error adding todo:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Update an existing todo
  updateTodo: async (id: string, updates: Partial<Todo>) => {
    try {
      set({ loading: true, error: null });
      const todoRef = doc(db, 'todos', id);
      await updateDoc(todoRef, updates);

      // Update cache and state
      set((state) => ({
        todos: state.todos.map((todo) =>
          todo.id === id ? { ...todo, ...updates } : todo
        ),
        taskTodos: state.taskTodos.map((todo) =>
          todo.id === id ? { ...todo, ...updates } : todo
        ),
        cache: {
          ...state.cache,
          [auth.currentUser?.uid || '']: state.cache[auth.currentUser?.uid || '']?.map((todo) =>
            todo.id === id ? { ...todo, ...updates } : todo
          ),
        },
      }));
    } catch (error) {
      console.error('Error updating todo:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Delete a todo
  deleteTodo: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const todoRef = doc(db, 'todos', id);
      await deleteDoc(todoRef);

      // Update cache and state
      set((state) => ({
        todos: state.todos.filter((todo) => todo.id !== id),
        taskTodos: state.taskTodos.filter((todo) => todo.id !== id),
        cache: {
          ...state.cache,
          [auth.currentUser?.uid || '']: state.cache[auth.currentUser?.uid || '']?.filter(
            (todo) => todo.id !== id
          ),
        },
      }));
    } catch (error) {
      console.error('Error deleting todo:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Fetch todos for the current user

  fetchUserTodos: async () => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Check if todos are already cached for this user
      const cachedTodos = get().cache[currentUser.uid];
      if (cachedTodos) {
        set({ todos: cachedTodos, loading: false });
        return;
      }

      // Log Firestore fetch
      console.log("Fetching todos from Firestore for user:", currentUser.uid);

      const todosRef = collection(db, 'todos');
      const q = query(todosRef, where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);

      const todos = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Todo[];

      // Update cache and state
      set({
        todos,
        cache: { ...get().cache, [currentUser.uid]: todos },
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching todos:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  // Fetch todos for a specific task
  fetchTaskTodos: async (taskId: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const todosRef = collection(db, 'todos');
      const q = query(
        todosRef,
        where('taskId', '==', taskId),
        where('userId', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);

      const taskTodos = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Todo[];

      set({ taskTodos });
    } catch (error) {
      console.error('Error fetching task todos:', error);
      // We might not want to set global error here to avoid blocking UI
    }
  },

  // Toggle todo completion status
  toggleTodoComplete: async (id: string) => {
    const todo = get().todos.find((t) => t.id === id) || get().taskTodos.find((t) => t.id === id);
    if (todo) {
      await get().updateTodo(id, { completed: !todo.completed });
    }
  },
}));