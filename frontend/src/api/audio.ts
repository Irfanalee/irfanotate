import { fetchJSON } from './client';

export interface AudioFile {
  filename: string;
  duration_ms: number;
  is_annotated: boolean;
  project_id: string | null;
}

export interface MediaUploadResponse {
  uploaded: string[];
  failed: { filename: string; error: string }[];
  total_uploaded: number;
  total_failed: number;
}

export async function fetchAudioFiles(projectId?: string): Promise<AudioFile[]> {
  const params = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
  return fetchJSON<AudioFile[]>(`/audio/${params}`);
}

export async function uploadAudioFiles(
  files: FileList | File[],
  projectId?: string,
): Promise<MediaUploadResponse> {
  const formData = new FormData();
  for (const file of Array.from(files)) {
    formData.append('files', file);
  }
  const params = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
  const response = await fetch(`/api/audio/upload${params}`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Upload failed: ${response.status}`);
  }
  return response.json();
}

export function getAudioUrl(filename: string): string {
  return `/api/audio/${encodeURIComponent(filename)}`;
}

export async function deleteAudioFile(filename: string): Promise<void> {
  await fetchJSON<unknown>(`/audio/${encodeURIComponent(filename)}`, { method: 'DELETE' });
}
