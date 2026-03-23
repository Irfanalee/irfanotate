// 'draw' kept as a transition alias for backward compatibility
export type ToolMode = 'select' | 'draw' | 'bbox' | 'polygon' | 'text_span' | 'temporal' | 'video_bbox';

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

export interface TemporalSegmentGeometry {
  type: 'temporal_segment';
  start_ms: number;
  end_ms: number;
}

export interface VideoFrameBoxGeometry {
  type: 'video_frame_box';
  coordinates: [number, number, number, number]; // [x1, y1, x2, y2] normalized 0–1
  frame_time_ms: number;
}

export type Geometry =
  | BboxGeometry | PolygonGeometry | ClassificationGeometry
  | TextSpanGeometry | TemporalSegmentGeometry | VideoFrameBoxGeometry;

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
