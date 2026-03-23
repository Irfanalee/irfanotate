import React, { useState, useRef, useEffect } from 'react';
import { useThemeStore, type Theme } from '../store/themeStore';

const THEMES: { id: Theme; label: string; bg: string }[] = [
  { id: 'white',    label: 'White',    bg: '#f9fafb' },
  { id: 'grey',     label: 'Grey',     bg: '#e5e7eb' },
  { id: 'blue',     label: 'Blue',     bg: '#eff6ff' },
  { id: 'dark',     label: 'Dark',     bg: '#111827' },
  { id: 'midnight', label: 'Midnight', bg: '#0d1117' },
  { id: 'system',   label: 'System',   bg: 'linear-gradient(135deg, #f9fafb 50%, #111827 50%)' },
];

export const ThemeSelector: React.FC = () => {
  const { theme, setTheme } = useThemeStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-th-text-header px-2 py-1 rounded hover:bg-white/10"
        title="Change theme"
      >
        <span
          className="w-3 h-3 rounded-full border border-white/30 flex-shrink-0 inline-block"
          style={{ background: current.bg }}
        />
        <span>{current.label}</span>
        <span className="opacity-50">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-th-bg-card border border-th-border rounded-lg shadow-xl z-50 p-3 w-52">
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id); setOpen(false); }}
                className="flex flex-col items-center gap-1 p-1.5 rounded hover:bg-th-bg-hover"
                title={t.label}
              >
                <span
                  className="w-8 h-8 rounded-full inline-block"
                  style={{
                    background: t.bg,
                    border: theme === t.id ? '2px solid #3b82f6' : '2px solid #9ca3af',
                    boxShadow: theme === t.id ? '0 0 0 2px #bfdbfe' : 'none',
                  }}
                />
                <span className="text-[10px] text-th-text-secondary leading-none">{t.label}</span>
                {theme === t.id && (
                  <span className="text-[9px] text-blue-500 font-bold leading-none">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
