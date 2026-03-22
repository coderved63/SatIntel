import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Loader2, Satellite, Mail, Lock, ArrowLeft } from 'lucide-react';

const F = { fontFamily: "'Space Grotesk', sans-serif" };

const inputStyle = { background: 'var(--bg-input)', border: '1px solid var(--bg-input-border)', color: 'var(--text-primary)' };
const onFocus = (e) => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.12)'; };
const onBlur = (e) => { e.target.style.borderColor = 'var(--bg-input-border)'; e.target.style.boxShadow = 'none'; };

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>

      {/* ── LEFT PANEL — quote + texture ── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col justify-between p-10" style={{ background: '#0A0E1A' }}>
        {/* Diagonal grid texture */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.03) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.03) 75%, transparent 75%)',
          backgroundSize: '40px 40px',
        }} />
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(10,14,26,0.3) 0%, rgba(59,130,246,0.06) 40%, rgba(139,92,246,0.08) 70%, rgba(10,14,26,0.6) 100%)' }} />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3" style={{ background: 'linear-gradient(to top, rgba(10,14,26,0.9), transparent)' }} />

        {/* Back to home */}
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>

        {/* Quote */}
        <div className="relative z-10">
          <div className="w-12 h-1 bg-blue-500 rounded-full mb-8" />
          <blockquote className="text-3xl sm:text-4xl font-bold italic text-white/90 leading-snug max-w-lg" style={{ fontFamily: 'Georgia, serif' }}>
            "Turning free satellite data into municipal action plans — one click."
          </blockquote>
          <p className="text-sm text-slate-500 mt-6 uppercase tracking-[0.15em]">
            SatIntel — Satellite Environmental Intelligence
          </p>
        </div>

        {/* Brand at bottom */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center">
            <Satellite className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold text-white/70" style={F}>SatIntel</span>
        </div>
      </div>

      {/* ── RIGHT PANEL — form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative" style={{ background: 'var(--bg-secondary)' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-sm"
        >
          {/* Mobile back link */}
          <Link to="/" className="lg:hidden inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)', ...F }}>Welcome back</h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>Sign in to your account</p>

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-faint)' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="w-full rounded-xl pl-11 pr-4 py-3.5 outline-none transition-all duration-200 text-sm"
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-faint)' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full rounded-xl pl-11 pr-4 py-3.5 outline-none transition-all duration-200 text-sm"
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full font-semibold rounded-full py-3.5 transition-all duration-200 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 20px rgba(59,130,246,0.35)', ...F }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Create one
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
