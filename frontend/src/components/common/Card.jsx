export default function Card({ children, className = '', padding = 'p-6' }) {
  return (
    <div
      className={`rounded-2xl ${padding} ${className}`}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--bg-card-border)',
      }}
    >
      {children}
    </div>
  );
}
