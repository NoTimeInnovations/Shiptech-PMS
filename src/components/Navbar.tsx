import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Ship, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Navbar() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [isCustomer, setIsCustomer] = React.useState(false);

  React.useEffect(() => {
    const checkUserRole = async () => {
      try{
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        setIsAdmin(userData?.role === 'admin');
        setIsCustomer(userData?.role === 'customer');
      }}catch(e){
        console.log(e);
      }
    };
    checkUserRole();
  }, [user]);

  // Don't show navbar on login or signup pages
  if (location.pathname === '/login' || location.pathname === '/signup') {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b-[1px]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Ship className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Shiptech PMS</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user && !isCustomer && (
              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-full text-sm font-medium ${
                  location.pathname === '/dashboard'
                    ? 'text-white bg-black/90'
                    : 'text-gray-700 hover:text-white hover:bg-black/80 transition-all'
                }`}
              >
                Dashboard
              </Link>
            )}
            
            {isAdmin && (
              <Link
                to="/admin"
                className={`px-3 py-2 rounded-full text-sm font-medium ${
                  location.pathname === '/admin'
                    ? 'text-white bg-black/90'
                    : 'text-gray-700 hover:text-white hover:bg-black/80 transition-all'
                }`}
              >
                Admin Panel
              </Link>
            )}

            {user ? (
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 px-3 py-2 rounded-full text-sm font-medium text-gray-700 hover:text-black transition-all"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            ) : (
              <Link
                to="/login"
                className="px-3 py-2 rounded-full text-sm font-medium text-gray-700 hover:text-black transition-all"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}