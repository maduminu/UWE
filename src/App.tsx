import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Navbar } from './components/layout/Navbar';
import type { PageId } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { CustomCursor } from './components/ui/CustomCursor';
import { CustomLoader } from './components/ui/CustomLoader';
import type { LoaderMode } from './components/ui/CustomLoader';
import { NeuralParticleField } from './components/ui/NeuralParticleField';
import { PageTransitionWrapper } from './components/ui/PageTransitionWrapper';
import { HomePage } from './components/pages/HomePage';
import { AboutPage } from './components/pages/AboutPage';
import { VisionPage } from './components/pages/VisionPage';
import { ProductPage } from './components/pages/ProductPage';
import { DemoPage } from './components/pages/DemoPage';
import { CareersPage } from './components/pages/CareersPage';
import { ProgramVideosPage } from './components/pages/ProgramVideosPage';
import { SocialPostersPage } from './components/pages/SocialPostersPage';
import { AdminPage } from './components/pages/AdminPage';
import { ContactPage } from './components/pages/ContactPage';
import './App.css';

const validPages: PageId[] = [
  'home',
  'about',
  'vision',
  'product',
  'demos',
  'careers',
  'program-videos',
  'posters',
  'admin',
  'contact',
];

const getInitialPage = (): PageId => {
  const hash = window.location.hash.replace('#', '') as PageId;
  if (validPages.includes(hash)) return hash;
  const saved = localStorage.getItem('uwe_current_page') as PageId;
  if (validPages.includes(saved)) return saved;
  return 'home';
};

function App() {
  const [activePage, setActivePageState] = useState<PageId>(getInitialPage);
  const [loaderConfig, setLoaderConfig] = useState<{
    show: boolean;
    mode: LoaderMode;
    force: boolean;
    key: number;
  }>(() => {
    const initial = getInitialPage();
    return {
      show: true,
      mode: initial === 'admin' ? 'admin' : 'public',
      force: false,
      key: Date.now(),
    };
  });

  // Keep URL hash and localStorage in sync with active page
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as PageId;
      const targetPage = validPages.includes(hash) ? hash : 'home';
      setActivePageState(targetPage);
      localStorage.setItem('uwe_current_page', targetPage);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const setActivePage = (page: PageId) => {
    if (page === activePage) return;

    // If entering the Admin panel from another page, trigger the Command HQ loader!
    if (page === 'admin') {
      setLoaderConfig({
        show: true,
        mode: 'admin',
        force: true,
        key: Date.now(),
      });
    }

    setActivePageState(page);
    window.location.hash = page === 'home' ? '' : page;
    localStorage.setItem('uwe_current_page', page);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <HomePage setActivePage={setActivePage} />;
      case 'about':
        return <AboutPage />;
      case 'vision':
        return <VisionPage setActivePage={setActivePage} />;
      case 'product':
        return <ProductPage setActivePage={setActivePage} />;
      case 'demos':
        return <DemoPage setActivePage={setActivePage} />;
      case 'careers':
        return <CareersPage setActivePage={setActivePage} />;
      case 'program-videos':
        return <ProgramVideosPage />;
      case 'posters':
        return <SocialPostersPage />;
      case 'admin':
        return <AdminPage setActivePage={setActivePage} />;
      case 'contact':
        return <ContactPage />;
      default:
        return <HomePage setActivePage={setActivePage} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0E14] text-on-surface relative">
      {/* Tactical Sci-Fi Custom Preloader (Context-Aware: Public Portal vs Command HQ) */}
      {loaderConfig.show && (
        <CustomLoader
          key={loaderConfig.key}
          mode={loaderConfig.mode}
          forceShow={loaderConfig.force}
          onComplete={() =>
            setLoaderConfig((prev) => ({ ...prev, show: false, force: false }))
          }
        />
      )}

      {/* Permanent Global Fixed Neural Particle Background (Runs 60fps across all pages) */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-70">
        <NeuralParticleField />
      </div>

      {/* Sci-Fi Tactical Custom Cursor with Framer Motion Spring */}
      <CustomCursor />

      {/* Main Content Viewport Layer */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top Navigation with Shared Layout Glow */}
        {activePage !== 'admin' && (
          <Navbar activePage={activePage} setActivePage={setActivePage} />
        )}

        {/* Framer Motion AnimatePresence Page Transition Manager */}
        <main className="flex-grow flex flex-col pt-0">
          <AnimatePresence mode="wait">
            <PageTransitionWrapper pageKey={activePage}>
              {renderPage()}
            </PageTransitionWrapper>
          </AnimatePresence>
        </main>

        {/* Common Footer */}
        {activePage !== 'admin' && <Footer setActivePage={setActivePage} />}
      </div>
    </div>
  );
}

export default App;
