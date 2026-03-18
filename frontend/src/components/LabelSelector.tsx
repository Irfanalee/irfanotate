import React from 'react';
import { useProjectStore } from '../store/projectStore';

interface LabelSelectorProps {
  selectedLabel: string | null;
  onSelect: (label: string) => void;
  className?: string;
}

export const LabelSelector: React.FC<LabelSelectorProps> = ({
  selectedLabel,
  onSelect,
  className = '',
}) => {
  const { labels } = useProjectStore();

  if (labels.length === 0) {
    return (
      <div className={`text-sm text-gray-500 p-2 ${className}`}>
        No labels defined for this project.
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-1 p-2 ${className}`}>
      {labels.map((label) => {
        const isSelected = selectedLabel === label.name;
        return (
          <button
            key={label.name}
            onClick={() => onSelect(label.name)}
            className="px-2 py-1 rounded text-xs font-medium transition-all"
            style={{
              backgroundColor: isSelected ? label.color : `${label.color}22`,
              color: isSelected ? '#fff' : label.color,
              border: `1px solid ${label.color}`,
              outline: isSelected ? `2px solid ${label.color}` : 'none',
              outlineOffset: '1px',
            }}
          >
            {label.name.replace(/_/g, ' ')}
          </button>
        );
      })}
    </div>
  );
};
