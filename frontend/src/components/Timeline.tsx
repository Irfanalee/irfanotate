import React, { useRef, useEffect, useCallback } from 'react';
import type { Annotation, TemporalSegmentGeometry } from '../types';

interface TimelineProps {
  durationMs: number;
  currentMs: number;
  annotations: Annotation[];
  selectedIds: Set<string>;
  getLabelColor: (label: string) => string;
  onSeek: (ms: number) => void;
  onSegmentCreate: (startMs: number, endMs: number) => void;
  onSegmentSelect: (id: string) => void;
  height?: number;
}

export const Timeline: React.FC<TimelineProps> = ({
  durationMs,
  currentMs,
  annotations,
  selectedIds,
  getLabelColor,
  onSeek,
  onSegmentCreate,
  onSegmentSelect,
  height = 48,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ startX: number; startMs: number } | null>(null);
  const ghostRef = useRef<{ x1: number; x2: number } | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const dur = durationMs || 1;

    // Background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, W, H);

    // Tick marks every 1 second
    const pxPerMs = W / dur;
    const tickIntervalMs = Math.max(1000, Math.ceil(dur / (W / 60)) * 1000);
    ctx.fillStyle = '#475569';
    ctx.font = '9px monospace';
    ctx.fillStyle = '#94a3b8';
    for (let ms = 0; ms <= dur; ms += tickIntervalMs) {
      const x = ms * pxPerMs;
      ctx.fillStyle = '#475569';
      ctx.fillRect(x, 0, 1, H * 0.4);
      const s = Math.floor(ms / 1000);
      const label = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(label, x + 2, H - 3);
    }

    // Temporal segment annotations
    for (const ann of annotations) {
      if (ann.geometry.type !== 'temporal_segment') continue;
      const geom = ann.geometry as TemporalSegmentGeometry;
      const x1 = (geom.start_ms / dur) * W;
      const x2 = (geom.end_ms / dur) * W;
      const color = getLabelColor(ann.label);
      const isSelected = selectedIds.has(ann.id);

      ctx.fillStyle = color + '55';
      ctx.fillRect(x1, 0, x2 - x1, H);

      if (isSelected) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, 0, x2 - x1, H);
      } else {
        ctx.strokeStyle = color + 'aa';
        ctx.lineWidth = 1;
        ctx.strokeRect(x1, 0, x2 - x1, H);
      }

      // Label text
      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      const labelText = ann.label;
      const maxW = x2 - x1 - 4;
      if (maxW > 20) {
        ctx.save();
        ctx.rect(x1, 0, x2 - x1, H);
        ctx.clip();
        ctx.fillText(labelText, x1 + 3, H / 2 + 4);
        ctx.restore();
      }
    }

    // Ghost rect while dragging
    if (ghostRef.current) {
      const { x1, x2 } = ghostRef.current;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(Math.min(x1, x2), 0, Math.abs(x2 - x1), H);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.min(x1, x2), 0, Math.abs(x2 - x1), H);
    }

    // Playhead
    const playheadX = (currentMs / dur) * W;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(playheadX - 1, 0, 2, H);
  }, [durationMs, currentMs, annotations, selectedIds, getLabelColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = height;
      draw();
    });
    observer.observe(canvas);
    canvas.width = canvas.offsetWidth;
    canvas.height = height;
    draw();
    return () => observer.disconnect();
  }, [draw, height]);

  useEffect(() => {
    draw();
  }, [draw]);

  const xToMs = (x: number): number => {
    const canvas = canvasRef.current;
    if (!canvas || !durationMs) return 0;
    return Math.max(0, Math.min(durationMs, (x / canvas.width) * durationMs));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    dragRef.current = { startX: x, startMs: xToMs(x) };
    ghostRef.current = { x1: x, x2: x };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    ghostRef.current = { x1: dragRef.current.startX, x2: x };
    draw();
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const dx = Math.abs(x - dragRef.current.startX);

    ghostRef.current = null;

    if (dx > 3) {
      const endMs = xToMs(x);
      const startMs = dragRef.current.startMs;
      const [lo, hi] = startMs < endMs ? [startMs, endMs] : [endMs, startMs];
      onSegmentCreate(lo, hi);
    } else {
      // Click — check if clicking existing segment first
      const clickMs = xToMs(x);
      let hit = false;
      for (const ann of annotations) {
        if (ann.geometry.type !== 'temporal_segment') continue;
        const geom = ann.geometry as TemporalSegmentGeometry;
        if (clickMs >= geom.start_ms && clickMs <= geom.end_ms) {
          onSegmentSelect(ann.id);
          hit = true;
          break;
        }
      }
      if (!hit) onSeek(clickMs);
    }

    dragRef.current = null;
    draw();
  };

  const handleMouseLeave = () => {
    if (dragRef.current) {
      dragRef.current = null;
      ghostRef.current = null;
      draw();
    }
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height, display: 'block', cursor: 'crosshair' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  );
};
