import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import RoleRoute from '@/components/RoleRoute';
// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
// App pages
import Home from '@/pages/Home';
import Bills from '@/pages/Bills';
import Analytics from '@/pages/Analytics';
import Solar from '@/pages/Solar';
import Appliances from '@/pages/Appliances';
import Outages from '@/pages/Outages';
import Complaints from '@/pages/Complaints';
import Notifications from '@/pages/Notifications';
import Profile from '@/pages/Profile';
import AdminDashboard from '@/pages/AdminDashboard';
import Tariffs from '@/pages/Tariffs';
import TheftAlerts from '@/pages/TheftAlerts';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/bills" element={<Bills />} />
          <Route element={<RoleRoute roles={['user', 'admin']} />}>
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/solar" element={<Solar />} />
          </Route>
          <Route element={<RoleRoute roles={['user']} />}>
            <Route path="/appliances" element={<Appliances />} />
          </Route>
          <Route path="/outages" element={<Outages />} />
          <Route path="/complaints" element={<Complaints />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route element={<RoleRoute roles={['admin', 'staff']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/theft-alerts" element={<TheftAlerts />} />
          </Route>
          <Route element={<RoleRoute roles={['admin']} />}>
            <Route path="/tariffs" element={<Tariffs />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App