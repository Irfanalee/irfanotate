import React, { useEffect, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { fetchTemplates } from '../api/projects';
import type { Project, SchemaLabel } from '../types';
import type { TemplateMeta } from '../api/projects';

interface NewProjectModalProps {
  onClose: () => void;
  onCreate: (project: Project) => void;
}

const STEP_LABELS = ['Details', 'Data Type', 'Template', 'Labels'];

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ onClose, onCreate }) => {
  const { createProject } = useProjectStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dataType, setDataType] = useState('image');
  const [annotationType, setAnnotationType] = useState('bbox');
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [labels, setLabels] = useState<SchemaLabel[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates()
      .then(setTemplates)
      .catch(() => {});
  }, []);

  const handleTemplateSelect = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    try {
      const { fetchTemplate } = await import('../api/projects');
      const tmpl = await fetchTemplate(templateId);
      setLabels(tmpl.schema.labels as SchemaLabel[]);
    } catch {
      setLabels([]);
    }
  };

  const handleLabelColorChange = (index: number, color: string) => {
    setLabels((prev) => prev.map((l, i) => (i === index ? { ...l, color } : l)));
  };

  const handleLabelNameChange = (index: number, name: string) => {
    setLabels((prev) => prev.map((l, i) => (i === index ? { ...l, name } : l)));
  };

  const handleAddLabel = () => {
    setLabels((prev) => [
      ...prev,
      { name: '', color: '#6B7280', attributes: [] },
    ]);
  };

  const handleRemoveLabel = (index: number) => {
    setLabels((prev) => prev.filter((_, i) => i !== index));
  };

  const canNext = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 2) return selectedTemplateId !== null;
    return true;
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const project = await createProject({
        name: name.trim(),
        description: description.trim(),
        data_type: dataType,
        annotation_type: annotationType,
        schema: { labels },
      });
      onCreate(project);
    } catch (e) {
      setError('Failed to create project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-th-bg-card rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-th-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-th-text-primary">New Project</h2>
            <button
              onClick={onClose}
              className="text-th-text-secondary hover:text-th-text-primary text-xl leading-none"
            >
              ×
            </button>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {STEP_LABELS.map((label, i) => (
              <React.Fragment key={label}>
                <div className="flex items-center gap-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      i < step
                        ? 'bg-blue-600 text-white'
                        : i === step
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-600'
                        : 'bg-th-bg-toolbar text-th-text-secondary'
                    }`}
                  >
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs ${i === step ? 'text-blue-700 font-medium' : 'text-th-text-secondary'}`}>
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`flex-1 h-px ${i < step ? 'bg-blue-300' : 'bg-th-border'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 min-h-[200px]">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-th-text-primary mb-1">
                  Project name <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Invoice Q1 2026"
                  className="w-full border border-th-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-th-bg-card text-th-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-th-text-primary mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description…"
                  rows={3}
                  className="w-full border border-th-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-th-bg-card text-th-text-primary"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-th-text-primary mb-2">Data type</p>
              {[
                { id: 'image', label: 'Image', icon: '🖼️', enabled: true },
                { id: 'text', label: 'Text', icon: '📝', enabled: true },
                { id: 'audio', label: 'Audio', icon: '🎵', enabled: false },
                { id: 'video', label: 'Video', icon: '🎬', enabled: false },
              ].map((dt) => (
                <div
                  key={dt.id}
                  onClick={() => {
                    if (!dt.enabled) return;
                    setDataType(dt.id);
                    setAnnotationType(dt.id === 'text' ? 'text_span' : 'bbox');
                    setSelectedTemplateId(null);
                    setLabels([]);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    dt.id === dataType
                      ? 'border-blue-500 bg-blue-50'
                      : dt.enabled
                      ? 'border-th-border hover:border-th-border-strong cursor-pointer'
                      : 'border-th-border bg-th-bg-toolbar opacity-50 cursor-not-allowed'
                  }`}
                >
                  <span className="text-2xl">{dt.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-th-text-primary">{dt.label}</div>
                    {!dt.enabled && (
                      <div className="text-xs text-th-text-secondary">Coming in a future phase</div>
                    )}
                  </div>
                  {dt.id === dataType && (
                    <div className="ml-auto text-blue-600 text-sm font-medium">✓ Selected</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-th-text-primary mb-2">Choose a template</p>
              {templates.length === 0 ? (
                <div className="text-sm text-th-text-secondary py-4 text-center">Loading templates…</div>
              ) : (
                templates.filter((t) => t.data_type === dataType).map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => handleTemplateSelect(tmpl.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedTemplateId === tmpl.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-th-border hover:border-th-border-strong'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm text-th-text-primary">{tmpl.name}</div>
                      {tmpl.label_count > 0 && (
                        <span className="text-xs text-th-text-secondary">{tmpl.label_count} labels</span>
                      )}
                    </div>
                    <div className="text-xs text-th-text-secondary mt-0.5">{tmpl.description}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-th-text-primary">Labels</p>
                <button
                  onClick={handleAddLabel}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  + Add label
                </button>
              </div>
              {labels.length === 0 ? (
                <p className="text-sm text-th-text-secondary text-center py-4">
                  No labels. Add some or use a template.
                </p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {labels.map((label, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={label.color}
                        onChange={(e) => handleLabelColorChange(i, e.target.value)}
                        className="w-7 h-7 rounded cursor-pointer border border-th-border"
                        title="Label color"
                      />
                      <input
                        type="text"
                        value={label.name}
                        onChange={(e) => handleLabelNameChange(i, e.target.value)}
                        placeholder="Label name"
                        className="flex-1 border border-th-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-th-bg-card text-th-text-primary"
                      />
                      <button
                        onClick={() => handleRemoveLabel(i)}
                        className="text-th-text-secondary hover:text-red-500 transition-colors"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex justify-between">
          <button
            onClick={step === 0 ? onClose : () => setStep((s) => s - 1)}
            className="px-4 py-2 text-sm text-th-text-secondary hover:text-th-text-primary font-medium transition-colors"
          >
            {step === 0 ? 'Cancel' : '← Back'}
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating…' : 'Create Project'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
