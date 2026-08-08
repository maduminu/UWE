import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Navbar } from './components/layout/Navbar';
import type { PageId } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { CustomCursor } from './components/ui/CustomCursor';
import { NeuralParticleField } from './components/ui/NeuralParticleField';
import { PageTransitionWrapper } from './components/ui/PageTransitionWrapper';
import { HomePage } from './components/pages/HomePage';
import { AboutPage } from './components/pages/AboutPage';
import { VisionPage } from './components/pages/VisionPage';
import { ProductPage } from './components/pages/ProductPage';
import { ContactPage } from './components/pages/ContactPage';
import './App.css';

function App() {
  const [activePage, setActivePage] = useState<PageId>('home');

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
      case 'contact':
        return <ContactPage />;
      default:
        return <HomePage setActivePage={setActivePage} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0E14] text-on-surface relative">
      {/* Permanent Global Fixed Neural Particle Background (Runs 60fps across all pages) */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-70">
        <NeuralParticleField />
      </div>

      {/* Sci-Fi Tactical Custom Cursor with Framer Motion Spring */}
      <CustomCursor />

      {/* Main Content Viewport Layer */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top Navigation with Shared Layout Glow */}
        <Navbar activePage={activePage} setActivePage={setActivePage} />

        {/* Framer Motion AnimatePresence Page Transition Manager */}
        <main className="flex-grow flex flex-col pt-0">
          <AnimatePresence mode="wait">
            <PageTransitionWrapper pageKey={activePage}>
              {renderPage()}
            </PageTransitionWrapper>
          </AnimatePresence>
        </main>

        {/* Common Footer */}
        <Footer setActivePage={setActivePage} />
      </div>
    </div>
  );
}

export default App;
