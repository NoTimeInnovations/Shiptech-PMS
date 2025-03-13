import { create } from "zustand";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export interface User {
  id: string;
  fullName: string;
  email: string;
}



export interface Project {
  id?: string;
  __id: string;
  projectNumber: string;
  name: string;
  description: string;
  customer: {
    id : string;
    name: string;
    phone: string;
    address: string;
  };
  createdAt: string;
  status: "completed" | "ongoing" | "not-started";
  type: "project";
  project_due_date?: string | null;
  project_start_date?: string | null;
}

interface PathItem {
  id: string;
}

interface ProjectState {
  projects: Project[];
  project: Project | null;
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
  createProject: (
    project: Omit<Project, "id" | "__id" | "createdAt" | "project_due_date">
  ) => Promise<void>;
  updateProject: (
    id: string,
    project: Omit<Project, "id" | "__id" | "createdAt" | "type">
  ) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  fetchUsers: () => Promise<User[]>;
  users: User[];
  updateProjectDueDate: (id: string, dueDate: string) => Promise<void>;
  updateProjectStartDate: (id: string, startDate: string) => Promise<void>;
  updateProjectStatus: (id: string, status: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  project: null,
  loading: false,
  error: null,
  currentPath: [],
  activeTimer: {
    taskId: null,
    projectId: null,
    startTime: null,
  },
  users: [],

  setCurrentPath: (path) => set({ currentPath: path }),

  fetchProjects: async () => {
    try {
      set({ loading: true, error: null });
      const querySnapshot = await getDocs(collection(db, "projects"));
      const projects = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as Project[];
      
      set({ projects, loading: false });
    } catch (error) {
      console.error("Error fetching projects:", error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchProject: async (id: string) => {
    try {
      set({ loading: true, error: null });

      // Fetch project
      const docRef = doc(db, "projects", id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        set({ loading: false });
        return null;
      }

      const project = { ...docSnap.data(), id: docSnap.id } as Project;

      set({
        project,
        loading: false,
      });

      return project;
    } catch (error) {
      console.error("Error fetching project:", error);
      set({ error: (error as Error).message, loading: false });
      return null;
    }
  },

  createProject: async (projectData) => {
    try {
      set({ loading: true, error: null });
      const newProject = {
        ...projectData,
        __id: `p-${projectData.projectNumber}`,
        createdAt: new Date().toISOString(),
        type: "project" as const,
        project_due_date: null,
        project_start_date: null,
        status: "not-started" as const,
      };
      const docRef = await addDoc(collection(db, "projects"), newProject);
      const projectWithId = { ...newProject, id: docRef.id };
      const projects = [...get().projects, projectWithId];
      set({ projects, loading: false });
    } catch (error) {
      console.error("Error creating project:", error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  fetchUsers: async () => {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, "users"),
          where("verified", "==", true),
          where("role", "!=", "customer")
        )
      );
      const users = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];
      set({ users });
      return users;
    } catch (error) {
      console.error("Error fetching users:", error);
      return [];
    }
  },

  updateProject: async (id, projectData) => {
    try {
      // console.log('Starting project update:', { id, projectData });
      // console.log('Customer data received:', projectData.customer);
      set({ loading: true, error: null });
      const docRef = doc(db, "projects", id);

      const currentProject = await get().fetchProject(id);
      if (!currentProject) {
        throw new Error("Project not found");
      }


      const cleanProjectData = {
        ...currentProject,
        __id: `p-${projectData.projectNumber}`,
        name: projectData.name || currentProject.name,
        description: projectData.description || currentProject.description,
        projectNumber: projectData.projectNumber || currentProject.projectNumber,
        status: projectData.status || currentProject.status,
        customer: {
          id: projectData.customer?.id || currentProject.customer?.id || "",
          name: projectData.customer?.name || currentProject.customer?.name || "",
          phone: projectData.customer?.phone || currentProject.customer?.phone || "",
          address: projectData.customer?.address || currentProject.customer?.address || "",
        },
        type: "project" as const,
        project_due_date: projectData.project_due_date || currentProject.project_due_date || null,
        project_start_date: projectData.project_start_date || currentProject.project_start_date || null,
      };

      // console.log('Cleaned project data:', cleanProjectData);
      // console.log('Customer data after cleaning:', cleanProjectData.customer);

      // Update Firestore
      await updateDoc(docRef, cleanProjectData);
      // console.log('Project document updated in Firestore');

      // Update local state
      const updatedProject = {
        ...cleanProjectData,
        id,
        __id: currentProject.__id,
        createdAt: currentProject.createdAt,
      };

      // console.log('Updating local state with:', updatedProject);
      // console.log('Final customer data:', updatedProject.customer);
      
      // Update both the current project and the projects array
      const currentProjects = get().projects;
      const updatedProjects = currentProjects.map(p => 
        p.id === id ? updatedProject : p
      );
      
      set({ 
        project: updatedProject as Project, 
        projects: updatedProjects,
        loading: false 
      });
    } catch (error) {
      console.error("Error updating project:", error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  deleteProject: async (projectId: string) => {
    try {
      set({ loading: true, error: null });
      await deleteDoc(doc(db, "projects", projectId));

      // Update local state
      const currentProjects = get().projects;
      set({
        projects: currentProjects.filter((p) => p.id !== projectId),
        loading: false,
      });
    } catch (error) {
      console.error("Error deleting project:", error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  updateProjectStatus: async (id, status) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, "projects", id);
      await updateDoc(docRef, { status });
      set((state) => ({
        project: { ...state.project, status } as Project,
        loading: false,
      }));
    } catch (error) {
      console.error("Error updating project status:", error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  updateProjectDueDate: async (id, dueDate) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, "projects", id);
      await updateDoc(docRef, { project_due_date: dueDate });
      set((state) => ({
        project: { ...state.project, project_due_date: dueDate } as Project,
        loading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  updateProjectStartDate: async (id, startDate) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, "projects", id);
      await updateDoc(docRef, { project_start_date: startDate });
      set((state) => ({
        project: { ...state.project, project_start_date: startDate } as Project,
        loading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  formatDuration: (duration: number) => {
    const minutes = Math.floor(duration);
    const seconds = Math.round((duration % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  },
}));
