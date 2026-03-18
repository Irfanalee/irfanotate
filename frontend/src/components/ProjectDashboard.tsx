import React, { useEffect, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { NewProjectModal } from './NewProjectModal';
import type { Project } from '../types';

interface ProjectDashboardProps {
  onOpenProject: (project: Project) => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ onOpenProject }) => {
  const { projects, isLoading, fetchProjects, removeProject } = useProjectStore();
  const [showNewModal, setShowNewModal] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDelete = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    if (!confirm(`Delete project "${project.name}"? Images will not be deleted.`)) return;
    await removeProject(project.id);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">DataForge</h1>
          <p className="text-sm text-gray-500">Multi-modal annotation platform</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Project
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            Loading projects…
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">📂</div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">No projects yet</h2>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">
              Create your first annotation project to get started.
            </p>
            <button
              onClick={() => setShowNewModal(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => onOpenProject(project)}
                className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{project.data_type === 'image' ? '🖼️' : '📄'}</span>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {project.annotation_type}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, project)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all text-lg leading-none"
                    title="Delete project"
                  >
                    ×
                  </button>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 truncate">{project.name}</h3>
                {project.description && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{project.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-auto pt-2 border-t border-gray-100">
                  <span>{project.image_count} images</span>
                  <span>·</span>
                  <span>{project.annotated_count} annotated</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNewModal && (
        <NewProjectModal
          onClose={() => setShowNewModal(false)}
          onCreate={(project) => {
            setShowNewModal(false);
            onOpenProject(project);
          }}
        />
      )}
    </div>
  );
};
