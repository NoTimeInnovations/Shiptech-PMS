import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import Navbar from "./components/Navbar";
import { useAuthStore } from "./store/authStore";
import CustomerLogin from "./pages/CustomerLogin";
import CustomerViewingDetails from "./pages/customerViewingDetails";
import CustomerProject from "./pages/CustomerProject";

function PrivateRoute({
  children,
  allowedRoles = ["admin", "member"],
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { user, userData } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData !== null) {
      setLoading(false);
    }
  }, [userData]);

  if (!user) {
    return <Navigate to="/login" />;
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }


  if (userData?.role === "customer") {
    return allowedRoles.includes("customer") ? <>{children}</> : <Navigate to="/customer" />;
  }

  if (!userData?.verified) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Account Not Verified
          </h2>
          <p className="text-gray-600">
            Your account is pending verification. Please contact an administrator to verify your account.
          </p>
        </div>
      </div>
    );
  }

  if (!allowedRoles.includes(userData?.role || "")) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

function AuthenticatedRedirect() {
  const { user, userData } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && userData) {
      navigate(userData.role === "customer" ? "/customer" : "/dashboard");
    }
  }, [user, userData, navigate]);

  return null;
}

function CustomerProjectWrapper() {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) {
    return <Navigate to="/customer" />;
  }

  return <CustomerProject projectId={projectId} />;
}

function App() {
  const { initialize, userData } = useAuthStore();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      await initialize();
      setInitializing(false);
    };
    initAuth();
  }, [initialize]);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <Routes>
        <Route path="/login" element={<><AuthenticatedRedirect /><Login /></>} />
        <Route path="/customer_login" element={<><AuthenticatedRedirect /><CustomerLogin /></>} />
        <Route path="/signup" element={<><AuthenticatedRedirect /><Signup /></>} />
        <Route path="/dashboard/*" element={<PrivateRoute allowedRoles={["admin", "member"]}><Dashboard /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute allowedRoles={["admin"]}><AdminPanel /></PrivateRoute>} />
        <Route path="/customer" element={<PrivateRoute allowedRoles={["customer"]}><CustomerViewingDetails /></PrivateRoute>} />
        <Route path="/customer/projects/:projectId" element={<CustomerProjectWrapper />} />
        <Route path="/" element={<Navigate to={userData?.role === "customer" ? "/customer" : "/dashboard"} />} />
        <Route path="*" element={<Navigate to={userData?.role === "customer" ? "/customer" : "/dashboard"} />} />
      </Routes>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
