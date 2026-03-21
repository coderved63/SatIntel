import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Satellite, Brain, FileText, ArrowRight, MapPin, BarChart3,
  Thermometer, Leaf, Wind, Droplets, TreePine, Globe,
  ChevronDown, Sparkles, Menu, X,
  Github, Linkedin,
} from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import ScrollAnimation from '../components/landing/ScrollAnimation';

const F = { fontFamily: "'Space Grotesk', sans-serif" };
const BG = '#0A0E1A';
const BG2 = '#111827';
const CARD = '#1A1F35';
const BORDER = '#1E293B';

/* ── helpers ───────────────────────────────────────── */
function useCounter(end, dur = 1600, go = false) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!go) return;
    const t = parseInt(end);
    if (isNaN(t)) { setN(end); return; }
    const step = Math.max(1, Math.floor(t / (dur / 16)));
    let c = 0;
    const id = setInterval(() => { c += step; if (c >= t) { setN(t); clearInterval(id); } else setN(c); }, 16);
    return () => clearInterval(id);
  }, [end, dur, go]);
  return n;
}

function AnimCard({ children, idx = 0, className = '' }) {
  const r = useRef(null);
  const v = useInView(r, { once: true, margin: '-60px' });
  return (
    <motion.div ref={r} initial={{ opacity: 0, y: 20 }} animate={v ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.4, delay: idx * 0.12 }} className={className}>
      {children}
    </motion.div>
  );
}

/* ── stat bar item (avoids hook-in-map) ─────────────── */
function StatBarItem({ value, suffix = '', label, idx, go, borderStyle }) {
  const n = useCounter(value, 1600, go);
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={go ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.4, delay: idx * 0.1 }}
      className="text-center py-6" style={borderStyle}>
      <p className="text-4xl sm:text-5xl font-extrabold text-slate-50" style={F}>{n}{suffix}</p>
      <p className="text-sm mt-2 text-slate-500">{label}</p>
    </motion.div>
  );
}

