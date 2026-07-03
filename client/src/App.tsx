import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword';
import { TranslationCard } from './components/TranslationCard';
import { Background } from './components/Background';
import { LoadingScreen } from './components/LoadingScreen';
import { Chat } from './pages/Chat';
import { AIPractice } from './pages/AIPractice';
import { AdminDashboard } from './pages/AdminDashboard';
import { Pricing } from './pages/Pricing';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  // Since loading is not exposed in AuthContext, we rely on isAuthenticated or user presence
  // Ideally AuthContext should expose a loading state, but for now we'll assume if token exists but user is null, we might be loading.
  // However, the current AuthContext implementation doesn't strictly expose a loading state.
  // We will just check if user is authenticated.
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// Premium Route - requires both authentication AND premium subscription
const PremiumRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Check if user has premium subscription
  if (!user?.isPremium) {
    return <Navigate to="/pricing" />;
  }

  return <>{children}</>;
};

// AdminRoute removed as 'role' is not on User interface currently.
// If needed, we can add it back once User interface is updated.

import { Navbar } from './components/Navbar';
import { BackButton } from './components/BackButton';

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial loading for "Server Waking Up"
  useEffect(() => {
    // Check if we've already shown the loading screen this session
    const hasLoaded = sessionStorage.getItem('hasLoaded');
    if (hasLoaded) {
      setIsLoading(false);
    }
  }, []);

  const handleLoadingComplete = () => {
    setIsLoading(false);
    sessionStorage.setItem('hasLoaded', 'true');
  };

  if (isLoading) {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  return (
    <div className="relative min-h-screen text-dark-text overflow-hidden selection:bg-primary-500/30 bg-dark-bg">
      <Background />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <BackButton />

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              {/* ResetPassword route removed as file is missing */}
              <Route
                path="/"
                element={<TranslationCard />}
              />
              <Route path="/pricing" element={<Pricing />} />
              <Route
                path="/chat"
                element={
                  <PremiumRoute>
                    <Chat />
                  </PremiumRoute>
                }
              />
              <Route
                path="/ai-practice"
                element={
                  <PremiumRoute>
                    <AIPractice />
                  </PremiumRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <PrivateRoute>
                    <AdminDashboard />
                  </PrivateRoute>
                }
              />
              {/* Payment routes removed as files are missing */}
            </Routes>
          </AnimatePresence>
        </main>
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
