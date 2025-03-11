import React from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import NotificationDropdown from './NotificationDropdown';

const navLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/dashboard/enquiries", label: "Enquiries" },
  { to: "/dashboard/projects", label: "Projects" },
  { to: "/dashboard/attendance", label: "Attendance" },
  { to: "/dashboard/todos", label: "Todos" },
];

export default function Navbar() {
  const { signOut } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = React.useState(false);
  // const [isCustomer, setIsCustomer] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const { userData, user } = useAuthStore();

  React.useEffect(() => {
    const checkUserRole = async () => {
      if (user && userData) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        setIsAdmin(userData?.role === "admin");
        // setIsCustomer(userData?.role === "customer");
      }
    };
    checkUserRole();
  }, [user]);

  // Don't show navbar on login or signup pages
  if (
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname === "/customer_login"
  ) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();

    if (location.pathname === "/customer") {
      navigate("/customer_login");
    } else {
      navigate("/login");
    }
  };

  return (
    <nav className="bg-white border-b-[1px]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <img src="/logo.png" alt="ShipTech PMS" className="h-10" />
              {/* <span className="text-xl font-bold text-gray-900">Shiptech PMS</span> */}
            </Link>
          </div>

          <div className="sm:hidden flex items-center">
            <button onClick={() => setIsSidebarOpen(true)}>
              <Menu className="h-6 w-6" />
            </button>
          </div>

          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
              onClick={() => setIsSidebarOpen(false)}
            >
              <div className="absolute right-0 w-64 bg-white h-full shadow-lg p-4 flex flex-col gap-3">
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex justify-end p-2 rounded-sm text-black w-full"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    className="size-6"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <div className="sm:hidden flex gap-2 space-x-4 flex-col ">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`px-3 py-2 rounded-full text-sm font-medium w-max ${
                        location.pathname === link.to
                          ? "text-white bg-black/90"
                          : "text-gray-700 hover:text-white hover:bg-black/80 transition-all"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className={`px-3 py-2 rounded-full text-sm font-medium ${
                        location.pathname === "/admin"
                          ? "text-white bg-black/90"
                          : "text-gray-700 hover:text-white hover:bg-black/80 transition-all"
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
          )}

          <div className="hidden sm:flex items-center space-x-4">
            <Link
              to="/dashboard"
              className={`px-3 py-2 rounded-full text-sm font-medium ${
                location.pathname === "/dashboard"
                  ? "text-white bg-black/90"
                  : "text-gray-700 hover:text-white hover:bg-black/80 transition-all"
              }`}
            >
              Dashboard
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                className={`px-3 py-2 rounded-full text-sm font-medium ${
                  location.pathname === "/admin"
                    ? "text-white bg-black/90"
                    : "text-gray-700 hover:text-white hover:bg-black/80 transition-all"
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
            <NotificationDropdown />
          </div>

          
        </div>
      </div>
    </nav>
  );
}
