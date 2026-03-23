import React, { useState } from 'react';
import { useImageStore } from '../store/imageStore';
import { useTextStore } from '../store/textStore';
import { useAudioStore } from '../store/audioStore';
import { useVideoStore } from '../store/videoStore';
import { useProjectStore } from '../store/projectStore';
import { useCanvasStore } from '../store/canvasStore';
import { useInvoiceStore } from '../store/invoiceStore';
import { useThemeStore } from '../store/themeStore';
import { HelpModal } from './HelpModal';
import { ThemeSelector } from './ThemeSelector';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { images, currentIndex } = useImageStore();
  const { docs } = useTextStore();
  const { files: audioFiles, currentIndex: audioIndex } = useAudioStore();
  const { files: videoFiles, currentIndex: videoIndex } = useVideoStore();
  const { currentProject } = useProjectStore();
  const { isDirty } = useInvoiceStore();
  const { tool, transform } = useCanvasStore();
  // Import store to trigger initialization on mount
  useThemeStore();
  const [helpOpen, setHelpOpen] = useState(false);

  const currentImage = images[currentIndex];

  const dataType = currentProject?.data_type;

  const statsNode = dataType === 'text' ? (
    <>
      <span>{docs.length} documents</span>
      <span>{docs.filter((d) => d.is_annotated).length} annotated</span>
    </>
  ) : dataType === 'audio' ? (
    <>
      <span>{audioFiles.length} files</span>
      <span>{audioFiles.filter((f) => f.is_annotated).length} annotated</span>
    </>
  ) : dataType === 'video' ? (
    <>
      <span>{videoFiles.length} files</span>
      <span>{videoFiles.filter((f) => f.is_annotated).length} annotated</span>
    </>
  ) : (
    <>
      <span>{images.length} images</span>
      <span>{images.filter((img) => img.isAnnotated).length} labeled</span>
    </>
  );

  const dataTypeBadgeColor: Record<string, string> = {
    image: 'bg-blue-700 text-blue-100',
    text: 'bg-emerald-700 text-emerald-100',
    audio: 'bg-purple-700 text-purple-100',
    video: 'bg-rose-700 text-rose-100',
  };
  const badgeClass = dataTypeBadgeColor[currentProject?.data_type ?? ''] ?? 'bg-gray-600 text-gray-100';

  return (
    <div className="h-full flex flex-col bg-th-bg-page">
      <header className="h-10 bg-th-bg-header text-th-text-header flex items-center px-4 justify-between">
        {/* Left: brand + project name */}
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold tracking-tight">DataForge</h1>
          {currentProject && (
            <>
              <span className="opacity-40 text-sm">·</span>
              <span className="text-sm font-medium">{currentProject.name}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${badgeClass}`}>
                {currentProject.data_type}
              </span>
            </>
          )}
        </div>

        {/* Right: stats + theme selector + help */}
        <div className="flex items-center gap-3 text-xs text-th-text-header opacity-80">
          {statsNode}
          <ThemeSelector />
          <button
            onClick={() => setHelpOpen(true)}
            className="w-5 h-5 rounded-full border border-white/30 text-th-text-header hover:bg-white/10 flex items-center justify-center font-bold text-xs opacity-80 hover:opacity-100"
            title="Help"
          >
            ?
          </button>
        </div>
      </header>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}

      <main className="flex-1 flex overflow-hidden">{children}</main>

      <footer className="h-6 bg-th-bg-footer border-t border-th-border flex items-center px-4 text-xs text-th-text-secondary gap-4">
        {dataType === 'audio' ? (
          <span className="font-medium">{audioFiles[audioIndex]?.filename ?? 'No file selected'}</span>
        ) : dataType === 'video' ? (
          <span className="font-medium">{videoFiles[videoIndex]?.filename ?? 'No file selected'}</span>
        ) : (
          <>
            <span className="font-medium">{currentImage?.filename || 'No image selected'}</span>
            {currentImage && (
              <span>
                {currentImage.width} × {currentImage.height}
              </span>
            )}
            <span className="capitalize">Tool: {tool}</span>
            <span>Zoom: {Math.round(transform.scale * 100)}%</span>
            {isDirty && <span className="text-orange-500">Unsaved changes</span>}
          </>
        )}
        <div className="flex-1" />
        <span className="opacity-60">
          Ctrl+S: Save | Space: Play/Pause | Del: Delete
        </span>
      </footer>
    </div>
  );
};
