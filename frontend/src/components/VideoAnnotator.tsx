import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useVideoStore } from '../store/videoStore';
import { useAnnotationStore } from '../store/annotationStore';
import { useProjectStore } from '../store/projectStore';
import { getVideoUrl } from '../api/video';
import { fetchAnnotation, saveAnnotation } from '../api/annotations';
import { AnnotationPanel } from './AnnotationPanel';
import { Timeline } from './Timeline';
import { formatMs, formatDurationMs } from '../utils/time';
import type { TemporalSegmentGeometry, VideoFrameBoxGeometry, ToolMode } from '../types';

interface LabelPickerState {
  type: 'temporal' | 'bbox';
  startMs?: number;
  endMs?: number;
  bboxCoords?: [number, number, number, number];
  frameTimeMs?: number;
}

interface DrawStart {
  x: number;
  y: number;
}

export const VideoAnnotator: React.FC = () => {
  const { getCurrentFile, setIsAnnotated } = useVideoStore();
  const {
    annotations,
    addAnnotation,
    deleteAnnotation,
    selectAnnotation,
    selectedIds,
    loadDocument,
    clearAll,
    buildSavePayload,
    setSaving,
    markClean,
    isDirty,
  } = useAnnotationStore();
  const { labels } = useProjectStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [currentMs, setCurrentMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [intrinsicW, setIntrinsicW] = useState(1280);
  const [intrinsicH, setIntrinsicH] = useState(720);
  const [toolMode, setToolMode] = useState<ToolMode>('temporal');
  const [labelPicker, setLabelPicker] = useState<LabelPickerState | null>(null);
  const drawStartRef = useRef<DrawStart | null>(null);

  const currentFile = getCurrentFile();
  const currentFilename = currentFile?.filename ?? null;

  const getLabelColor = useCallback(
    (labelName: string): string => {
      const found = labels.find((l) => l.name === labelName);
      return found?.color ?? '#6B7280';
    },
    [labels]
  );

  // Load annotations when file changes
  useEffect(() => {
    if (!currentFilename) {
      clearAll();
      setDurationMs(0);
      setCurrentMs(0);
      return;
    }
    let cancelled = false;
    clearAll();
    setLabelPicker(null);
    setCurrentMs(0);

    fetchAnnotation(currentFilename)
      .then((doc) => { if (!cancelled) loadDocument(doc); })
      .catch(() => { if (!cancelled) clearAll(); });

    return () => { cancelled = true; };
  }, [currentFilename]);

  // Draw bboxes on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const ann of annotations) {
      if (ann.geometry.type !== 'video_frame_box') continue;
      const geom = ann.geometry as VideoFrameBoxGeometry;
      if (Math.abs(geom.frame_time_ms - currentMs) > 500) continue;

      const [nx1, ny1, nx2, ny2] = geom.coordinates;
      const x1 = nx1 * canvas.width;
      const y1 = ny1 * canvas.height;
      const x2 = nx2 * canvas.width;
      const y2 = ny2 * canvas.height;
      const color = getLabelColor(ann.label);
      const isSelected = selectedIds.has(ann.id);

      ctx.strokeStyle = color;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.fillStyle = color + '33';
      ctx.fillRect(x1, y1, x2 - x1, y2 - y1);

      ctx.fillStyle = color;
      ctx.font = '12px sans-serif';
      ctx.fillText(ann.label, x1 + 2, y1 - 4 < 12 ? y1 + 14 : y1 - 4);
    }
  }, [annotations, currentMs, selectedIds, getLabelColor, intrinsicW, intrinsicH]);

  const handleSave = useCallback(async () => {
    if (!currentFilename || !isDirty) return;
    setSaving(true);
    try {
      await saveAnnotation(currentFilename, buildSavePayload());
      markClean();
      setIsAnnotated(currentFilename, true);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  }, [currentFilename, isDirty, buildSavePayload, setSaving, markClean, setIsAnnotated]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === ' ') {
        const el = document.activeElement;
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLButtonElement) return;
        e.preventDefault();
        videoRef.current?.paused ? videoRef.current.play() : videoRef.current?.pause();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        const el = document.activeElement;
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        [...selectedIds].forEach((id) => deleteAnnotation(id));
      }
      if (e.key === 'Escape') setLabelPicker(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, selectedIds, deleteAnnotation]);

  const handleSeek = useCallback((ms: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = ms / 1000;
  }, []);

  const handleSegmentCreate = useCallback((startMs: number, endMs: number) => {
    setLabelPicker({ type: 'temporal', startMs, endMs });
  }, []);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (toolMode !== 'video_bbox') return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    drawStartRef.current = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (toolMode !== 'video_bbox' || !drawStartRef.current) return;
    videoRef.current?.pause();

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x2 = (e.clientX - rect.left) / rect.width;
    const y2 = (e.clientY - rect.top) / rect.height;
    const { x: x1, y: y1 } = drawStartRef.current;
    drawStartRef.current = null;

    const coords: [number, number, number, number] = [
      Math.min(x1, x2), Math.min(y1, y2),
      Math.max(x1, x2), Math.max(y1, y2),
    ];

    if (Math.abs(coords[2] - coords[0]) < 0.005 || Math.abs(coords[3] - coords[1]) < 0.005) return;

    setLabelPicker({ type: 'bbox', bboxCoords: coords, frameTimeMs: currentMs });
  };

  const handleLabelPick = useCallback((labelName: string) => {
    if (!labelPicker) return;
    if (labelPicker.type === 'temporal') {
      const geometry: TemporalSegmentGeometry = {
        type: 'temporal_segment',
        start_ms: labelPicker.startMs!,
        end_ms: labelPicker.endMs!,
      };
      addAnnotation(labelName, geometry);
    } else {
      const geometry: VideoFrameBoxGeometry = {
        type: 'video_frame_box',
        coordinates: labelPicker.bboxCoords!,
        frame_time_ms: labelPicker.frameTimeMs!,
      };
      addAnnotation(labelName, geometry);
    }
    setLabelPicker(null);
  }, [labelPicker, addAnnotation]);

  if (!currentFile) {
    return (
      <div className="flex-1 flex items-center justify-center text-th-text-secondary text-sm">
        Select a video file from the sidebar to begin annotating
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-th-bg-page">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-th-border bg-th-bg-toolbar flex-wrap">
        <span className="text-xs text-th-text-secondary font-medium">Tool:</span>
        <button
          onClick={() => setToolMode('temporal')}
          className={`px-2 py-1 text-xs rounded ${toolMode === 'temporal' ? 'bg-blue-600 text-white' : 'bg-th-bg-card text-th-text-primary border border-th-border hover:bg-th-bg-hover'}`}
        >
          Temporal
        </button>
        <button
          onClick={() => setToolMode('video_bbox')}
          className={`px-2 py-1 text-xs rounded ${toolMode === 'video_bbox' ? 'bg-blue-600 text-white' : 'bg-th-bg-card text-th-text-primary border border-th-border hover:bg-th-bg-hover'}`}
        >
          BBox
        </button>
        <div className="h-4 w-px bg-th-border mx-1" />
        <span className="text-xs text-th-text-secondary font-medium">Labels:</span>
        {labels.map((label) => (
          <button
            key={label.name}
            className="px-2 py-0.5 rounded text-xs font-medium text-white"
            style={{ backgroundColor: label.color }}
          >
            {label.name}
          </button>
        ))}
        {isDirty && (
          <button
            onClick={handleSave}
            className="ml-auto px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
          >
            Save (Ctrl+S)
          </button>
        )}
      </div>

      {/* Main area: video + panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                src={getVideoUrl(currentFilename!)}
                className="max-w-full max-h-full"
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  setIntrinsicW(v.videoWidth);
                  setIntrinsicH(v.videoHeight);
                  setDurationMs(Math.round(v.duration * 1000));
                  if (canvasRef.current) {
                    canvasRef.current.width = v.videoWidth;
                    canvasRef.current.height = v.videoHeight;
                  }
                }}
                onTimeUpdate={(e) => setCurrentMs(Math.round(e.currentTarget.currentTime * 1000))}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                width={intrinsicW}
                height={intrinsicH}
                style={{ pointerEvents: toolMode === 'video_bbox' ? 'auto' : 'none', cursor: toolMode === 'video_bbox' ? 'crosshair' : 'default' }}
                onMouseDown={handleCanvasMouseDown}
                onMouseUp={handleCanvasMouseUp}
              />
            </div>
          </div>

          {/* Timeline */}
          <div className="px-4 py-1 bg-th-bg-card border-t border-th-border">
            <Timeline
              durationMs={durationMs}
              currentMs={currentMs}
              annotations={annotations}
              selectedIds={selectedIds}
              getLabelColor={getLabelColor}
              onSeek={handleSeek}
              onSegmentCreate={handleSegmentCreate}
              onSegmentSelect={selectAnnotation}
              height={32}
            />
          </div>

          {/* Transport */}
          <div className="flex items-center gap-4 px-4 py-2 bg-th-bg-card border-t border-th-border text-th-text-primary">
            <button
              onClick={() => videoRef.current?.paused ? videoRef.current.play() : videoRef.current?.pause()}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <span className="text-sm font-mono text-th-text-secondary">
              {formatMs(currentMs)} / {formatDurationMs(durationMs)}
            </span>
            {toolMode === 'video_bbox' && (
              <span className="text-xs text-purple-500 font-medium">
                BBox mode: drag on video to draw box
              </span>
            )}
          </div>
        </div>

        {/* Annotation panel */}
        <AnnotationPanel />
      </div>

      {/* Label picker */}
      {labelPicker && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-th-bg-card border border-th-border rounded-lg shadow-xl p-4 min-w-[200px]">
            <div className="text-xs text-th-text-secondary mb-2">
              {labelPicker.type === 'temporal'
                ? `${formatMs(labelPicker.startMs!)} – ${formatMs(labelPicker.endMs!)}`
                : `Frame @ ${formatMs(labelPicker.frameTimeMs!)}`}
            </div>
            <div className="text-sm font-medium text-th-text-primary mb-3">Assign label:</div>
            <div className="flex flex-wrap gap-2">
              {labels.map((label) => (
                <button
                  key={label.name}
                  onClick={() => handleLabelPick(label.name)}
                  className="px-3 py-1.5 rounded text-sm font-medium text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setLabelPicker(null)}
              className="mt-3 text-xs text-th-text-secondary hover:text-th-text-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
