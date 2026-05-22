import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { GlobalFolderProvider } from './contexts/GlobalFolderContext';
import { PredictedLinksProvider } from './contexts/PredictedLinksContext';
import { AppLayout } from './components/layout/AppLayout';
import { ChakraAppProvider } from './providers/ChakraAppProvider';
import { StoreProvider } from './providers/StoreProvider';
import { pageLoaders } from './pages/pageLoaders';
import { RoutePageSkeleton } from './components/skeletons/RoutePageSkeleton';

const LoginPage = lazy(pageLoaders.login);
const LandingPage = lazy(pageLoaders.landing);
const FoldersPage = lazy(pageLoaders.folders);
const GraphPage = lazy(pageLoaders.graph);
const ChatPage = lazy(pageLoaders.chat);
const UploadPage = lazy(pageLoaders.upload);
const VisualizeDataPage = lazy(pageLoaders.visualize);
const BrowsePage = lazy(pageLoaders.browse);
const MLPredictionPage = lazy(pageLoaders.mlPrediction);
const AnalyticsPage = lazy(pageLoaders.analytics);
const SettingsPage = lazy(pageLoaders.settings);
const HelpPage = lazy(pageLoaders.help);
const CanvasPage = lazy(() => import('./pages/canvas/CanvasPage'));

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/folders" replace />;
  return children;
}

function HomeRoute() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/folders" replace />;
  return (
    <Suspense fallback={<RoutePageSkeleton pathname="/" />}>
      <LandingPage />
    </Suspense>
  );
}
import { motion, AnimatePresence } from 'framer-motion';

function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="flex flex-col h-full w-full overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

function AppContent() {
  const location = useLocation();
  const protectedFallback = <RoutePageSkeleton pathname={location.pathname} />;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location}>
        {/* Public Routes */}
        <Route
          path="/"
          element={<HomeRoute />}
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Suspense fallback={<RoutePageSkeleton pathname="/login" />}>
                <LoginPage />
              </Suspense>
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/folders"
          element={
            <ProtectedRoute>
              <StoreProvider>
                <SidebarProvider>
                  <GlobalFolderProvider>
                    <PredictedLinksProvider>
                      <AppLayout>
                        <Suspense fallback={protectedFallback}>
                          <PageTransition><FoldersPage /></PageTransition>
                        </Suspense>
                      </AppLayout>
                    </PredictedLinksProvider>
                  </GlobalFolderProvider>
                </SidebarProvider>
              </StoreProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/graph/*"
          element={
            <ProtectedRoute>
              <StoreProvider>
                <SidebarProvider>
                  <GlobalFolderProvider>
                    <PredictedLinksProvider>
                      <AppLayout>
                        <Suspense fallback={protectedFallback}>
                          <PageTransition><GraphPage /></PageTransition>
                        </Suspense>
                      </AppLayout>
                    </PredictedLinksProvider>
                  </GlobalFolderProvider>
                </SidebarProvider>
              </StoreProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/visualize/*"
          element={
            <ProtectedRoute>
              <StoreProvider>
                <SidebarProvider>
                  <GlobalFolderProvider>
                    <PredictedLinksProvider>
                      <AppLayout>
                        <Suspense fallback={protectedFallback}>
                          <PageTransition><VisualizeDataPage /></PageTransition>
                        </Suspense>
                      </AppLayout>
                    </PredictedLinksProvider>
                  </GlobalFolderProvider>
                </SidebarProvider>
              </StoreProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <StoreProvider>
                <SidebarProvider>
                  <GlobalFolderProvider>
                    <PredictedLinksProvider>
                      <AppLayout>
                        <Suspense fallback={protectedFallback}>
                          <PageTransition><ChatPage /></PageTransition>
                        </Suspense>
                      </AppLayout>
                    </PredictedLinksProvider>
                  </GlobalFolderProvider>
                </SidebarProvider>
              </StoreProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <StoreProvider>
                <SidebarProvider>
                  <GlobalFolderProvider>
                    <PredictedLinksProvider>
                      <AppLayout>
                        <Suspense fallback={protectedFallback}>
                          <PageTransition><UploadPage /></PageTransition>
                        </Suspense>
                      </AppLayout>
                    </PredictedLinksProvider>
                  </GlobalFolderProvider>
                </SidebarProvider>
              </StoreProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/browse"
          element={
            <ProtectedRoute>
              <StoreProvider>
                <SidebarProvider>
                  <GlobalFolderProvider>
                    <PredictedLinksProvider>
                      <AppLayout>
                        <Suspense fallback={protectedFallback}>
                          <PageTransition><BrowsePage /></PageTransition>
                        </Suspense>
                      </AppLayout>
                    </PredictedLinksProvider>
                  </GlobalFolderProvider>
                </SidebarProvider>
              </StoreProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ml-prediction"
          element={
            <ProtectedRoute>
              <StoreProvider>
                <SidebarProvider>
                  <GlobalFolderProvider>
                    <PredictedLinksProvider>
                      <AppLayout>
                        <Suspense fallback={protectedFallback}>
                          <PageTransition><MLPredictionPage /></PageTransition>
                        </Suspense>
                      </AppLayout>
                    </PredictedLinksProvider>
                  </GlobalFolderProvider>
                </SidebarProvider>
              </StoreProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <StoreProvider>
                <SidebarProvider>
                  <GlobalFolderProvider>
                    <PredictedLinksProvider>
                      <AppLayout>
                        <Suspense fallback={protectedFallback}>
                          <PageTransition><AnalyticsPage /></PageTransition>
                        </Suspense>
                      </AppLayout>
                    </PredictedLinksProvider>
                  </GlobalFolderProvider>
                </SidebarProvider>
              </StoreProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <StoreProvider>
                <SidebarProvider>
                  <GlobalFolderProvider>
                    <PredictedLinksProvider>
                      <AppLayout>
                        <Suspense fallback={protectedFallback}>
                          <PageTransition><SettingsPage /></PageTransition>
                        </Suspense>
                      </AppLayout>
                    </PredictedLinksProvider>
                  </GlobalFolderProvider>
                </SidebarProvider>
              </StoreProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/help"
          element={
            <ProtectedRoute>
              <StoreProvider>
                <SidebarProvider>
                  <GlobalFolderProvider>
                    <PredictedLinksProvider>
                      <AppLayout>
                        <Suspense fallback={protectedFallback}>
                          <PageTransition><HelpPage /></PageTransition>
                        </Suspense>
                      </AppLayout>
                    </PredictedLinksProvider>
                  </GlobalFolderProvider>
                </SidebarProvider>
              </StoreProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/canvas"
          element={
            <ProtectedRoute>
              <StoreProvider>
                <SidebarProvider>
                  <GlobalFolderProvider>
                    <PredictedLinksProvider>
                      <AppLayout>
                        <Suspense fallback={protectedFallback}>
                          <PageTransition><CanvasPage /></PageTransition>
                        </Suspense>
                      </AppLayout>
                    </PredictedLinksProvider>
                  </GlobalFolderProvider>
                </SidebarProvider>
              </StoreProvider>
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ChakraAppProvider>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <AppContent />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ChakraAppProvider>
  );
}

export default App;
