import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-slate-700">404</h1>
        <p className="text-slate-400 mt-2">Page not found</p>
        <Link to="/" className="text-cyan-400 hover:text-cyan-300 mt-4 inline-block">Go home</Link>
      </div>
    </div>
  );
}
