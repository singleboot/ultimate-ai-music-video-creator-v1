import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { AnimatePresence } from 'framer-motion';
import Lenis from 'lenis';
import { Toaster } from 'react-hot-toast';
import ParticleBackground from '../components/shared/ParticleBackground';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const lenisRef = useRef(null);
  const isWorkspace = router.pathname === '/workspace';

  useEffect(() => {
    if (!isWorkspace) return;
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 2,
    });
    lenisRef.current = lenis;
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => { lenis.destroy(); };
  }, [isWorkspace]);

  return (
    <>
      <div className="vignette" style={{ zIndex: 9999, position: 'fixed' }} />
      <ParticleBackground />
      <AnimatePresence mode="wait">
        <Component {...pageProps} />
      </AnimatePresence>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(11, 4, 23, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(176, 38, 255, 0.3)',
            color: '#ffffff',
            borderRadius: '12px',
          },
          success: { iconTheme: { primary: '#63d4ff', secondary: '#05010d' } },
          error: { iconTheme: { primary: '#ff3bd4', secondary: '#05010d' } },
        }}
      />
    </>
  );
}

export default MyApp;