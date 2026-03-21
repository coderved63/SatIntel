export default function Card({ children, className = '', padding = 'p-6' }) {
  return (
    <div
      className={`rounded-xl ${padding} ${className}`}
      style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {children}
    </div>
  );
}
