import React, { useState } from 'react';
import { FIELD_COLORS, LINE_ITEM_FIELDS, HEADER_FIELDS } from '../types';

interface HelpModalProps {
  onClose: () => void;
}

type Section =
  | 'getting-started'
  | 'bounding-box'
  | 'polygon'
  | 'text-spans'
  | 'shortcuts';

const NAV_ITEMS: { id: Section; label: string; group?: string }[] = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'bounding-box',    label: 'Bounding Box',  group: 'Image' },
  { id: 'polygon',         label: 'Polygon',        group: 'Image' },
  { id: 'text-spans',      label: 'NER / Spans',    group: 'Text' },
  { id: 'shortcuts',       label: '⌨ Shortcuts' },
];

/* ── Section content components ─────────────────────────── */

const GettingStarted: React.FC = () => (
  <div className="space-y-5">
    <div>
      <h3 className="text-base font-semibold text-th-text-primary mb-1">What is DataForge?</h3>
      <p className="text-sm text-th-text-secondary">
        DataForge is a multi-modal annotation platform for building structured training datasets.
        You can annotate images with bounding boxes or polygons, and text documents with named-entity spans.
        Finished annotations can be exported as Claude fine-tuning JSONL or HuggingFace datasets.
      </p>
    </div>

    <div>
      <h3 className="text-base font-semibold text-th-text-primary mb-2">Project Types</h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="border border-th-border rounded-lg p-3">
          <div className="text-xl mb-1">🖼️</div>
          <div className="font-medium text-th-text-primary">Image Projects</div>
          <p className="text-xs text-th-text-secondary mt-1">
            Upload images, draw bounding boxes or polygons, assign labels. Supports invoice OCR annotation.
          </p>
        </div>
        <div className="border border-th-border rounded-lg p-3">
          <div className="text-xl mb-1">📄</div>
          <div className="font-medium text-th-text-primary">Text Projects</div>
          <p className="text-xs text-th-text-secondary mt-1">
            Upload .txt or .jsonl files, highlight spans of text and tag them with entity labels (NER).
          </p>
        </div>
      </div>
    </div>

    <div>
      <h3 className="text-base font-semibold text-th-text-primary mb-2">General Workflow</h3>
      <ol className="list-decimal list-inside space-y-1.5 text-sm text-th-text-secondary">
        <li>Create a project and choose a template (or define custom labels).</li>
        <li>Upload your files via the left sidebar.</li>
        <li>Annotate documents one by one using the annotation tools.</li>
        <li>Press <kbd className="bg-th-bg-toolbar border border-th-border rounded px-1 py-0.5 text-xs font-mono">Ctrl+S</kbd> or click Save after each document.</li>
        <li>Once you have several examples, use Auto-Annotate to speed up the rest.</li>
        <li>Export the finished dataset when done.</li>
      </ol>
    </div>
  </div>
);

