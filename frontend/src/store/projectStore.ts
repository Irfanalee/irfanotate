import { create } from 'zustand';
import type { Project, SchemaLabel, CreateProjectRequest } from '../types';
import {
  fetchProjects as apiFetchProjects,
  createProject as apiCreateProject,
  deleteProject as apiDeleteProject,
} from '../api/projects';

interface ProjectStore {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;

  // Derived: labels from current project schema
  labels: SchemaLabel[];

  fetchProjects: () => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  loadProject: (project: Project) => void;
  createProject: (data: CreateProjectRequest) => Promise<Project>;
  removeProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,
  labels: [],

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await apiFetchProjects();
      set({ projects, isLoading: false });
    } catch (e) {
      set({ error: 'Failed to load projects', isLoading: false });
    }
  },

  setCurrentProject: (project) => {
    const labels = project?.schema?.labels ?? [];
    set({ currentProject: project, labels });
  },

  loadProject: (project) => {
    const labels = project?.schema?.labels ?? [];
    set({ currentProject: project, labels });
  },

  createProject: async (data) => {
    const project = await apiCreateProject(data);
    set((state) => ({ projects: [project, ...state.projects] }));
    return project;
  },

  removeProject: async (id) => {
    await apiDeleteProject(id);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    }));
  },
}));
