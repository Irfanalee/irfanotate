import { fetchJSON } from './client';
import type { AnnotationDocument } from '../types';

export async function fetchAnnotation(filename: string): Promise<AnnotationDocument> {
  return fetchJSON<AnnotationDocument>(`/api/annotations/${encodeURIComponent(filename)}`);
}

export async function saveAnnotation(
  filename: string,
  payload: Omit<AnnotationDocument, 'version'>
): Promise<AnnotationDocument> {
  return fetchJSON<AnnotationDocument>(`/api/annotations/${encodeURIComponent(filename)}`, {
    method: 'POST',
    body: JSON.stringify({ ...payload, version: '2.0' }),
  });
}

export async function deleteAnnotation(filename: string): Promise<void> {
  await fetchJSON<unknown>(`/api/annotations/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
}
