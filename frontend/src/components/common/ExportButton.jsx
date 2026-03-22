import { Download } from 'lucide-react';

export default function ExportButton({ onClick, label = 'Export CSV', className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${className}`}
      style={{
        background: 'var(--bg-card, rgba(30,41,59,0.5))',
        borderColor: 'var(--border, #334155)',
        color: 'var(--text-muted, #94A3B8)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent, #06B6D4)'; e.currentTarget.style.color = 'var(--accent, #06B6D4)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border, #334155)'; e.currentTarget.style.color = 'var(--text-muted, #94A3B8)'; }}
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
