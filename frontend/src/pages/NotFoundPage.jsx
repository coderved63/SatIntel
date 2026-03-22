import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center">
        <h1 className="text-6xl font-bold" style={{ color: 'var(--text-faint)' }}>404</h1>
        <p className="mt-2" style={{ color: 'var(--text-muted)' }}>Page not found</p>
        <Link to="/" className="text-cyan-400 hover:text-cyan-300 mt-4 inline-block">Go home</Link>
      </div>
    </div>
  );
}
