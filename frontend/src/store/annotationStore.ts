import { create } from 'zustand';
import type { Annotation, Geometry, AnnotationDocument } from '../types';

interface AnnotationStore {
  annotations: Annotation[];
  selectedIds: Set<string>;
  isDirty: boolean;
  isSaving: boolean;
  currentDocumentId: string | null;
  projectId: string | null;
  sourcePath: string | null;

  loadDocument: (doc: AnnotationDocument) => void;
  clearAll: () => void;
  addAnnotation: (label: string, geometry: Geometry) => Annotation;
  updateAnnotationLabel: (id: string, label: string) => void;
  updateAnnotationGeometry: (id: string, geometry: Geometry) => void;
  updateAnnotationAttributes: (id: string, attributes: Record<string, unknown>) => void;
  deleteAnnotation: (id: string) => void;
  selectAnnotation: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  buildSavePayload: () => Omit<AnnotationDocument, 'version'>;
  setSaving: (saving: boolean) => void;
  markClean: () => void;
}

export const useAnnotationStore = create<AnnotationStore>((set, get) => ({
  annotations: [],
  selectedIds: new Set(),
  isDirty: false,
  isSaving: false,
  currentDocumentId: null,
  projectId: null,
  sourcePath: null,

  loadDocument: (doc) => {
    set({
      annotations: doc.annotations,
      selectedIds: new Set(),
      isDirty: false,
      isSaving: false,
      currentDocumentId: doc.document_id,
      projectId: doc.project_id ?? null,
      sourcePath: doc.source_path,
    });
  },

  clearAll: () => {
    set({
      annotations: [],
      selectedIds: new Set(),
      isDirty: false,
      isSaving: false,
      currentDocumentId: null,
      projectId: null,
      sourcePath: null,
    });
  },

  addAnnotation: (label, geometry) => {
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      label,
      geometry,
      attributes: {},
      created_at: new Date().toISOString(),
    };
    set((state) => ({
      annotations: [...state.annotations, annotation],
      isDirty: true,
    }));
    return annotation;
  },

  updateAnnotationLabel: (id, label) => {
    set((state) => ({
      annotations: state.annotations.map((a) => (a.id === id ? { ...a, label } : a)),
      isDirty: true,
    }));
  },

  updateAnnotationGeometry: (id, geometry) => {
    set((state) => ({
      annotations: state.annotations.map((a) => (a.id === id ? { ...a, geometry } : a)),
      isDirty: true,
    }));
  },

  updateAnnotationAttributes: (id, attributes) => {
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === id ? { ...a, attributes: { ...a.attributes, ...attributes } } : a
      ),
      isDirty: true,
    }));
  },

  deleteAnnotation: (id) => {
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
      selectedIds: new Set([...state.selectedIds].filter((sid) => sid !== id)),
      isDirty: true,
    }));
  },

  selectAnnotation: (id, multi = false) => {
    set((state) => {
      if (multi) {
        const next = new Set(state.selectedIds);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return { selectedIds: next };
      }
      return { selectedIds: new Set([id]) };
    });
  },

  clearSelection: () => {
    set({ selectedIds: new Set() });
  },

  buildSavePayload: () => {
    const { annotations, currentDocumentId, projectId, sourcePath } = get();
    return {
      document_id: currentDocumentId ?? '',
      source_path: sourcePath ?? '',
      project_id: projectId ?? undefined,
      annotations,
      relations: [],
      metadata: {},
    };
  },

  setSaving: (isSaving) => set({ isSaving }),
  markClean: () => set({ isDirty: false }),
}));
