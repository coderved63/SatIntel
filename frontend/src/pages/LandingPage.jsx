import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Satellite, Brain, FileText, ArrowRight, Globe, Zap, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ScrollAnimation from '../components/landing/ScrollAnimation';

export default function LandingPage() {
  const [animationComplete, setAnimationComplete] = useState(false);
  const landingRef = useRef(null);

  const handleComplete = () => {
    setAnimationComplete(true);
  };

  // Scroll landing into view smoothly when animation completes
  useEffect(() => {
    if (animationComplete && landingRef.current) {
      setTimeout(() => {
        landingRef.current.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [animationComplete]);

  return (
    <div className="bg-slate-900">
      {/* Scroll-driven frame animation */}
      <ScrollAnimation onComplete={handleComplete} />

      {/* Landing page content — only visible after scroll animation */}
      <motion.div
        ref={landingRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: animationComplete ? 1 : 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ pointerEvents: animationComplete ? 'auto' : 'none' }}
      >
        <div className="min-h-screen bg-slate-900">
          <Navbar />

          {/* Hero */}
          <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-900/20" />
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(6, 182, 212, 0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(16, 185, 129, 0.3) 0%, transparent 50%)'
            }} />

            <div className="relative max-w-7xl mx-auto px-4 py-24 sm:py-32">
              <div className="text-center max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 mb-6">
                  <Satellite className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm text-cyan-400">Powered by Multi-Mission Satellite Data</span>
                </div>

                <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
                  Satellite Intelligence for{' '}
                  <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                    Smarter Cities
                  </span>
                </h1>

                <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
                  Turning Earth observation data into actionable environmental policy.
                  Real satellite data. ML-powered analytics. City-specific action plans.
                </p>

                <div className="flex items-center justify-center gap-4">
                  <Link to="/signup" className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-3 rounded-lg font-medium transition-all text-lg">
                    Get Started <ArrowRight className="h-5 w-5" />
                  </Link>
                  <Link to="/login" className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-8 py-3 rounded-lg font-medium transition-all text-lg border border-slate-600">
                    Login
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="py-20 bg-slate-900/50">
            <div className="max-w-7xl mx-auto px-4">
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    icon: Globe,
                    title: 'Multi-Satellite Data',
                    description: 'MODIS, Sentinel-5P, Landsat, SMAP — harmonized into a unified intelligence layer covering temperature, vegetation, air quality, and soil moisture.',
                    color: 'cyan',
                  },
                  {
                    icon: Brain,
                    title: 'ML-Powered Analytics',
                    description: 'Isolation Forest for anomaly detection, ARIMA for trend prediction, DBSCAN for hotspot clustering. Real science, not dashboards.',
                    color: 'emerald',
                  },
                  {
                    icon: FileText,
                    title: 'Action Plans',
                    description: 'AI-generated environment action plans with specific findings, priority areas, and implementable recommendations for municipal authorities.',
                    color: 'amber',
                  },
                ].map(({ icon: Icon, title, description, color }) => (
                  <div key={title} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 hover:border-slate-600/50 transition-all">
                    <div className={`inline-flex p-3 rounded-lg bg-${color}-500/10 mb-4`}>
                      <Icon className={`h-6 w-6 text-${color}-400`} />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
                    <p className="text-slate-400 leading-relaxed">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className="py-16 border-t border-slate-800">
            <div className="max-w-7xl mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                {[
                  { value: '4+', label: 'Satellite Missions' },
                  { value: '14', label: 'Gujarat Cities' },
                  { value: '8', label: 'Environmental Parameters' },
                  { value: '2yr', label: 'Data Coverage' },
                ].map(({ value, label }) => (
                  <div key={label}>
                    <p className="text-3xl font-bold text-cyan-400">{value}</p>
                    <p className="text-sm text-slate-500 mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Tech Stack */}
          <section className="py-16 border-t border-slate-800">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Built With</h2>
              <p className="text-slate-500 mb-8">Production-grade tools for satellite environmental intelligence</p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                {['Google Earth Engine', 'MODIS', 'Sentinel-5P', 'NASA SMAP', 'scikit-learn', 'FastAPI', 'React', 'MapLibre + Deck.gl', 'ARIMA', 'DBSCAN'].map((tech) => (
                  <span key={tech} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-full text-sm text-slate-300">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <Footer />
        </div>
      </motion.div>
    </div>
  );
}
