export default function Card({ children, className = '', padding = 'p-6' }) {
  return (
    <div className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl ${padding} ${className}`}>
      {children}
    </div>
  );
}
