import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Navbar } from './components/layout/Navbar';
import type { PageId } from './components/layout/Navbar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { Footer } from './components/layout/Footer';
import { CustomCursor } from './components/ui/CustomCursor';
import { CustomLoader } from './components/ui/CustomLoader';
import type { LoaderMode } from './components/ui/CustomLoader';
import { NeuralParticleField } from './components/ui/NeuralParticleField';
import { PageTransitionWrapper } from './components/ui/PageTransitionWrapper';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import { ActiveBannerBar } from './components/ui/ActiveBannerBar';

// ── Lazy-Loaded Pages for Ultra-Fast Initial Page Load (<100KB payload) ──
const HomePage = lazy(() => import('./components/pages/HomePage').then((m) => ({ default: m.HomePage })));
const AboutPage = lazy(() => import('./components/pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const VisionPage = lazy(() => import('./components/pages/VisionPage').then((m) => ({ default: m.VisionPage })));
const ProductPage = lazy(() => import('./components/pages/ProductPage').then((m) => ({ default: m.ProductPage })));
const DemoPage = lazy(() => import('./components/pages/DemoPage').then((m) => ({ default: m.DemoPage })));
const CareersPage = lazy(() => import('./components/pages/CareersPage').then((m) => ({ default: m.CareersPage })));
const ProgramVideosPage = lazy(() => import('./components/pages/ProgramVideosPage').then((m) => ({ default: m.ProgramVideosPage })));
const SocialPostersPage = lazy(() => import('./components/pages/SocialPostersPage').then((m) => ({ default: m.SocialPostersPage })));
const AdminPage = lazy(() => import('./components/pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const ContactPage = lazy(() => import('./components/pages/ContactPage').then((m) => ({ default: m.ContactPage })));
const StudentDashboardPage = lazy(() => import('./components/pages/StudentDashboardPage').then((m) => ({ default: m.StudentDashboardPage })));
const CourseDetailPage = lazy(() => import('./components/pages/CourseDetailPage').then((m) => ({ default: m.CourseDetailPage })));

import { pathToPage, pageToPath } from './utils/routes';
import './App.css';

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const activePage: PageId = pathToPage(location.pathname);

  // Backward compatibility wrapper for components passing `setActivePage`
  const setActivePage = (page: PageId) => {
    const path = pageToPath(page);
    if (page === 'admin') {
      setLoaderConfig({
        show: true,
        mode: 'admin',
        force: true,
        key: Date.now(),
      });
    }
    navigate(path);
  };

  const [loaderConfig, setLoaderConfig] = useState<{
    show: boolean;
    mode: LoaderMode;
    force: boolean;
    key: number;
  }>(() => {
    const isAdmin = location.pathname.startsWith('/admin');
    return {
      show: true,
      mode: isAdmin ? 'admin' : 'public',
      force: false,
      key: Date.now(),
    };
  });

  // Check if current route is admin
  const isAdminRoute = location.pathname.startsWith('/admin');

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
        {!isAdminRoute && (
          <>
            <Navbar activePage={activePage} setActivePage={setActivePage} />
            <ActiveBannerBar />
          </>
        )}

        {/* Framer Motion AnimatePresence Page Transition Manager */}
        <main className="flex-grow flex flex-col pt-0 pb-20 lg:pb-0">
          <AnimatePresence mode="wait">
            <PageTransitionWrapper pageKey={location.pathname}>
              <Suspense
                fallback={
                  <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full border-2 border-secondary border-t-transparent animate-spin" />
                    <p className="font-mono-data text-xs text-secondary tracking-widest uppercase animate-pulse">
                      ESTABLISHING QUANTUM LINK...
                    </p>
                  </div>
                }
              >
                <Routes location={location} key={location.pathname}>
                  <Route path="/" element={<HomePage setActivePage={setActivePage} />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/vision" element={<VisionPage setActivePage={setActivePage} />} />
                  <Route
                    path="/programs"
                    element={
                      <ProductPage
                        setActivePage={setActivePage}
                        onSelectCourse={(slug) => navigate(`/programs/${slug}`)}
                      />
                    }
                  />
                  <Route
                    path="/programs/:slug"
                    element={
                      <CourseDetailPage
                        setActivePage={setActivePage}
                        onBackToCatalog={() => navigate('/programs')}
                      />
                    }
                  />
                  <Route path="/demos" element={<DemoPage setActivePage={setActivePage} />} />
                  <Route path="/careers" element={<CareersPage setActivePage={setActivePage} />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route
                    path="/videos"
                    element={
                      <ProtectedRoute>
                        <ProgramVideosPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/program-videos" element={<Navigate to="/videos" replace />} />
                  <Route path="/posters" element={<SocialPostersPage />} />
                  
                  {/* Protected Student Portal */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <StudentDashboardPage
                          setActivePage={setActivePage}
                          onSelectCourse={(slug) => navigate(`/programs/${slug}`)}
                        />
                      </ProtectedRoute>
                    }
                  />

                  {/* Command HQ Admin — /admin is the public login screen; /admin/* requires valid JWT */}
                  <Route path="/admin" element={<AdminPage setActivePage={setActivePage} />} />
                  <Route
                    path="/admin/*"
                    element={
                      <AdminRoute>
                        <AdminPage setActivePage={setActivePage} />
                      </AdminRoute>
                    }
                  />

                  {/* Catch-all Fallback to Home */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </PageTransitionWrapper>
          </AnimatePresence>
        </main>

        {/* Common Footer */}
        {!isAdminRoute && <Footer setActivePage={setActivePage} />}

        {/* Native-App Floating Bottom Navigation Dock on Mobile */}
        <MobileBottomNav activePage={activePage} setActivePage={setActivePage} />
      </div>
    </div>
  );
}

export default App;
