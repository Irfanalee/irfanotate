import React, { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { useAudioStore } from '../store/audioStore';
import { useAnnotationStore } from '../store/annotationStore';
import { useProjectStore } from '../store/projectStore';
import { getAudioUrl } from '../api/audio';
import { fetchAnnotation, saveAnnotation } from '../api/annotations';
import { Timeline } from './Timeline';
import { formatMs, formatDurationMs } from '../utils/time';
import type { TemporalSegmentGeometry } from '../types';

interface LabelPickerState {
  startMs: number;
  endMs: number;
}

export const AudioAnnotator: React.FC = () => {
  const { getCurrentFile, setIsAnnotated } = useAudioStore();
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

  const waveformRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [currentMs, setCurrentMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [labelPicker, setLabelPicker] = useState<LabelPickerState | null>(null);

  const currentFile = getCurrentFile();
  const currentFilename = currentFile?.filename ?? null;

  const getLabelColor = useCallback(
    (labelName: string): string => {
      const found = labels.find((l) => l.name === labelName);
      return found?.color ?? '#6B7280';
    },
    [labels]
  );

  // Init WaveSurfer
  useEffect(() => {
    if (!waveformRef.current) return;
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#60A5FA',
      progressColor: '#2563EB',
      cursorColor: '#EF4444',
      barWidth: 2,
      barGap: 1,
      height: 80,
      normalize: true,
      interact: false,
    });
    wsRef.current = ws;
    ws.on('ready', () => setDurationMs(Math.round(ws.getDuration() * 1000)));
    ws.on('timeupdate', (t: number) => setCurrentMs(Math.round(t * 1000)));
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));
    return () => { ws.destroy(); wsRef.current = null; };
  }, []);

  // Load audio and annotations when file changes
  useEffect(() => {
    if (!currentFilename) {
      clearAll();
      wsRef.current?.empty();
      setDurationMs(0);
      setCurrentMs(0);
      return;
    }

    let cancelled = false;
    clearAll();
    setLabelPicker(null);
    setCurrentMs(0);
    setIsPlaying(false);

    wsRef.current?.load(getAudioUrl(currentFilename));

    fetchAnnotation(currentFilename)
      .then((doc) => { if (!cancelled) loadDocument(doc); })
      .catch(() => { if (!cancelled) clearAll(); });

    return () => { cancelled = true; };
  }, [currentFilename]);

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
        wsRef.current?.playPause();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        const el = document.activeElement;
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        [...selectedIds].forEach((id) => deleteAnnotation(id));
      }
      if (e.key === 'Escape') setLabelPicker(null);
      if (e.key === 'ArrowRight') wsRef.current?.skip(5);
      if (e.key === 'ArrowLeft') wsRef.current?.skip(-5);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, selectedIds, deleteAnnotation]);

  const handleSeek = useCallback((ms: number) => {
    if (!wsRef.current || !durationMs) return;
    wsRef.current.seekTo(ms / durationMs);
  }, [durationMs]);

  const handleSegmentCreate = useCallback((startMs: number, endMs: number) => {
    setLabelPicker({ startMs, endMs });
  }, []);

  const handleLabelPick = useCallback((labelName: string) => {
    if (!labelPicker) return;
    const geometry: TemporalSegmentGeometry = {
      type: 'temporal_segment',
      start_ms: labelPicker.startMs,
      end_ms: labelPicker.endMs,
    };
    addAnnotation(labelName, geometry);
    setLabelPicker(null);
  }, [labelPicker, addAnnotation]);

  if (!currentFile) {
    return (
      <div className="flex-1 flex items-center justify-center text-th-text-secondary text-sm">
        Select an audio file from the sidebar to begin annotating
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-th-bg-page">
      {/* Label bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-th-border bg-th-bg-toolbar flex-wrap">
        <span className="text-xs text-th-text-secondary font-medium">Labels:</span>
        {labels.map((label) => (
          <button
            key={label.name}
            className="px-2 py-0.5 rounded text-xs font-medium text-white"
            style={{ backgroundColor: label.color }}
            title={label.name}
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

      {/* Waveform */}
      <div className="px-4 pt-3 pb-1 bg-th-bg-card border-b border-th-border">
        <div ref={waveformRef} className="w-full" />
      </div>

      {/* Timeline */}
      <div className="px-4 py-1 bg-th-bg-card border-b border-th-border">
        <Timeline
          durationMs={durationMs}
          currentMs={currentMs}
          annotations={annotations}
          selectedIds={selectedIds}
          getLabelColor={getLabelColor}
          onSeek={handleSeek}
          onSegmentCreate={handleSegmentCreate}
          onSegmentSelect={selectAnnotation}
          height={48}
        />
      </div>

      {/* Transport controls */}
      <div className="flex items-center gap-4 px-4 py-2 bg-th-bg-card text-th-text-primary">
        <button
          onClick={() => wsRef.current?.skip(-5)}
          className="px-2 py-1 text-xs bg-th-bg-toolbar rounded hover:bg-th-bg-hover"
          title="Back 5s"
        >
          ←5s
        </button>
        <button
          onClick={() => wsRef.current?.playPause()}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={() => wsRef.current?.skip(5)}
          className="px-2 py-1 text-xs bg-th-bg-toolbar rounded hover:bg-th-bg-hover"
          title="Forward 5s"
        >
          5s→
        </button>
        <span className="text-sm font-mono text-th-text-secondary ml-2">
          {formatMs(currentMs)} / {formatDurationMs(durationMs)}
        </span>
        <span className="ml-auto text-xs text-th-text-secondary">
          Drag timeline to create segment · Space: play/pause · Del: delete selected
        </span>
      </div>

      {/* Label picker */}
      {labelPicker && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-th-bg-card border border-th-border rounded-lg shadow-xl p-4 min-w-[200px]">
            <div className="text-xs text-th-text-secondary mb-2">
              {formatMs(labelPicker.startMs)} – {formatMs(labelPicker.endMs)}
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
