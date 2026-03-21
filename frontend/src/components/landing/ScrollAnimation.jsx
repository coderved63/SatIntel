import { useEffect, useRef, useState, useCallback } from 'react';
import { useScroll, useSpring, motion } from 'framer-motion';

// ── CONFIG ─────────────────────────────────────────────────────
const FRAME_COUNT = 240;
const FRAME_DIR = '/frames';
const BG_COLOR = '#0a0f1a';

const getFramePath = (index) =>
  `${FRAME_DIR}/ezgif-frame-${String(index + 1).padStart(3, '0')}.jpg`;

// Text scenes: fade in → peak → fade out based on scroll %
const TEXT_SCENES = [
  {
    id: 'intro',
    startPct: 0.0,
    peakPct: 0.06,
    endPct: 0.18,
    align: 'center',
    position: 'top',
    heading: 'SatIntel.',
  },
  {
    id: 'cities',
    startPct: 0.20,
    peakPct: 0.30,
    endPct: 0.42,
    align: 'left',
    position: 'center',
    heading: '14 Gujarat\nCities.',
  },
  {
    id: 'ml',
    startPct: 0.44,
    peakPct: 0.54,
    endPct: 0.66,
    align: 'right',
    position: 'center',
    heading: 'ML-Powered\nAnalytics.',
  },
  {
    id: 'action',
    startPct: 0.68,
    peakPct: 0.78,
    endPct: 0.88,
    align: 'center',
    position: 'center',
    heading: 'From Data\nTo Action.',
  },
  {
    id: 'cta',
    startPct: 0.90,
    peakPct: 0.95,
    endPct: 1.0,
    align: 'center',
    position: 'center',
    heading: '',
    isFinal: true,
  },
];

// ── HELPERS ─────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }

function sceneOpacity(scene, progress) {
  const { startPct, peakPct, endPct } = scene;
  if (progress < startPct || progress > endPct) return 0;
  if (progress < peakPct) return clamp((progress - startPct) / (peakPct - startPct), 0, 1);
  return clamp(1 - (progress - peakPct) / (endPct - peakPct), 0, 1);
}

