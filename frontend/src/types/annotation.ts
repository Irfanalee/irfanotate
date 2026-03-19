// 'draw' kept as a transition alias for backward compatibility
export type ToolMode = 'select' | 'draw' | 'bbox' | 'polygon' | 'text_span';

export interface BboxGeometry {
  type: 'bbox';
  coordinates: [number, number, number, number]; // [x1, y1, x2, y2]
}

export interface PolygonGeometry {
  type: 'polygon';
  coordinates: [number, number][]; // [[x, y], ...]
}

export interface ClassificationGeometry {
  type: 'classification';
  coordinates: [];
}

export interface TextSpanGeometry {
  type: 'text_span';
  start: number;
  end: number;
  text: string;
}

export type Geometry = BboxGeometry | PolygonGeometry | ClassificationGeometry | TextSpanGeometry;

export interface Annotation {
  id: string;
  label: string;
  geometry: Geometry;
  attributes: Record<string, unknown>;
  created_at?: string;
}

export interface AnnotationRelation {
  id: string;
  type: string;
  from_id: string;
  to_id: string;
}

export interface AnnotationDocument {
  version: '2.0';
  document_id: string;
  source_path: string;
  project_id?: string;
  annotations: Annotation[];
  relations: AnnotationRelation[];
  metadata: Record<string, unknown>;
}
