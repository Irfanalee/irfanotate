import React from 'react';
import { useAnnotationStore } from '../store/annotationStore';
import { useProjectStore } from '../store/projectStore';

export const AnnotationPanel: React.FC = () => {
  const { annotations, selectedIds, selectAnnotation, deleteAnnotation } = useAnnotationStore();
  const { labels } = useProjectStore();

  const getLabelColor = (labelName: string): string => {
    const found = labels.find((l) => l.name === labelName);
    return found?.color ?? '#6B7280';
  };

  if (annotations.length === 0) {
    return (
      <div className="w-64 border-l border-gray-200 bg-white flex flex-col">
        <div className="p-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">Annotations</h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400 p-4 text-center">
          No annotations yet. Draw a box or polygon to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 border-l border-gray-200 bg-white flex flex-col">
      <div className="p-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">
          Annotations ({annotations.length})
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {annotations.map((ann) => {
          const color = getLabelColor(ann.label);
          const isSelected = selectedIds.has(ann.id);
          const geomLabel =
            ann.geometry.type === 'polygon'
              ? `polygon (${(ann.geometry.coordinates as unknown[]).length} pts)`
              : ann.geometry.type;

          return (
            <div
              key={ann.id}
              className={`flex items-center justify-between px-3 py-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                isSelected ? 'bg-blue-50' : ''
              }`}
              onClick={() => selectAnnotation(ann.id)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-gray-800 truncate">
                    {ann.label.replace(/_/g, ' ')}
                  </div>
                  <div className="text-xs text-gray-400">{geomLabel}</div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteAnnotation(ann.id);
                }}
                className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 ml-1"
                title="Delete annotation"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
