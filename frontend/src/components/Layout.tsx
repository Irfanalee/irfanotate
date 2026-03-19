import React, { useState } from 'react';
import { useImageStore } from '../store/imageStore';
import { useTextStore } from '../store/textStore';
import { useProjectStore } from '../store/projectStore';
import { useCanvasStore } from '../store/canvasStore';
import { useInvoiceStore } from '../store/invoiceStore';
import { HelpModal } from './HelpModal';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { images, currentIndex } = useImageStore();
  const { docs } = useTextStore();
  const { currentProject } = useProjectStore();
  const { isDirty } = useInvoiceStore();
  const { tool, transform } = useCanvasStore();
  const [helpOpen, setHelpOpen] = useState(false);

  const currentImage = images[currentIndex];

  const isTextProject = currentProject?.data_type === 'text';

  const statsNode = isTextProject ? (
    <>
      <span>{docs.length} documents</span>
      <span>{docs.filter((d) => d.is_annotated).length} annotated</span>
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
  };
  const badgeClass = dataTypeBadgeColor[currentProject?.data_type ?? ''] ?? 'bg-gray-600 text-gray-100';

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <header className="h-10 bg-gray-800 text-white flex items-center px-4 justify-between">
        {/* Left: brand + project name */}
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold tracking-tight">DataForge</h1>
          {currentProject && (
            <>
              <span className="text-gray-500 text-sm">·</span>
              <span className="text-sm font-medium text-gray-100">{currentProject.name}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${badgeClass}`}>
                {currentProject.data_type}
              </span>
            </>
          )}
        </div>

        {/* Right: stats + help */}
        <div className="flex items-center gap-4 text-xs text-gray-300">
          {statsNode}
          <button
            onClick={() => setHelpOpen(true)}
            className="ml-2 w-5 h-5 rounded-full border border-gray-400 text-gray-300 hover:bg-gray-600 hover:text-white flex items-center justify-center font-bold text-xs"
            title="Help"
          >
            ?
          </button>
        </div>
      </header>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}

      <main className="flex-1 flex overflow-hidden">{children}</main>

      <footer className="h-6 bg-gray-200 border-t border-gray-300 flex items-center px-4 text-xs text-gray-600 gap-4">
        <span className="font-medium">{currentImage?.filename || 'No image selected'}</span>
        {currentImage && (
          <span>
            {currentImage.width} × {currentImage.height}
          </span>
        )}
        <span className="capitalize">Tool: {tool}</span>
        <span>Zoom: {Math.round(transform.scale * 100)}%</span>
        {isDirty && <span className="text-orange-600">Unsaved changes</span>}
        <div className="flex-1" />
        <span className="text-gray-400">
          D: Draw | P: Polygon | S: Select | Del: Delete | G: Group | Arrows: Navigate | Ctrl+S: Save
        </span>
      </footer>
    </div>
  );
};
