import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTextStore } from '../store/textStore';
import { useAnnotationStore } from '../store/annotationStore';
import { useProjectStore } from '../store/projectStore';
import { fetchTextContent } from '../api/text';
import { fetchAnnotation, saveAnnotation } from '../api/annotations';
import type { Annotation, TextSpanGeometry } from '../types';

interface Segment {
  text: string;
  annotation: Annotation | null;
  start: number;
}

interface LabelPickerState {
  x: number;
  y: number;
  start: number;
  end: number;
  selectedText: string;
}

function buildSegments(text: string, annotations: Annotation[]): Segment[] {
  const spans = annotations
    .filter((a) => a.geometry.type === 'text_span')
    .map((a) => ({ annotation: a, start: (a.geometry as TextSpanGeometry).start, end: (a.geometry as TextSpanGeometry).end }))
    .sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let pos = 0;

  for (const span of spans) {
    if (span.start > pos) {
      segments.push({ text: text.slice(pos, span.start), annotation: null, start: pos });
    }
    if (span.end > span.start) {
      segments.push({ text: text.slice(span.start, span.end), annotation: span.annotation, start: span.start });
    }
    pos = Math.max(pos, span.end);
  }

  if (pos < text.length) {
    segments.push({ text: text.slice(pos), annotation: null, start: pos });
  }

  return segments;
}

