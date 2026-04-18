// src/components/FaceShapePickerModal.jsx
import React from "react";
import { X } from "lucide-react";

const SHAPES = ["Oval", "Round", "Square", "Heart", "Diamond"];

function RadioCard({ label, selected, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-sm text-left transition ${
        selected ? "border-amber-500 bg-amber-50" : "border-slate-200 hover:bg-slate-50"
      }`}
    >
      <div className="font-medium">{label}</div>
      <div className="text-slate-500 text-xs">Tap to select</div>
    </button>
  );
}

export default function FaceShapePickerModal({ open, onClose, defaultShape = "Oval", onSave, startTab = "Quick Pick" }) {
  const [tab, setTab] = React.useState("Quick Pick");
  const [shape, setShape] = React.useState(null);

  React.useEffect(() => {
    if (open) {
      setTab(startTab || "Quick Pick");
      setShape(defaultShape || null);
    }
  }, [open, defaultShape, startTab]);

  React.useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Prevent background scroll when modal is open
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-sm grid place-items-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl outline-none flex flex-col max-h-[85vh]" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between p-4 border-b flex-none">
          <div className="font-semibold">Choose your face shape</div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="px-5 pt-4 flex-none">
          <div className="flex gap-2">
            {['Quick Pick', 'Guided Quiz'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-2 rounded-lg text-sm ${
                  tab === t ? 'text-slate-900 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 overflow-y-auto" style={{ maxHeight: "60vh" }}>
          {tab === "Quick Pick" && (
            <div className="grid gap-3 sm:grid-cols-3">
              {SHAPES.map((s) => (
                <RadioCard key={s} label={s} selected={shape === s} onClick={() => setShape(s)} />
              ))}
            </div>
          )}

          {tab === "Guided Quiz" && (
            <Quiz shape={shape} setShape={setShape} />
          )}
        </div>

        <div className="p-4 border-t flex justify-end gap-3 flex-none">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button
            disabled={!shape}
            onClick={() => {
              if (shape) onSave?.(shape);
              onClose?.();
            }}
            className="btn btn-primary disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Quiz({ shape, setShape }) {
  const [answers, setAnswers] = React.useState({});
  function select(q, a) {
    setAnswers((prev) => ({ ...prev, [q]: a }));
  }

  React.useEffect(() => {
    // naive heuristics from answers
    const jaw = answers.jaw; // 'jaw-wider-forehead' | 'balanced' | 'forehead-wider'
    const widest = answers.widest;
    const outline = answers.outline;
    const chin = answers.chin;

    let result = null;
    if (jaw === 'jaw-wider-forehead') result = 'Square';
    else if (widest === 'cheekbones' && chin === 'pointy') result = 'Diamond';
    else if ((outline === 'rounded' && widest === 'balanced') || (outline === 'rounded' && !widest)) result = 'Oval';
    else if (widest === 'cheeks' && chin === 'soft') result = 'Round';
    else if (widest === 'forehead' && chin === 'pointy') result = 'Heart';

    if (result) setShape(result);
  }, [answers, setShape]);

  function Q({ id, title, options }) {
    const val = answers[id];
    return (
      <div className="space-y-2">
        <div className="font-medium">{title}</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={val === o.id}
              onClick={() => select(id, o.id)}
              className={`rounded-xl border px-3 py-2 text-sm text-left ${
                val === o.id ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="font-medium">{o.label}</div>
              <div className="mt-1 h-20 w-full rounded-lg bg-slate-50 grid place-items-center">
                {o.node}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Inline SVG diagrams that match the text options
  const Trap = ({ topWide }) => (
    <svg viewBox="0 0 120 60" className="h-16 w-[110px]">
      <polygon points={topWide ? "15,5 105,5 90,55 30,55" : "30,5 90,5 105,55 15,55"} fill="#fde68a" stroke="#f59e0b" strokeWidth="2" />
    </svg>
  );
  // Face with highlight band (no lines)
  const FaceArea = ({ area }) => {
    const y = area === 'forehead' ? 18 : area === 'cheekbones' ? 30 : area === 'cheeks' ? 42 : 30;
    const ry = area === 'balanced' ? 4 : 6;
    return (
      <svg viewBox="0 0 120 60" className="h-16 w-[110px]">
        <ellipse cx="60" cy="30" rx="40" ry="25" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
        {area === 'balanced' ? (
          <>
            <ellipse cx="60" cy={18} rx="28" ry={ry} fill="#f59e0b" opacity="0.6" />
            <ellipse cx="60" cy={30} rx="30" ry={ry} fill="#f59e0b" opacity="0.6" />
            <ellipse cx="60" cy={42} rx="28" ry={ry} fill="#f59e0b" opacity="0.6" />
          </>
        ) : (
          <ellipse cx="60" cy={y} rx="30" ry={ry} fill="#f59e0b" opacity="0.75" />
        )}
      </svg>
    );
  };
  const Outline = ({ type }) => (
    <svg viewBox="0 0 120 60" className="h-16 w-[110px]">
      {type==='rounded' ? (
        <ellipse cx="60" cy="30" rx="40" ry="25" fill="#fde68a" stroke="#f59e0b" strokeWidth="2" />
      ) : (
        <polygon points="20,10 100,10 110,30 100,50 20,50 10,30" fill="#fde68a" stroke="#f59e0b" strokeWidth="2" />
      )}
    </svg>
  );
  const Chin = ({ type }) => (
    <svg viewBox="0 0 120 60" className="h-16 w-[110px]">
      <ellipse cx="60" cy="18" rx="36" ry="12" fill="#fde68a" stroke="#f59e0b" strokeWidth="2" />
      {type==='pointy' ? (
        <polygon points="48,30 72,30 60,52" fill="#f59e0b" />
      ) : (
        <ellipse cx="60" cy="42" rx="16" ry="8" fill="#f59e0b" />
      )}
    </svg>
  );

  return (
    <div className="space-y-4">
      <Q
        id="jaw"
        title="Which best describes your jaw vs forehead?"
        options={[
          { id: 'forehead-wider', label: 'Forehead wider', node: <Trap topWide={true} /> },
          { id: 'balanced', label: 'About the same', node: <Outline type="rounded" /> },
          { id: 'jaw-wider-forehead', label: 'Jaw wider than forehead', node: <Trap topWide={false} /> },
        ]}
      />
      <Q
        id="widest"
        title="Which area seems widest?"
        options={[
          { id: 'forehead', label: 'Forehead', node: <FaceArea area="forehead" /> },
          { id: 'cheekbones', label: 'Cheekbones', node: <FaceArea area="cheekbones" /> },
          { id: 'cheeks', label: 'Cheeks', node: <FaceArea area="cheeks" /> },
          { id: 'balanced', label: 'Balanced', node: <FaceArea area="balanced" /> },
        ]}
      />
      <Q
        id="outline"
        title="Overall outline looks more…"
        options={[
          { id: 'angled', label: 'Angled', node: <Outline type="angled" /> },
          { id: 'rounded', label: 'Rounded', node: <Outline type="rounded" /> },
        ]}
      />
      <Q
        id="chin"
        title="Chin shape?"
        options={[
          { id: 'pointy', label: 'Pointy', node: <Chin type="pointy" /> },
          { id: 'soft', label: 'Soft', node: <Chin type="soft" /> },
        ]}
      />

      {shape && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          Suggested result: <span className="font-semibold">{shape}</span>
        </div>
      )}
    </div>
  );
}