// ── COMPONENT ───────────────────────────────────────────────────
export default function ScrollAnimation({ onComplete }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const framesRef = useRef([]);
  const currentFrameRef = useRef(0);
  const rafRef = useRef(null);

  const [loadedCount, setLoadedCount] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  const { scrollYProgress } = useScroll({ target: containerRef });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 80, damping: 20, mass: 0.5 });

  // ── Preload frames ─────────────────────────────────────────
  useEffect(() => {
    let loaded = 0;
    const images = [];

    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src = getFramePath(i);
      img.onload = () => {
        loaded++;
        setLoadedCount(loaded);
        if (loaded === FRAME_COUNT) setIsReady(true);
      };
      img.onerror = () => {
        loaded++;
        setLoadedCount(loaded);
        if (loaded === FRAME_COUNT) setIsReady(true);
      };
      images.push(img);
    }
    framesRef.current = images;

    return () => { framesRef.current = []; };
  }, []);

  // ── Canvas draw ────────────────────────────────────────────
  const drawFrame = useCallback((index) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const frames = framesRef.current;
    if (!canvas || !ctx || !frames.length) return;

    const frame = frames[clamp(index, 0, frames.length - 1)];
    if (!frame?.complete || frame.naturalWidth === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Object-fit: cover, centered
    const imgW = frame.naturalWidth;
    const imgH = frame.naturalHeight;
    const scale = Math.max(W / imgW, H / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const dx = (W - drawW) / 2;
    const dy = (H - drawH) / 2;

    ctx.drawImage(frame, dx * dpr, dy * dpr, drawW * dpr, drawH * dpr);

    // Fade to background color in the last 15% of scroll
    const progress = index / (FRAME_COUNT - 1);
    if (progress > 0.85) {
      const fadeAlpha = clamp((progress - 0.85) / 0.15, 0, 1);
      ctx.fillStyle = `rgba(10, 14, 26, ${fadeAlpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // ── Canvas resize ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      drawFrame(currentFrameRef.current);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [drawFrame]);

  // ── Scroll → frame sync ────────────────────────────────────
  useEffect(() => {
    if (!isReady) return;

    const unsubscribe = smoothProgress.on('change', (latest) => {
      const targetFrame = Math.round(latest * (FRAME_COUNT - 1));
      if (targetFrame === currentFrameRef.current) return;
      currentFrameRef.current = targetFrame;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => drawFrame(targetFrame));

      // Signal completion at 98%+
      if (latest > 0.98 && !hasCompleted) {
        setHasCompleted(true);
        onComplete?.();
      }
    });

    drawFrame(0);

    return () => {
      unsubscribe();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isReady, drawFrame, smoothProgress, hasCompleted, onComplete]);

  const loadProgress = FRAME_COUNT > 0 ? loadedCount / FRAME_COUNT : 0;

  return (
    <div ref={containerRef} className="relative" style={{ height: '500vh' }}>
      <div
        className="sticky top-0 w-full overflow-hidden"
        style={{ height: '100vh', background: BG_COLOR }}
      >
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ background: BG_COLOR }}
        />

        {/* Loading overlay */}
        {!isReady && (
          <div
            className="absolute inset-0 z-50 flex flex-col items-center justify-center"
            style={{ background: BG_COLOR }}
          >
            <div className="flex flex-col items-center gap-6">
              {/* Spinner */}
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-transparent"
                  style={{ borderTopColor: 'rgba(6,182,212,0.7)' }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              </div>

              {/* Progress bar */}
              <div className="w-48 h-px bg-white/10 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full transition-all duration-100"
                  style={{
                    background: 'linear-gradient(90deg, #06B6D4, #10B981)',
                    width: `${loadProgress * 100}%`,
                  }}
                />
              </div>

              <p className="text-xs tracking-[0.3em] uppercase text-white/30">
                Loading {Math.round(loadProgress * 100)}%
              </p>
            </div>
          </div>
        )}

        {/* Vignette */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(10,15,26,0.8) 100%)',
          }}
        />

        {/* Text overlays */}
        {TEXT_SCENES.filter(s => !s.isFinal).map((scene) => (
          <SceneText key={scene.id} scene={scene} scrollProgress={smoothProgress} />
        ))}

        {/* Scroll down arrow at bottom */}
        <ScrollIndicator scrollProgress={smoothProgress} />
      </div>
    </div>
  );
}

// ── SCENE TEXT ───────────────────────────────────────────────────
function SceneText({ scene, scrollProgress }) {
  const [opacity, setOpacity] = useState(0);
  const [y, setY] = useState(24);

  useEffect(() => {
    const unsubscribe = scrollProgress.on('change', (latest) => {
      const op = sceneOpacity(scene, latest);
      setOpacity(op);
      setY(lerp(30, 0, clamp(
        (latest - scene.startPct) / (scene.peakPct - scene.startPct + 0.001), 0, 1
      )));
    });
    return unsubscribe;
  }, [scrollProgress, scene]);

  const alignClass =
    scene.align === 'center'
      ? 'left-1/2 -translate-x-1/2 text-center items-center'
      : scene.align === 'left'
      ? 'left-[6vw] text-left items-start'
      : 'right-[6vw] text-right items-end';

  const positionStyle = scene.position === 'top'
    ? { top: '12vh', transform: `translateY(${y}px)` }
    : { top: '50%', transform: `translateY(calc(-50% + ${y}px))` };

  if (opacity === 0) return null;

  return (
    <div
      className={`absolute z-20 flex flex-col pointer-events-none ${alignClass}`}
      style={{ opacity, ...positionStyle }}
    >
      <h2
        className="font-black leading-[1.05] tracking-[-0.02em]"
        style={{
          fontSize: 'clamp(2.5rem, 7vw, 5.5rem)',
          color: 'rgba(255,255,255,0.95)',
          textShadow: '0 0 80px rgba(6,182,212,0.2), 0 4px 60px rgba(0,0,0,0.9)',
          whiteSpace: 'pre-line',
        }}
      >
        {scene.heading}
      </h2>
    </div>
  );
}

// ── SCROLL INDICATOR ────────────────────────────────────────────
function ScrollIndicator({ scrollProgress }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const unsubscribe = scrollProgress.on('change', (v) => {
      setVisible(v < 0.05);
    });
    return unsubscribe;
  }, [scrollProgress]);

  return (
    <motion.div
      className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none"
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.5 }}
    >
      <span className="text-[9px] tracking-[0.4em] uppercase text-white/25">
        Scroll
      </span>
      <motion.div
        className="w-px h-10 rounded-full origin-top"
        style={{
          background: 'linear-gradient(to bottom, rgba(6,182,212,0.6), transparent)',
        }}
        animate={{ scaleY: [0.3, 1, 0.3] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}