function SectionLabel({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400 mb-3" style={F}>{children}</p>;
}

function SectionHead({ children }) {
  return <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-slate-50 mb-4" style={F}>{children}</h2>;
}

/* ══════════════════════════════════════════════════════
   MAIN
   ══════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [done, setDone] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const heroRef = useRef(null);

  /* stats observers */
  const statsRef = useRef(null);
  const statsVis = useInView(statsRef, { once: true, margin: '-80px' });

  // When animation completes, snap the hero into full view on the next scroll
  useEffect(() => {
    if (!done || !heroRef.current) return;

    const handleWheel = (e) => {
      if (e.deltaY > 0) {
        heroRef.current.scrollIntoView({ behavior: 'smooth' });
        window.removeEventListener('wheel', handleWheel);
        window.removeEventListener('touchmove', handleTouch);
      }
    };

    let touchStartY = 0;
    const handleTouchStart = (e) => { touchStartY = e.touches[0].clientY; };
    const handleTouch = (e) => {
      if (touchStartY - e.touches[0].clientY > 30) {
        heroRef.current.scrollIntoView({ behavior: 'smooth' });
        window.removeEventListener('wheel', handleWheel);
        window.removeEventListener('touchmove', handleTouch);
        window.removeEventListener('touchstart', handleTouchStart);
      }
    };

    // Small delay so it doesn't trigger on the same scroll that completed the animation
    const timer = setTimeout(() => {
      window.addEventListener('wheel', handleWheel, { passive: true });
      window.addEventListener('touchstart', handleTouchStart, { passive: true });
      window.addEventListener('touchmove', handleTouch, { passive: true });
    }, 200);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouch);
    };
  }, [done]);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Data', href: '#data' },
    { label: 'About', href: '#about' },
  ];

  return (
    <div style={{ background: BG }}>
      {/* ── SCROLL ANIMATION (unchanged) ── */}
      <ScrollAnimation onComplete={() => setDone(true)} />

      {/* ── POST-SCROLL CONTENT ── */}
      <motion.div
        ref={heroRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: done ? 1 : 0 }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
        style={{ pointerEvents: done ? 'auto' : 'none' }}
      >

        {/* ══════════ 1. NAVBAR — centered floating pill ══════════ */}
        <nav className="sticky top-0 z-50 flex justify-center pt-5 px-4">
          <div className="flex items-center gap-1 px-2 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 pl-2 pr-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                <Satellite className="h-4 w-4 text-white" />
              </div>
            </Link>

            {/* Links */}
            <div className="hidden md:flex items-center">
              {navLinks.map(l => (
                <a key={l.label} href={l.href} className="text-sm text-slate-300 hover:text-white transition-colors duration-200 px-4 py-1.5">{l.label}</a>
              ))}
            </div>

            {/* Sign up */}
            <Link to="/signup" className="text-sm font-medium px-5 py-2 rounded-full bg-white text-[#0A0E1A] hover:bg-slate-100 transition-all duration-200 ml-2" style={F}>
              Sign up
            </Link>

            {/* Mobile toggle */}
            <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white transition-colors ml-1">
              {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile dropdown */}
          {mobileMenu && (
            <div className="absolute top-20 left-4 right-4 rounded-2xl px-6 py-4 space-y-3 z-50" style={{ background: 'rgba(10,14,26,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {navLinks.map(l => (
                <a key={l.label} href={l.href} onClick={() => setMobileMenu(false)} className="block text-sm text-slate-300 hover:text-white transition-colors">{l.label}</a>
              ))}
              <Link to="/login" onClick={() => setMobileMenu(false)} className="block text-sm text-slate-300 hover:text-white transition-colors">Log in</Link>
            </div>
          )}
        </nav>

        {/* ══════════ 2. HERO — full viewport, centered ══════════ */}
        <section className="relative overflow-hidden min-h-[calc(100vh-80px)] flex flex-col" style={{ background: BG }}>
          {/* Grid background */}
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />

          {/* Corner + decorations */}
          <div className="absolute top-12 left-8 text-slate-700 text-lg font-light select-none hidden lg:block">+</div>
          <div className="absolute top-12 right-8 text-slate-700 text-lg font-light select-none hidden lg:block">+</div>
          <div className="absolute bottom-32 left-8 text-slate-700 text-lg font-light select-none hidden lg:block">+</div>
          <div className="absolute bottom-32 right-8 text-slate-700 text-lg font-light select-none hidden lg:block">+</div>

          {/* Tiny star dots scattered */}
          {[
            { top: '15%', left: '10%' }, { top: '20%', right: '15%' }, { top: '35%', left: '5%' },
            { top: '40%', right: '25%' }, { top: '10%', left: '40%' }, { top: '25%', right: '8%' },
            { top: '50%', left: '20%' }, { top: '8%', right: '40%' },
          ].map((pos, i) => (
            <div key={i} className="absolute w-[1.5px] h-[1.5px] rounded-full bg-slate-500/50 hidden lg:block" style={pos} />
          ))}

          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-8 pb-0 relative z-10">
            {/* Trust badge */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={done ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 }} className="mb-10">
              <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Sparkles className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-sm text-slate-300">Trusted by forward-thinking cities.</span>
              </div>
            </motion.div>

            {/* Headline — large, elegant, light weight */}
            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={done ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.3, duration: 0.6 }}
              className="mb-7 text-white max-w-4xl"
              style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(2.5rem, 6.5vw, 5rem)', fontWeight: 400, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              Launch Environmental<br />
              Intelligence Into Orbit
            </motion.h1>

            {/* Subtitle */}
            <motion.p initial={{ opacity: 0, y: 16 }} animate={done ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.45 }}
              className="text-base sm:text-[17px] leading-relaxed max-w-[580px] mx-auto mb-10 text-slate-400">
              Turning real satellite data from NASA & ESA into actionable environmental policy for smart cities — fast, seamless, and limitless.
            </motion.p>

            {/* CTA buttons */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={done ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.6 }} className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-12">
              <Link to="/signup" className="inline-flex items-center justify-center font-medium text-base px-8 py-3.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35" style={F}>
                Get Started for Free
              </Link>
              <Link to="/login" className="inline-flex items-center justify-center font-medium text-base px-8 py-3.5 rounded-full text-slate-800 bg-white hover:bg-slate-100 transition-all duration-200" style={F}>
                Explore Features
              </Link>
            </motion.div>
          </div>

          {/* Hero image area — satellite visual at bottom, bleeding off edge */}
          <motion.div initial={{ opacity: 0, y: 60 }} animate={done ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.5, duration: 1 }}
            className="relative w-full mt-auto" style={{ height: 'clamp(200px, 35vw, 420px)' }}>

            {/* Blue Earth glow at bottom-center */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full"
              style={{ background: 'radial-gradient(ellipse at center bottom, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0.06) 40%, transparent 70%)' }} />

            {/* Satellite/space station visual — CSS-only representation */}
            <div className="absolute inset-0 flex items-end justify-center overflow-hidden">
              {/* Large curved Earth edge */}
              <div className="absolute bottom-[-60%] left-1/2 -translate-x-1/2 rounded-full"
                style={{ width: '140%', aspectRatio: '1', background: 'radial-gradient(circle at 50% 20%, rgba(59,130,246,0.12) 0%, rgba(30,60,120,0.08) 30%, transparent 55%)', border: '1px solid rgba(59,130,246,0.08)' }} />

              {/* Satellite structure — central hub */}
              <div className="relative mb-[-2%] z-10">
                <div className="relative">
                  {/* Main body */}
                  <div className="w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(148,163,184,0.15) 0%, rgba(30,41,59,0.4) 50%, rgba(10,14,26,0.6) 100%)', border: '1px solid rgba(148,163,184,0.1)', boxShadow: '0 0 80px rgba(59,130,246,0.08), inset 0 -20px 60px rgba(59,130,246,0.04)' }}>
                    <div className="w-20 h-20 sm:w-28 sm:h-28 lg:w-36 lg:h-36 rounded-full flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, rgba(148,163,184,0.1), rgba(30,41,59,0.3))', border: '1px solid rgba(148,163,184,0.08)' }}>
                      <Globe className="w-10 h-10 sm:w-16 sm:h-16 lg:w-20 lg:h-20 text-slate-400/40" />
                    </div>
                  </div>

                  {/* Solar panels — left */}
                  <div className="absolute top-1/2 -translate-y-1/2 right-full mr-2 sm:mr-3 hidden sm:flex items-center gap-1">
                    <div className="w-16 sm:w-24 lg:w-36 h-8 sm:h-12 lg:h-16 rounded-sm" style={{ background: 'linear-gradient(90deg, rgba(59,130,246,0.12), rgba(59,130,246,0.06))', border: '1px solid rgba(59,130,246,0.1)', boxShadow: '0 0 30px rgba(59,130,246,0.05)' }}>
                      <div className="w-full h-full opacity-30" style={{ backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '8px 8px' }} />
                    </div>
                  </div>

                  {/* Solar panels — right */}
                  <div className="absolute top-1/2 -translate-y-1/2 left-full ml-2 sm:ml-3 hidden sm:flex items-center gap-1">
                    <div className="w-16 sm:w-24 lg:w-36 h-8 sm:h-12 lg:h-16 rounded-sm" style={{ background: 'linear-gradient(270deg, rgba(59,130,246,0.12), rgba(59,130,246,0.06))', border: '1px solid rgba(59,130,246,0.1)', boxShadow: '0 0 30px rgba(59,130,246,0.05)' }}>
                      <div className="w-full h-full opacity-30" style={{ backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '8px 8px' }} />
                    </div>
                  </div>

                  {/* Orbiting element */}
                  <div className="absolute -inset-6 sm:-inset-10 lg:-inset-14 rounded-full animate-[spin_25s_linear_infinite]" style={{ border: '1px dashed rgba(59,130,246,0.12)' }}>
                    <Satellite className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 text-blue-400/60" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom gradient fade to blend into next section */}
            <div className="absolute bottom-0 left-0 right-0 h-20" style={{ background: `linear-gradient(to top, ${BG2}, transparent)` }} />
          </motion.div>
        </section>

        {/* ══════════ 3. STATS BAR ══════════ */}
        <section ref={statsRef} className="py-16 border-t border-b" style={{ background: BG2, borderColor: BORDER }}>
          <div className="max-w-[900px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4">
            {[
              { value: 14, suffix: '', label: 'Gujarat Cities' },
              { value: 9, suffix: '', label: 'Parameters' },
              { value: 4, suffix: '', label: 'Satellite Missions' },
              { value: 4, suffix: '', label: 'ML Models' },
            ].map((s, i) => (
              <StatBarItem key={s.label} {...s} idx={i} go={statsVis} borderStyle={i < 3 ? { borderRight: `1px solid ${BORDER}` } : {}} />
            ))}
          </div>
        </section>

        {/* ══════════ 4. THE PROBLEM — editorial layout ══════════ */}
        <section className="py-28 relative overflow-hidden" style={{ background: BG }}>
          <div className="max-w-[1200px] mx-auto px-6">
            {/* Two-column: big statement left, details right */}
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-start mb-20">
              <AnimCard idx={0}>
                <div>
                  <SectionLabel>The Problem</SectionLabel>
                  <h2 className="text-4xl sm:text-5xl font-bold text-slate-50 leading-[1.1] mb-6" style={F}>
                    Cities can't see<br />what satellites can.
                  </h2>
                  <p className="text-lg text-slate-400 leading-relaxed max-w-md">
                    Ground sensors cover less than 1% of a city. Heat islands, pollution spikes, and vegetation loss go undetected — until it's a crisis.
                  </p>
                </div>
              </AnimCard>

              <div className="space-y-6 lg:pt-14">
                {[
                  { num: '4–8°C', label: 'hotter in urban cores vs. rural areas — invisible without thermal satellite bands.' },
                  { num: '3–5%', label: 'annual green cover loss in expanding Indian cities, missed by traditional surveys.' },
                  { num: '<1%', label: 'of city area covered by ground-based air quality stations. The rest is guesswork.' },
                ].map(({ num, label }, i) => (
                  <AnimCard key={num} idx={i + 1}>
                    <div className="flex gap-5 items-start">
                      <span className="text-3xl sm:text-4xl font-bold text-blue-400 shrink-0 w-24 text-right tabular-nums" style={F}>{num}</span>
                      <div className="pt-2">
                        <div className="w-8 h-px mb-3" style={{ background: 'rgba(59,130,246,0.3)' }} />
                        <p className="text-sm text-slate-400 leading-relaxed">{label}</p>
                      </div>
                    </div>
                  </AnimCard>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ 5. THE SOLUTION — horizontal flow ══════════ */}
        <section id="features" className="py-28 relative overflow-hidden" style={{ background: BG2 }}>
          {/* Subtle horizontal line */}
          <div className="absolute top-1/2 left-0 right-0 h-px hidden lg:block" style={{ background: `linear-gradient(90deg, transparent, ${BORDER}, transparent)` }} />

          <div className="max-w-[1200px] mx-auto px-6">
            <div className="max-w-xl mb-16">
              <SectionLabel>How It Works</SectionLabel>
              <h2 className="text-4xl sm:text-5xl font-bold text-slate-50 leading-[1.1] mb-5" style={F}>
                Three agents.<br />One pipeline.
              </h2>
              <p className="text-base text-slate-400 leading-relaxed">
                A fully automated chain — from raw satellite observations to a government-ready action plan.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-0 md:gap-0">
              {[
                { num: '01', title: 'Ingest', desc: 'Data Agent pulls from MODIS, Sentinel-5P, SMAP, and Landsat. Harmonizes everything to a 1 km grid across 9 parameters.', accent: '#3B82F6' },
                { num: '02', title: 'Analyze', desc: 'Analysis Agent runs four ML models — anomaly detection, time-series forecasting, spatial clustering, and trend analysis.', accent: '#22D3EE' },
                { num: '03', title: 'Act', desc: 'Action Plan Agent generates a municipal report: findings, risk matrix, priority zones, budget estimates, and KPIs.', accent: '#8B5CF6' },
              ].map(({ num, title, desc, accent }, i) => (
                <AnimCard key={num} idx={i}>
                  <div className="relative py-10 md:px-8" style={i === 0 ? { paddingLeft: 0 } : i === 2 ? { paddingRight: 0 } : {}}>
                    {/* Vertical divider between columns */}
                    {i < 2 && <div className="absolute top-0 right-0 bottom-0 w-px hidden md:block" style={{ background: BORDER }} />}
                    {/* Horizontal divider on mobile */}
                    {i < 2 && <div className="absolute bottom-0 left-0 right-0 h-px md:hidden" style={{ background: BORDER }} />}

                    <span className="text-6xl font-bold block mb-4" style={{ color: accent, opacity: 0.15, ...F }}>{num}</span>
                    <h3 className="text-2xl font-bold text-slate-50 mb-3" style={F}>{title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
                  </div>
                </AnimCard>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ 6. DATA SOURCES ══════════ */}
        <section id="data" className="py-24" style={{ background: BG }}>
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <SectionLabel>Data Sources</SectionLabel>
              <SectionHead>4 Satellite Missions, 9 Parameters</SectionHead>
            </div>
            <div className="space-y-3 max-w-4xl mx-auto">
              {[
                { name: 'MODIS Terra', agency: 'NASA', params: 'LST, NDVI', res: '1 km / 8-day', clr: '#EF4444' },
                { name: 'Sentinel-5P', agency: 'ESA', params: 'NO₂, SO₂, CO, O₃, Aerosol', res: '7 km / daily', clr: '#8B5CF6' },
                { name: 'Landsat 8/9', agency: 'NASA/USGS', params: 'Land Use Change', res: '30 m / 16-day', clr: '#10B981' },
                { name: 'SMAP', agency: 'NASA', params: 'Soil Moisture', res: '9 km / daily', clr: '#3B82F6' },
              ].map(({ name, agency, params, res, clr }, i) => (
                <AnimCard key={name} idx={i}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl p-5" style={{ background: i % 2 === 0 ? CARD : BG2, border: `1px solid ${BORDER}` }}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${clr}15` }}>
                        <Satellite className="w-5 h-5" style={{ color: clr }} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-50" style={F}>{name}</p>
                        <p className="text-sm text-slate-500">{params}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ color: '#FB923C', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.2)' }}>{res}</span>
                      <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ color: '#22D3EE', background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)' }}>{agency}</span>
                    </div>
                  </div>
                </AnimCard>
              ))}
            </div>
          </div>
        </section>


        {/* ══════════ 14. FOOTER ══════════ */}
        <footer id="about" className="py-16 px-6 border-t" style={{ background: BG, borderColor: BORDER }}>
          <div className="max-w-[1200px] mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
              {/* Col 1 — Logo */}
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                    <Satellite className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-lg font-bold text-white" style={F}>SatIntel</span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">Satellite Environmental Intelligence for Smart Cities</p>
              </div>
              {/* Col 2 — Quick Links */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400 mb-4">Quick Links</p>
                <div className="space-y-2.5">
                  {[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Analytics', to: '/analytics' }, { label: 'Action Plan', to: '/action-plan' }, { label: 'Green Gap', to: '/green-gap' }].map(l => (
                    <Link key={l.to} to={l.to} className="block text-sm text-slate-500 hover:text-slate-200 transition-colors">{l.label}</Link>
                  ))}
                </div>
              </div>
              {/* Col 3 — Tech */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400 mb-4">Technology</p>
                <div className="space-y-2.5">
                  {['React 19', 'FastAPI', 'MapLibre GL', 'Deck.gl', 'Google Earth Engine'].map(t => (
                    <p key={t} className="text-sm text-slate-500">{t}</p>
                  ))}
                </div>
              </div>
              {/* Col 4 — Connect */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400 mb-4">Connect</p>
                <div className="flex items-center gap-3">
                  <a href="https://github.com/coderved63/Satellite" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-colors" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                    <Github className="w-4 h-4" />
                  </a>
                  <a href="#" className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-colors" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                    <Linkedin className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            <div className="border-t pt-8 text-center" style={{ borderColor: BORDER }}>
              <p className="text-sm text-slate-600">Built for AETRIX 2026 · PDEU Gandhinagar · PS-4: Sustainability & Environment</p>
            </div>
          </div>
        </footer>

      </motion.div>
    </div>
  );
}