const BoundingBox: React.FC = () => (
  <div className="space-y-5">
    <div>
      <h3 className="text-base font-semibold text-th-text-primary mb-2">Drawing Boxes</h3>
      <ol className="list-decimal list-inside space-y-1.5 text-sm text-th-text-secondary">
        <li>Press <kbd className="bg-th-bg-toolbar border border-th-border rounded px-1 py-0.5 text-xs font-mono">D</kbd> to switch to Draw Box mode (or click <em>Draw Box</em> in the toolbar).</li>
        <li>Click and drag on the image to draw a rectangle.</li>
        <li>Release to finish — a label dropdown appears immediately.</li>
        <li>Pick a label from the dropdown to assign it.</li>
        <li>Press <kbd className="bg-th-bg-toolbar border border-th-border rounded px-1 py-0.5 text-xs font-mono">S</kbd> to switch back to Select mode and click boxes to reselect them.</li>
      </ol>
    </div>

    <div>
      <h3 className="text-base font-semibold text-th-text-primary mb-2">What to Annotate</h3>
      <p className="text-sm text-th-text-secondary mb-2">
        Always annotate the <strong>value</strong>, not the static label printed next to it.
      </p>
      <div className="bg-th-bg-toolbar rounded-lg p-3 space-y-1.5 text-xs font-mono">
        <div className="flex gap-3">
          <span className="text-red-400 w-32">❌ "Invoice no:"</span>
          <span className="text-th-text-secondary">← static label, leave unassigned</span>
        </div>
        <div className="flex gap-3">
          <span className="text-green-600 w-32">✓ "22862792"</span>
          <span className="text-th-text-secondary">← the value → assign invoice_number</span>
        </div>
        <div className="flex gap-3 mt-1">
          <span className="text-red-400 w-32">❌ "Date:"</span>
          <span className="text-th-text-secondary">← static label, leave unassigned</span>
        </div>
        <div className="flex gap-3">
          <span className="text-green-600 w-32">✓ "2024-01-15"</span>
          <span className="text-th-text-secondary">← the value → assign invoice_date</span>
        </div>
      </div>
    </div>

    <div>
      <h3 className="text-base font-semibold text-th-text-primary mb-2">Invoice Field Reference</h3>
      <p className="text-sm text-th-text-secondary mb-3">
        <strong>Header fields</strong> appear once per invoice. <strong>Line item fields</strong> repeat for each product or service row.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-th-border rounded-lg p-3">
          <p className="font-semibold text-th-text-primary mb-1 text-sm">Header Fields</p>
          <p className="text-xs text-th-text-secondary mb-2">Document-level. Appears once.</p>
          <div className="space-y-1.5">
            {HEADER_FIELDS.map((f) => (
              <div key={f} className="flex items-center gap-2">
                <span
                  className="text-xs px-2 py-0.5 rounded font-medium"
                  style={{ backgroundColor: FIELD_COLORS[f] + '22', color: FIELD_COLORS[f] }}
                >
                  {f.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-th-text-secondary">
                  {f === 'invoice_number' && 'e.g. INV-2024-001'}
                  {f === 'invoice_date'   && 'e.g. 2024-01-15'}
                  {f === 'vendor_name'    && 'e.g. Acme Corp'}
                  {f === 'total_gross'    && 'e.g. $1,250.00'}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="border border-th-border rounded-lg p-3">
          <p className="font-semibold text-th-text-primary mb-1 text-sm">Line Item Fields</p>
          <p className="text-xs text-th-text-secondary mb-2">Row-level. Repeats per product.</p>
          <div className="space-y-1.5">
            {LINE_ITEM_FIELDS.map((f) => (
              <div key={f} className="flex items-center gap-2">
                <span
                  className="text-xs px-2 py-0.5 rounded font-medium"
                  style={{ backgroundColor: FIELD_COLORS[f] + '22', color: FIELD_COLORS[f] }}
                >
                  {f.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-th-text-secondary">
                  {f === 'description'  && 'e.g. Web Design'}
                  {f === 'quantity'     && 'e.g. 5'}
                  {f === 'unit_measure' && 'e.g. hours'}
                  {f === 'net_price'    && 'e.g. $150.00'}
                  {f === 'net_worth'    && 'e.g. $750.00'}
                  {f === 'vat'          && 'e.g. 23%'}
                  {f === 'gross_worth'  && 'e.g. $922.50'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    <div>
      <h3 className="text-base font-semibold text-th-text-primary mb-2">Grouping Line Items</h3>
      <ol className="list-decimal list-inside space-y-1.5 text-sm text-th-text-secondary">
        <li>Assign field types to each box in a row (description, quantity, net price, etc.).</li>
        <li>Shift+click each box in that row to multi-select them.</li>
        <li>Press <kbd className="bg-th-bg-toolbar border border-th-border rounded px-1 py-0.5 text-xs font-mono">G</kbd> or click <em>Create Line Item</em> in the right panel.</li>
        <li>Repeat for each row in the table.</li>
      </ol>
      <p className="text-xs text-th-text-secondary mt-2 opacity-75">
        All selected boxes must have line item field types (not header types) to create a group.
      </p>
    </div>
  </div>
);

const Polygon: React.FC = () => (
  <div className="space-y-5">
    <div>
      <h3 className="text-base font-semibold text-th-text-primary mb-2">Drawing Polygons</h3>
      <ol className="list-decimal list-inside space-y-1.5 text-sm text-th-text-secondary">
        <li>Press <kbd className="bg-th-bg-toolbar border border-th-border rounded px-1 py-0.5 text-xs font-mono">P</kbd> to switch to Polygon mode (or click <em>Polygon</em> in the toolbar).</li>
        <li>Click anywhere on the image to place the first vertex.</li>
        <li>Continue clicking to add vertices — a live preview shows the polygon outline.</li>
        <li>Close the polygon by clicking on the first vertex again, or double-clicking.</li>
        <li>A label dropdown appears — assign a label to finish.</li>
      </ol>
    </div>

    <div>
      <h3 className="text-base font-semibold text-th-text-primary mb-2">Editing & Deleting</h3>
      <ul className="list-disc list-inside space-y-1.5 text-sm text-th-text-secondary">
        <li>Switch to <kbd className="bg-th-bg-toolbar border border-th-border rounded px-1 py-0.5 text-xs font-mono">S</kbd> (Select) and click a polygon to select it.</li>
        <li>Press <kbd className="bg-th-bg-toolbar border border-th-border rounded px-1 py-0.5 text-xs font-mono">Delete</kbd> or <kbd className="bg-th-bg-toolbar border border-th-border rounded px-1 py-0.5 text-xs font-mono">Backspace</kbd> to remove the selected polygon.</li>
        <li>Selected polygons are listed in the Annotations panel on the right.</li>
      </ul>
    </div>

    <div>
      <h3 className="text-base font-semibold text-th-text-primary mb-2">When to Use Polygons</h3>
      <p className="text-sm text-th-text-secondary mb-2">
        Use polygons instead of bounding boxes when the region you want to annotate is not rectangular:
      </p>
      <ul className="list-disc list-inside space-y-1.5 text-sm text-th-text-secondary">
        <li>Irregularly shaped objects (vehicles, machinery parts).</li>
        <li>Rotated or skewed text blocks.</li>
        <li>Segmentation tasks where precise boundaries matter.</li>
        <li>Any region where a tight fit reduces ambiguity for the model.</li>
      </ul>
    </div>
  </div>
);

const TextSpans: React.FC = () => (
  <div className="space-y-5">
    <div>
      <h3 className="text-base font-semibold text-th-text-primary mb-2">Annotating Text Spans</h3>
      <ol className="list-decimal list-inside space-y-1.5 text-sm text-th-text-secondary">
        <li>Open a text document from the left sidebar.</li>
        <li>Click and drag to select a span of text (just like selecting text in a browser).</li>
        <li>Release the mouse — a label picker popup appears near your selection.</li>
        <li>Click a label to assign it. The span is highlighted in that label's color.</li>
        <li>Overlapping spans are allowed on the same text.</li>
      </ol>
    </div>

    <div>
      <h3 className="text-base font-semibold text-th-text-primary mb-2">Managing Spans</h3>
      <ul className="list-disc list-inside space-y-1.5 text-sm text-th-text-secondary">
        <li>Click a colored highlight to select that span.</li>
        <li>Press <kbd className="bg-th-bg-toolbar border border-th-border rounded px-1 py-0.5 text-xs font-mono">Delete</kbd> or <kbd className="bg-th-bg-toolbar border border-th-border rounded px-1 py-0.5 text-xs font-mono">Backspace</kbd> to remove the selected span.</li>
        <li>All spans for the current document are listed in the Annotations panel on the right.</li>
        <li>Press <kbd className="bg-th-bg-toolbar border border-th-border rounded px-1 py-0.5 text-xs font-mono">Ctrl+S</kbd> to save annotations for the current document.</li>
      </ul>
    </div>

    <div>
      <h3 className="text-base font-semibold text-th-text-primary mb-2">Tips</h3>
      <ul className="list-disc list-inside space-y-1.5 text-sm text-th-text-secondary">
        <li>Select the exact token boundaries — don't include leading/trailing spaces.</li>
        <li>For multi-word entities, select the entire phrase as one span.</li>
        <li>Use the navigation arrows to move through documents quickly.</li>
        <li>The sidebar shows a ✓ next to documents that have been saved.</li>
      </ul>
    </div>
  </div>
);

const Shortcuts: React.FC = () => (
  <div className="space-y-5">
    <div>
      <h3 className="text-base font-semibold text-th-text-primary mb-3">Image Annotation</h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        {[
          ['S', 'Select tool'],
          ['D', 'Draw box tool'],
          ['P', 'Polygon tool'],
          ['G', 'Group selection as line item'],
          ['Delete / Backspace', 'Delete selected annotation(s)'],
          ['Escape', 'Clear selection / cancel polygon'],
          ['← →', 'Previous / next image'],
          ['Ctrl+S', 'Save annotation'],
          ['Ctrl+Scroll', 'Zoom in / out'],
          ['Scroll', 'Pan image'],
          ['Middle mouse drag', 'Pan image'],
        ].map(([key, desc]) => (
          <div key={key} className="flex items-center gap-2">
            <kbd className="bg-th-bg-toolbar border border-th-border rounded px-1.5 py-0.5 text-xs font-mono whitespace-nowrap text-th-text-primary">
              {key}
            </kbd>
            <span className="text-th-text-secondary">{desc}</span>
          </div>
        ))}
      </div>
    </div>

    <div className="border-t border-th-border pt-4">
      <h3 className="text-base font-semibold text-th-text-primary mb-3">Text / NER Annotation</h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        {[
          ['Click + drag', 'Select text span'],
          ['Click highlight', 'Select span'],
          ['Delete / Backspace', 'Delete selected span'],
          ['← →', 'Previous / next document'],
          ['Ctrl+S', 'Save annotation'],
        ].map(([key, desc]) => (
          <div key={key} className="flex items-center gap-2">
            <kbd className="bg-th-bg-toolbar border border-th-border rounded px-1.5 py-0.5 text-xs font-mono whitespace-nowrap text-th-text-primary">
              {key}
            </kbd>
            <span className="text-th-text-secondary">{desc}</span>
          </div>
        ))}
      </div>
    </div>

    <div className="border-t border-th-border pt-4">
      <h3 className="text-base font-semibold text-th-text-primary mb-3">General</h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        {[
          ['?', 'Open this help modal'],
          ['Escape', 'Close modal / clear selection'],
        ].map(([key, desc]) => (
          <div key={key} className="flex items-center gap-2">
            <kbd className="bg-th-bg-toolbar border border-th-border rounded px-1.5 py-0.5 text-xs font-mono whitespace-nowrap text-th-text-primary">
              {key}
            </kbd>
            <span className="text-th-text-secondary">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ── Main modal ──────────────────────────────────────────── */

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState<Section>('getting-started');

  // Group nav items
  const groups: { label: string | null; items: typeof NAV_ITEMS }[] = [];
  let lastGroup: string | null | undefined = undefined;
  for (const item of NAV_ITEMS) {
    const g = item.group ?? null;
    if (g !== lastGroup) {
      groups.push({ label: g, items: [item] });
      lastGroup = g;
    } else {
      groups[groups.length - 1].items.push(item);
    }
  }

  const sectionContent: Record<Section, React.ReactNode> = {
    'getting-started': <GettingStarted />,
    'bounding-box':    <BoundingBox />,
    'polygon':         <Polygon />,
    'text-spans':      <TextSpans />,
    'shortcuts':       <Shortcuts />,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={onClose}
    >
      <div
        className="bg-th-bg-card rounded-xl shadow-2xl w-[860px] max-h-[85vh] flex flex-col overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-th-border flex-shrink-0">
          <h2 className="text-lg font-semibold text-th-text-primary">How to Use DataForge</h2>
          <button
            onClick={onClose}
            className="text-th-text-secondary hover:text-th-text-primary text-xl font-bold leading-none"
          >
            ×
          </button>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left nav */}
          <div className="w-44 flex-shrink-0 border-r border-th-border overflow-y-auto py-3">
            {groups.map((group, gi) => (
              <div key={gi}>
                {gi > 0 && <div className="my-2 border-t border-th-border" />}
                {group.label && (
                  <p className="px-4 py-1 text-[10px] font-semibold text-th-text-secondary uppercase tracking-wider">
                    {group.label}
                  </p>
                )}
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full text-left px-4 py-1.5 text-sm transition-colors rounded-none ${
                      activeSection === item.id
                        ? 'bg-th-bg-selected text-blue-600 font-medium border-l-2 border-blue-500'
                        : 'text-th-text-secondary hover:bg-th-bg-hover hover:text-th-text-primary'
                    }`}
                  >
                    {group.label ? `› ${item.label}` : item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Right content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {sectionContent[activeSection]}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-th-border flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
