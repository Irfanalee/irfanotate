import React, { useState, useRef, useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { useImageStore } from '../store/imageStore';
import { useInvoiceStore } from '../store/invoiceStore';
import { saveInvoiceAnnotation } from '../api/invoice';
import { exportJsonl, exportHuggingFace, getJsonlDownloadUrl, getHuggingFaceDownloadUrl } from '../api/exportDataset';
import { AutoAnnotateModal } from './AutoAnnotateModal';

export const Toolbar: React.FC = () => {
  const { tool, setTool, transform, zoomIn, zoomOut, resetZoom } = useCanvasStore();
  const { images, currentIndex, nextImage, prevImage, setIsAnnotated } = useImageStore();
  const { isDirty, setSaving, markClean, buildSavePayload } = useInvoiceStore();

  const [showAutoAnnotateModal, setShowAutoAnnotateModal] = useState(false);

  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentImage = images[currentIndex];
  const zoomPercent = Math.round(transform.scale * 100);
  const annotatedCount = images.filter((img) => img.isAnnotated).length;

  const handleSave = async () => {
    if (!currentImage || !isDirty) return;
    setSaving(true);
    try {
      await saveInvoiceAnnotation(currentImage.filename, buildSavePayload());
      markClean();
      setIsAnnotated(currentImage.filename, true);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleExportJsonl = async () => {
    setExporting('jsonl');
    setExportMsg(null);
    setExportOpen(false);
    try {
      const stats = await exportJsonl();
      setExportMsg(`JSONL ready — ${stats.total_documents} docs`);
      window.location.href = getJsonlDownloadUrl();
      setTimeout(() => setExportMsg(null), 5000);
    } catch (err: unknown) {
      setExportMsg(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
      setTimeout(() => setExportMsg(null), 5000);
    } finally {
      setExporting(null);
    }
  };

  const handleExportHuggingFace = async () => {
    setExporting('huggingface');
    setExportMsg(null);
    setExportOpen(false);
    try {
      const stats = await exportHuggingFace();
      setExportMsg(`HuggingFace ZIP ready — ${stats.total_documents} docs`);
      window.location.href = getHuggingFaceDownloadUrl();
      setTimeout(() => setExportMsg(null), 5000);
    } catch (err: unknown) {
      setExportMsg(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
      setTimeout(() => setExportMsg(null), 5000);
    } finally {
      setExporting(null);
    }
  };

  const ocrStatus = currentImage?.ocrStatus ?? 'pending';
  const ocrChip = {
    pending: { label: 'OCR: Pending', className: 'bg-gray-100 text-gray-500' },
    running: { label: 'OCR: Running…', className: 'bg-yellow-100 text-yellow-700 animate-pulse' },
    done:    { label: 'OCR: Done',    className: 'bg-green-100 text-green-700' },
    error:   { label: 'OCR: Error',   className: 'bg-red-100 text-red-600' },
  }[ocrStatus];

  const canAutoAnnotate = annotatedCount > 0;

  return (
    <div className="h-12 bg-th-bg-toolbar border-b border-th-border flex items-center px-4 gap-3">
      {/* Tool Selector */}
      <div className="flex items-center gap-0 bg-th-bg-card rounded border border-th-border">
        <button
          onClick={() => setTool('select')}
          className={`px-3 py-1.5 text-sm rounded-l ${
            tool === 'select' ? 'bg-gray-800 text-white' : 'text-th-text-primary hover:bg-th-bg-hover'
          }`}
          title="Select tool (S)"
        >
          Select
        </button>
        <button
          onClick={() => setTool('draw')}
          className={`px-3 py-1.5 text-sm border-x border-th-border ${
            tool === 'draw' ? 'bg-gray-800 text-white' : 'text-th-text-primary hover:bg-th-bg-hover'
          }`}
          title="Draw box tool (D)"
        >
          Draw Box
        </button>
        <button
          onClick={() => setTool('polygon')}
          className={`px-3 py-1.5 text-sm rounded-r ${
            tool === 'polygon' ? 'bg-gray-800 text-white' : 'text-th-text-primary hover:bg-th-bg-hover'
          }`}
          title="Draw polygon tool (P)"
        >
          Polygon
        </button>
      </div>

      {/* Zoom */}
      <div className="flex items-center gap-1">
        <button onClick={zoomOut}   className="px-2 py-1 text-sm bg-th-bg-card border border-th-border rounded hover:bg-th-bg-hover text-th-text-primary">-</button>
        <button onClick={resetZoom} className="px-2 py-1 text-sm bg-th-bg-card border border-th-border rounded hover:bg-th-bg-hover min-w-[56px] text-center text-th-text-primary">{zoomPercent}%</button>
        <button onClick={zoomIn}    className="px-2 py-1 text-sm bg-th-bg-card border border-th-border rounded hover:bg-th-bg-hover text-th-text-primary">+</button>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={prevImage}
          disabled={currentIndex === 0}
          className="px-2 py-1 text-sm bg-th-bg-card border border-th-border rounded hover:bg-th-bg-hover disabled:opacity-50 disabled:cursor-not-allowed text-th-text-primary"
        >
          &lt; Prev
        </button>
        <span className="text-sm text-th-text-secondary min-w-[56px] text-center">
          {images.length > 0 ? `${currentIndex + 1} / ${images.length}` : '0 / 0'}
        </span>
        <button
          onClick={nextImage}
          disabled={currentIndex >= images.length - 1}
          className="px-2 py-1 text-sm bg-th-bg-card border border-th-border rounded hover:bg-th-bg-hover disabled:opacity-50 disabled:cursor-not-allowed text-th-text-primary"
        >
          Next &gt;
        </button>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!isDirty || !currentImage}
        className={`px-3 py-1.5 text-sm rounded ${
          isDirty && currentImage
            ? 'bg-green-500 text-white hover:bg-green-600'
            : 'bg-th-bg-card border border-th-border text-th-text-secondary cursor-not-allowed'
        }`}
        title="Save (Ctrl+S)"
      >
        {isDirty ? 'Save *' : 'Saved'}
      </button>

      {/* OCR chip */}
      {currentImage && (
        <span className={`text-xs px-2 py-1 rounded font-medium ${ocrChip.className}`}>
          {ocrChip.label}
        </span>
      )}

      <div className="flex-1" />

      {exportMsg && (
        <span className="text-xs text-purple-700 font-medium bg-purple-50 px-2 py-1 rounded">
          {exportMsg}
        </span>
      )}

      {/* Auto-Annotate with Claude */}
      <div className="relative group">
        <button
          onClick={() => setShowAutoAnnotateModal(true)}
          disabled={!canAutoAnnotate}
          className={`px-3 py-1.5 text-sm rounded flex items-center gap-1.5 ${
            canAutoAnnotate
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-th-bg-card border border-th-border text-th-text-secondary cursor-not-allowed'
          }`}
        >
          <span>✦</span> Auto-Annotate
        </button>
        <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1.5 z-50 w-64 leading-snug pointer-events-none">
          {annotatedCount === 0
            ? '⚠ Annotate and save at least one invoice manually first. Those become few-shot examples for Claude.'
            : `Uses your ${annotatedCount} saved annotation${annotatedCount !== 1 ? 's' : ''} as few-shot examples to auto-annotate all remaining invoices with Claude AI.`}
        </div>
      </div>

      {showAutoAnnotateModal && (
        <AutoAnnotateModal
          annotatedCount={annotatedCount}
          onClose={() => setShowAutoAnnotateModal(false)}
        />
      )}

      {/* Export Dataset Dropdown */}
      <div className="relative" ref={exportRef}>
        <button
          onClick={() => setExportOpen((o) => !o)}
          disabled={exporting !== null}
          className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5"
        >
          {exporting ? `Exporting…` : 'Export Dataset'}
          <span className="text-xs">▾</span>
        </button>
        {exportOpen && (
          <div className="absolute right-0 top-full mt-1 bg-th-bg-card border border-th-border rounded shadow-xl z-50 w-56 overflow-hidden">
            <div className="px-3 py-1.5 text-[10px] font-semibold text-th-text-secondary uppercase tracking-wide border-b border-th-border">
              Choose format
            </div>
            <button
              onClick={handleExportJsonl}
              className="w-full px-3 py-2 text-sm text-left hover:bg-th-bg-hover flex flex-col"
            >
              <span className="font-medium text-th-text-primary">Claude Fine-tuning JSONL</span>
              <span className="text-[11px] text-th-text-secondary">JSONL for Anthropic fine-tuning API</span>
            </button>
            <button
              onClick={handleExportHuggingFace}
              className="w-full px-3 py-2 text-sm text-left hover:bg-th-bg-hover flex flex-col border-t border-th-border"
            >
              <span className="font-medium text-th-text-primary">HuggingFace Dataset ZIP</span>
              <span className="text-[11px] text-th-text-secondary">Compatible with LayoutLM, Donut, etc.</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
