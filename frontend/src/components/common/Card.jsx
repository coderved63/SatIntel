export default function Card({ children, className = '', padding = 'p-6' }) {
  return (
    <div
      className={`rounded-2xl ${padding} ${className}`}
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {children}
    </div>
  );
}
