import { fetchJSON } from './client';

export interface VideoFile {
  filename: string;
  duration_ms: number;
  width: number;
  height: number;
  is_annotated: boolean;
  project_id: string | null;
}

export interface MediaUploadResponse {
  uploaded: string[];
  failed: { filename: string; error: string }[];
  total_uploaded: number;
  total_failed: number;
}

export async function fetchVideoFiles(projectId?: string): Promise<VideoFile[]> {
  const params = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
  return fetchJSON<VideoFile[]>(`/video/${params}`);
}

export async function uploadVideoFiles(
  files: FileList | File[],
  projectId?: string,
): Promise<MediaUploadResponse> {
  const formData = new FormData();
  for (const file of Array.from(files)) {
    formData.append('files', file);
  }
  const params = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
  const response = await fetch(`/api/video/upload${params}`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Upload failed: ${response.status}`);
  }
  return response.json();
}

export function getVideoUrl(filename: string): string {
  return `/api/video/${encodeURIComponent(filename)}`;
}

export async function deleteVideoFile(filename: string): Promise<void> {
  await fetchJSON<unknown>(`/video/${encodeURIComponent(filename)}`, { method: 'DELETE' });
}
