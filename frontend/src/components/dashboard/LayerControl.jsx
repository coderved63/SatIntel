import { Layers } from 'lucide-react';
import { useState } from 'react';

export default function LayerControl({ layers, onToggle }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-slate-800/90 hover:border-white/20 transition-all shadow-lg"
      >
        <Layers className="h-4 w-4" />
        <span className="font-medium text-xs">Data Layers</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-3 min-w-[220px]">
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2 px-1">Satellite Layers</p>
          <div className="space-y-0.5">
            {layers.map(layer => (
              <label
                key={layer.id}
                className={`flex items-center gap-3 cursor-pointer rounded-xl px-2.5 py-2 transition-all ${
                  layer.enabled ? 'bg-white/5' : 'hover:bg-white/[0.03]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full transition-all ${layer.enabled ? 'scale-125 shadow-lg' : 'opacity-40'}`}
                  style={{
                    backgroundColor: layer.color,
                    boxShadow: layer.enabled ? `0 0 8px ${layer.color}60` : 'none',
                  }}
                />
                <span className={`text-sm flex-1 transition-colors ${
                  layer.enabled ? 'text-white/90 font-medium' : 'text-white/40'
                }`}>
                  {layer.label}
                </span>
                <span
                  className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer ${
                    layer.enabled ? 'bg-blue-500' : 'bg-white/10'
                  }`}
                  onClick={(e) => { e.preventDefault(); onToggle(layer.id); }}
                >
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${
                    layer.enabled ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`} />
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
