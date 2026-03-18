import { fetchJSON } from './client';
import type { Project, CreateProjectRequest } from '../types';

export async function fetchProjects(): Promise<Project[]> {
  return fetchJSON<Project[]>('/projects/');
}

export async function fetchProject(id: string): Promise<Project> {
  return fetchJSON<Project>(`/projects/${id}`);
}

export async function createProject(data: CreateProjectRequest): Promise<Project> {
  return fetchJSON<Project>('/projects/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProject(
  id: string,
  data: Partial<CreateProjectRequest>
): Promise<Project> {
  return fetchJSON<Project>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string): Promise<void> {
  await fetchJSON<unknown>(`/projects/${id}`, { method: 'DELETE' });
}

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  data_type: string;
  annotation_type: string;
  label_count: number;
}

export interface Template extends TemplateMeta {
  schema: { labels: Array<{ name: string; color: string; attributes: unknown[] }> };
}

export async function fetchTemplates(): Promise<TemplateMeta[]> {
  return fetchJSON<TemplateMeta[]>('/templates/');
}

export async function fetchTemplate(id: string): Promise<Template> {
  return fetchJSON<Template>(`/templates/${id}`);
}
