export default function Input({ label, type = 'text', value, onChange, placeholder, error, required, className = '' }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3 rounded-lg outline-none transition-all duration-200"
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--bg-input-border)',
          color: 'var(--text-primary)',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.15)'; }}
        onBlur={(e) => { e.target.style.borderColor = 'var(--bg-input-border)'; e.target.style.boxShadow = 'none'; }}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
