import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import TaskDetails from './pages/TaskDetails';
import Navbar from './components/Navbar';
import { useAuthStore } from './store/authStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './lib/firebase';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const [isVerified, setIsVerified] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkVerification = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        setIsVerified(userData?.verified || false);
      }
      setLoading(false);
    };
    checkVerification();
  }, [user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Not Verified</h2>
          <p className="text-gray-600">
            Your account is pending verification. Please contact an administrator to verify your account.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AuthenticatedRedirect() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return null;
}

function App() {
  const { initialize, signIn } = useAuthStore();
  const [initializing, setInitializing] = React.useState(true);

  useEffect(() => {
    const initAuth = async () => {
      await initialize();
      
      // Try to auto-login if credentials exist
      const storedCredentials = localStorage.getItem('userCredentials');
      if (storedCredentials) {
        try {
          const { email, password } = JSON.parse(storedCredentials);
          await signIn(email, password);
        } catch (error) {
          console.error('Auto-login failed:', error);
          // Remove invalid credentials
          localStorage.removeItem('userCredentials');
        }
      }
      
      setInitializing(false);
    };

    initAuth();
  }, [initialize, signIn]);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/login" element={
            <>
              <AuthenticatedRedirect />
              <Login />
            </>
          } />
          <Route path="/signup" element={
            <>
              <AuthenticatedRedirect />
              <Signup />
            </>
          } />
          <Route
            path="/dashboard/*"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <AdminPanel />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/projects/:projectId/task/:taskPath"
            element={
              <PrivateRoute>
                <TaskDetails />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
      <Toaster position="top-right" />
    </>
  );
}

export default App;