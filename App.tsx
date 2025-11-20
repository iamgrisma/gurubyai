import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/AuthProvider';
import { PublicHeader } from './components/shared/PublicHeader';
import { LandingPage } from './features/public/LandingPage';
import { LoginPage } from './features/auth/LoginPage';
import { ClientDashboard } from './features/client/ClientDashboard';
import { ServiceSelection } from './features/booking/ServiceSelection';
import { GurubaSelection } from './features/booking/GurubaSelection';

// Layout that includes the Header
const PublicLayout = () => {
  return (
    <div className="min-h-screen flex flex-col font-sans text-stone-900">
      <PublicHeader />
      <main className="flex-grow">
        <Outlet />
      </main>
      <footer className="bg-stone-900 py-8 text-center text-stone-400">
        <p>&copy; {new Date().getFullYear()} Guruba Connect. All rights reserved.</p>
      </footer>
    </div>
  );
};

// Route guard for authenticated users
const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-saffron-600">Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            {/* Add Register, Services, etc. here */}
          </Route>

          <Route
            path="/client"
            element={
              <ProtectedRoute>
                <PublicLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ClientDashboard />} />
          </Route>

          {/* Booking Flow Routes */}
          <Route
            path="/book"
            element={
              <ProtectedRoute>
                <PublicLayout />
              </ProtectedRoute>
            }
          >
             <Route index element={<ServiceSelection />} />
             <Route path=":serviceId" element={<GurubaSelection />} />
          </Route>
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;