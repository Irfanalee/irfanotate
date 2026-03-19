import React, { useState } from 'react';
import { autoAnnotate } from '../api/claude';
import { fetchImages } from '../api/images';
import { useImageStore } from '../store/imageStore';

interface AutoAnnotateModalProps {
  onClose: () => void;
  annotatedCount: number;
}

type Provider = 'anthropic';

const PROVIDER_MODELS: Record<Provider, string[]> = {
  anthropic: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
};

const ALL_PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic', enabled: true },
  { id: 'openai', label: 'OpenAI', enabled: false },
  { id: 'google', label: 'Google', enabled: false },
] as const;

type Phase = 'settings' | 'running' | 'done';

interface ProgressState {
  current: number;
  total: number;
  filename: string;
}

export const AutoAnnotateModal: React.FC<AutoAnnotateModalProps> = ({ onClose, annotatedCount }) => {
  const { setImages } = useImageStore();

  const [provider, setProvider] = useState<Provider>('anthropic');
  const [model, setModel] = useState(PROVIDER_MODELS.anthropic[0]);
  const [maxExamples, setMaxExamples] = useState(3);
  const [overwrite, setOverwrite] = useState(false);

  const [phase, setPhase] = useState<Phase>('settings');
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProviderChange = (p: Provider) => {
    setProvider(p);
    setModel(PROVIDER_MODELS[p][0]);
  };

  const handleStart = async () => {
    setPhase('running');
    setProgress(null);
    setSummary(null);
    setError(null);

    try {
      await autoAnnotate(overwrite, maxExamples, (event) => {
        if (event.type === 'start') {
          setProgress({ current: 0, total: event.total ?? 0, filename: '' });
        } else if (event.type === 'working') {
          setProgress({
            current: event.current ?? 0,
            total: event.total ?? 0,
            filename: event.filename ?? '',
          });
        } else if (event.type === 'progress') {
          setProgress({
            current: event.current ?? 0,
            total: event.total ?? 0,
            filename: event.filename ?? '',
          });
        } else if (event.type === 'done') {
          setProgress(null);
          const parts: string[] = [];
          if ((event.total_annotated ?? 0) > 0) parts.push(`✓ ${event.total_annotated} annotated`);
          if ((event.total_skipped ?? 0) > 0) parts.push(`⏭ ${event.total_skipped} skipped`);
          if ((event.total_errors ?? 0) > 0) parts.push(`✗ ${event.total_errors} errors`);
          setSummary(parts.length ? parts.join('  ') : 'Nothing to annotate — all done.');
          setPhase('done');
          fetchImages().then(setImages).catch(console.error);
        }
      }, model);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.length > 120 ? msg.slice(0, 120) + '…' : msg);
      setPhase('done');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-96 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
          <span className="text-indigo-600">✦</span>
          <h2 className="text-sm font-semibold text-gray-800">Auto-Annotate Settings</h2>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Provider */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-600 w-28">Provider</label>
            <div className="flex-1 relative">
              <select
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 pr-7 appearance-none bg-white"
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value as Provider)}
                disabled={phase === 'running'}
              >
                {ALL_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id} disabled={!p.enabled}>
                    {p.label}{!p.enabled ? ' (coming soon)' : ''}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
            </div>
          </div>

          {/* Model */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-600 w-28">Model</label>
            <div className="flex-1 relative">
              <select
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 pr-7 appearance-none bg-white"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={phase === 'running'}
              >
                {PROVIDER_MODELS[provider].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
            </div>
          </div>

          {/* Max examples */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-600 w-28">Max examples</label>
            <input
              type="number"
              min={1}
              max={10}
              value={maxExamples}
              onChange={(e) => setMaxExamples(Math.max(1, Math.min(10, Number(e.target.value))))}
              disabled={phase === 'running'}
              className="w-20 text-sm border border-gray-300 rounded px-2 py-1.5 text-center"
            />
            <span className="text-xs text-gray-400">(1–10)</span>
          </div>

          {/* Overwrite */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-600 w-28" />
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
                disabled={phase === 'running'}
                className="rounded"
              />
              Overwrite existing
            </label>
          </div>

          {/* Progress */}
          {phase === 'running' && progress && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between text-xs text-indigo-700">
                <span className="font-medium">{progress.current} / {progress.total} images</span>
                <span className="animate-spin inline-block text-indigo-400">⟳</span>
              </div>
              {progress.filename && (
                <p className="text-[11px] text-gray-400 truncate">{progress.filename}</p>
              )}
              <div className="w-full h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{
                    width: progress.total > 0
                      ? `${(progress.current / progress.total) * 100}%`
                      : '0%',
                  }}
                />
              </div>
            </div>
          )}
          {phase === 'running' && !progress && (
            <p className="text-xs text-indigo-600 animate-pulse">Starting…</p>
          )}

          {/* Summary / Error */}
          {phase === 'done' && summary && (
            <div className="text-xs font-medium text-indigo-700 bg-indigo-50 px-3 py-2 rounded">
              {summary}
            </div>
          )}
          {phase === 'done' && error && (
            <div className="text-xs font-medium text-red-600 bg-red-50 px-3 py-2 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between">
          <p className="text-[11px] text-gray-400">
            {annotatedCount > 0
              ? `Using ${annotatedCount} saved annotation${annotatedCount !== 1 ? 's' : ''} as examples`
              : 'No annotations yet — annotate 1+ manually first'}
          </p>
          <div className="flex items-center gap-2">
            {phase !== 'running' && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded"
              >
                {phase === 'done' ? 'Close' : 'Cancel'}
              </button>
            )}
            {phase === 'settings' && (
              <button
                onClick={handleStart}
                disabled={annotatedCount === 0}
                className={`px-3 py-1.5 text-xs rounded flex items-center gap-1.5 ${
                  annotatedCount > 0
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <span>▶</span> Start
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
