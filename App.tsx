
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { QueryClient } from '@tanstack/query-core';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './features/auth/AuthProvider';
import { NotificationProvider } from './features/notifications/NotificationContext';
import { MessageProvider } from './components/ui/MessageContext';
import { PublicHeader } from './components/shared/PublicHeader';
import { LandingPage } from './features/public/LandingPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ClientDashboard } from './features/client/ClientDashboard';
import { GurubaDashboard } from './features/guruba/GurubaDashboard';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { ServiceSelection } from './features/booking/ServiceSelection';
import { ServiceDetailsPage } from './features/services/ServiceDetailsPage';
import { GurubaSelection } from './features/booking/GurubaSelection';
import { BookingSuccessPage } from './features/booking/BookingSuccess';
import { GurubaDirectory } from './features/public/GurubaDirectory';

console.log('App.tsx: All imports loaded successfully');

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

console.log('App.tsx: QueryClient created');

// Layout that includes the Header
const PublicLayout = () => {
  const location = useLocation();
  return (
    <div className="min-h-screen flex flex-col font-sans text-stone-900">
      <PublicHeader />
      <main className="flex-grow">
        <div key={location.pathname} className="animate-in fade-in duration-300">
          <Outlet />
        </div>
      </main>
      <footer className="bg-stone-900 py-8 text-center text-stone-400">
        <p>&copy; {new Date().getFullYear()} Guruba Connect. All rights reserved.</p>
      </footer>
    </div>
  );
};

// Route guard for authenticated users
const ProtectedRoute = ({ children, allowedRoles }: { children?: React.ReactNode, allowedRoles?: string[] }) => {
  const { session, loading, profile } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-saffron-600">Loading...</div>;
  }

  if (!session) {
    // Save the current location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Simple role based access control
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // Redirect to their appropriate dashboard if they try to access a wrong route
    if (profile.role === 'admin') return <Navigate to="/admin" replace />;
    if (profile.role === 'guruba') return <Navigate to="/guruba" replace />;
    return <Navigate to="/client" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <MessageProvider>
            <Router>
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/gurubas" element={<GurubaDirectory />} />
                </Route>

                {/* Client Routes */}
                <Route
                  path="/client"
                  element={
                    <ProtectedRoute allowedRoles={['client', 'admin']}>
                      <PublicLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<ClientDashboard />} />
                </Route>

                {/* Guruba Routes */}
                <Route
                  path="/guruba"
                  element={
                    <ProtectedRoute allowedRoles={['guruba', 'admin']}>
                      <PublicLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<GurubaDashboard />} />
                </Route>

                {/* Admin Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <PublicLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                </Route>

                {/* Booking Flow Routes (Ideally for Clients, but open for now) */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute allowedRoles={['client', 'admin']}>
                      <PublicLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="book" element={<ServiceSelection />} />
                  <Route path="services/:serviceId" element={<ServiceDetailsPage />} />
                  <Route path="book/:serviceId" element={<GurubaSelection />} />
                  <Route path="booking-success" element={<BookingSuccessPage />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </MessageProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
