import { Layers } from 'lucide-react';
import { useState } from 'react';

export default function LayerControl({ layers, onToggle }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="bg-slate-800/90 backdrop-blur-sm border border-slate-600 rounded-lg p-2 hover:bg-slate-700 transition-colors"
      >
        <Layers className="h-5 w-5 text-slate-300" />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-lg p-3 min-w-[220px] shadow-xl">
          <p className="text-xs font-medium text-slate-400 uppercase mb-2">Map Layers</p>
          <div className="space-y-2">
            {layers.map(layer => (
              <label key={layer.id} className="flex items-center gap-3 cursor-pointer hover:bg-slate-700/50 rounded px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={layer.enabled}
                  onChange={() => onToggle(layer.id)}
                  className="rounded border-slate-500"
                />
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: layer.color }} />
                <span className="text-sm text-slate-300">{layer.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