export const TextAnnotator: React.FC = () => {
  const { getCurrentDoc, setIsAnnotated } = useTextStore();
  const {
    annotations,
    addAnnotation,
    deleteAnnotation,
    selectAnnotation,
    clearSelection,
    selectedIds,
    loadDocument,
    clearAll,
    buildSavePayload,
    setSaving,
    markClean,
    isDirty,
  } = useAnnotationStore();
  const { labels } = useProjectStore();

  const [textContent, setTextContent] = useState<string>('');
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [labelPicker, setLabelPicker] = useState<LabelPickerState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentDoc = getCurrentDoc();
  const currentFilename = currentDoc?.filename ?? null;

  // Load text content and annotations when document changes
  useEffect(() => {
    if (!currentFilename) {
      setTextContent('');
      clearAll();
      return;
    }

    let cancelled = false;
    setIsLoadingText(true);
    setLabelPicker(null);

    const load = async () => {
      try {
        const [content] = await Promise.all([
          fetchTextContent(currentFilename),
        ]);
        if (cancelled) return;
        setTextContent(content);

        try {
          const doc = await fetchAnnotation(currentFilename);
          if (!cancelled) loadDocument(doc);
        } catch {
          // No existing annotation — start fresh
          if (!cancelled) {
            clearAll();
          }
        }
      } catch (err) {
        console.error('Failed to load text document:', err);
        if (!cancelled) setTextContent('');
      } finally {
        if (!cancelled) setIsLoadingText(false);
      }
    };

    load();
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
      console.error('Failed to save annotation:', err);
    } finally {
      setSaving(false);
    }
  }, [currentFilename, isDirty, buildSavePayload, setSaving, markClean, setIsAnnotated]);

  // Ctrl+S save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        setLabelPicker(null);
        window.getSelection()?.removeAllRanges();
        clearSelection();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        const el = document.activeElement;
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        [...selectedIds].forEach((id) => deleteAnnotation(id));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, clearSelection, selectedIds, deleteAnnotation]);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) return;

    const range = selection.getRangeAt(0);
    const containerEl = containerRef.current;

    // Walk text nodes to find character offsets within the container
    let start = 0;
    let end = 0;
    let foundStart = false;
    let foundEnd = false;

    const walk = (node: Node, offset: number): number => {
      if (foundStart && foundEnd) return offset;
      if (node.nodeType === Node.TEXT_NODE) {
        const len = node.textContent?.length ?? 0;
        if (!foundStart) {
          if (node === range.startContainer) {
            start = offset + range.startOffset;
            foundStart = true;
          } else {
            offset += len;
          }
        }
        if (foundStart && !foundEnd) {
          if (node === range.endContainer) {
            end = offset + range.endOffset;
            foundEnd = true;
          } else if (node !== range.startContainer) {
            offset += len;
          }
        }
        return offset;
      }
      for (const child of Array.from(node.childNodes)) {
        offset = walk(child, offset);
        if (foundStart && foundEnd) break;
      }
      return offset;
    };

    walk(containerEl, 0);

    if (!foundStart || !foundEnd || start >= end) return;

    const selectedText = textContent.slice(start, end);
    if (!selectedText.trim()) return;

    const rect = range.getBoundingClientRect();
    setLabelPicker({
      x: rect.left + rect.width / 2,
      y: rect.bottom + window.scrollY + 4,
      start,
      end,
      selectedText,
    });
  }, [textContent]);

  const handleLabelPick = useCallback(
    (labelName: string) => {
      if (!labelPicker || !currentFilename) return;
      const geometry: TextSpanGeometry = {
        type: 'text_span',
        start: labelPicker.start,
        end: labelPicker.end,
        text: labelPicker.selectedText,
      };
      addAnnotation(labelName, geometry);
      window.getSelection()?.removeAllRanges();
      setLabelPicker(null);
    },
    [labelPicker, currentFilename, addAnnotation]
  );

  const handleSpanClick = useCallback(
    (e: React.MouseEvent, annotationId: string) => {
      e.stopPropagation();
      selectAnnotation(annotationId);
    },
    [selectAnnotation]
  );

  const getLabelColor = (labelName: string): string => {
    const label = labels.find((l) => l.name === labelName);
    return label?.color ?? '#6B7280';
  };

  if (!currentDoc) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Select a document from the sidebar to begin annotating
      </div>
    );
  }

  if (isLoadingText) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Loading...
      </div>
    );
  }

  const segments = buildSegments(textContent, annotations);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Label selector bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-gray-50 flex-wrap">
        <span className="text-xs text-gray-500 font-medium">Labels:</span>
        {labels.map((label) => (
          <button
            key={label.name}
            onClick={() => {
              const sel = window.getSelection();
              if (sel && !sel.isCollapsed && containerRef.current) {
                handleMouseUp();
              }
            }}
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

      {/* Text area */}
      <div
        className="flex-1 overflow-y-auto p-6"
        onClick={() => {
          setLabelPicker(null);
          clearSelection();
        }}
      >
        <div
          ref={containerRef}
          className="max-w-3xl mx-auto text-sm leading-relaxed text-gray-800 whitespace-pre-wrap select-text font-mono"
          onMouseUp={handleMouseUp}
        >
          {segments.map((seg, i) => {
            if (!seg.annotation) {
              return <span key={i}>{seg.text}</span>;
            }
            const color = getLabelColor(seg.annotation.label);
            const isSelected = selectedIds.has(seg.annotation.id);
            return (
              <span
                key={i}
                onClick={(e) => handleSpanClick(e, seg.annotation!.id)}
                title={seg.annotation.label}
                style={{
                  backgroundColor: color + '33',
                  borderBottom: `2px solid ${color}`,
                  outline: isSelected ? `2px solid ${color}` : undefined,
                  borderRadius: '2px',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                {seg.text}
                <sup
                  style={{ color, fontSize: '0.6em', marginLeft: '1px', userSelect: 'none' }}
                >
                  {seg.annotation.label}
                </sup>
              </span>
            );
          })}
          {textContent === '' && (
            <span className="text-gray-400 italic">Empty document</span>
          )}
        </div>
      </div>

      {/* Floating label picker */}
      {labelPicker && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex flex-wrap gap-1"
          style={{
            left: Math.min(labelPicker.x - 80, window.innerWidth - 200),
            top: labelPicker.y,
            maxWidth: 300,
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="w-full text-xs text-gray-500 mb-1 px-1">
            "{labelPicker.selectedText.slice(0, 40)}{labelPicker.selectedText.length > 40 ? '…' : ''}"
          </div>
          {labels.map((label) => (
            <button
              key={label.name}
              onClick={() => handleLabelPick(label.name)}
              className="px-2 py-1 rounded text-xs font-medium text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </button>
          ))}
          <button
            onClick={() => {
              setLabelPicker(null);
              window.getSelection()?.removeAllRanges();
            }}
            className="px-2 py-1 rounded text-xs text-gray-500 hover:text-gray-700 border border-gray-200"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
