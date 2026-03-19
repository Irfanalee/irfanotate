import { fetchJSON } from './client';

export interface TextDoc {
  filename: string;
  char_count: number;
  is_annotated: boolean;
  project_id: string | null;
}

export interface TextUploadResponse {
  uploaded: string[];
  failed: { filename: string; error: string }[];
  total_uploaded: number;
  total_failed: number;
}

export async function fetchTextDocs(projectId?: string): Promise<TextDoc[]> {
  const params = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
  return fetchJSON<TextDoc[]>(`/text/${params}`);
}

export async function uploadTextFiles(
  files: FileList | File[],
  projectId?: string,
): Promise<TextUploadResponse> {
  const formData = new FormData();
  const fileArray = Array.from(files);
  for (const file of fileArray) {
    formData.append('files', file);
  }

  const params = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
  const response = await fetch(`/api/text/upload${params}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Upload failed: ${response.status}`);
  }

  return response.json();
}

export async function fetchTextContent(filename: string): Promise<string> {
  const response = await fetch(`/api/text/${encodeURIComponent(filename)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch text content: ${response.status}`);
  }
  return response.text();
}

export async function deleteTextDoc(filename: string): Promise<void> {
  await fetchJSON<unknown>(`/text/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
}
