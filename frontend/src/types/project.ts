export interface SchemaLabelAttribute {
  name: string;
  type: string;
  options?: string[];
}

export interface SchemaLabel {
  name: string;
  color: string;
  attributes: SchemaLabelAttribute[];
}

export interface ProjectSchema {
  labels: SchemaLabel[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  data_type: string;
  annotation_type: string;
  schema: ProjectSchema | null;
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  image_count: number;
  annotated_count: number;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  data_type?: string;
  annotation_type?: string;
  schema?: ProjectSchema;
  settings?: Record<string, unknown>;
}
