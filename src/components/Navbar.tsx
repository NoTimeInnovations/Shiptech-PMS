import React from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { LogOut, Menu, User } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import NotificationDropdown from "./NotificationDropdown";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

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
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const { userData, user } = useAuthStore();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = React.useState(false);

  React.useEffect(() => {
    const checkUserRole = async () => {
      if (user && userData) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        setIsAdmin(userData?.role === "admin");
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

  const navLinkClass = (to: string) =>
    cn(
      "px-3 py-2 rounded-full text-sm font-medium transition-all",
      location.pathname === to
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-primary/90 hover:text-primary-foreground"
    );

  return (
    <nav className="bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <img src="/logo.png" alt="ShipTech PMS" className="h-10" />
            </Link>
          </div>

          <div className="sm:hidden flex items-center">
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="size-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <SheetHeader>
                  <SheetTitle className="sr-only">Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-3 p-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setIsSidebarOpen(false)}
                      className={cn(navLinkClass(link.to), "w-max")}
                    >
                      {link.label}
                    </Link>
                  ))}
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setIsSidebarOpen(false)}
                      className={cn(navLinkClass("/admin"), "w-max")}
                    >
                      Admin Panel
                    </Link>
                  )}
                  {user ? (
                    <Button
                      variant="ghost"
                      onClick={handleSignOut}
                      className="w-max rounded-full px-3 text-muted-foreground"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </Button>
                  ) : (
                    <Link
                      to="/login"
                      onClick={() => setIsSidebarOpen(false)}
                      className="px-3 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
                    >
                      Sign In
                    </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="hidden sm:flex items-center space-x-4">
            <Link to="/dashboard" className={navLinkClass("/dashboard")}>
              Dashboard
            </Link>

            {isAdmin && (
              <Link to="/admin" className={navLinkClass("/admin")}>
                Admin Panel
              </Link>
            )}

            <DropdownMenu
              open={isProfileDropdownOpen}
              onOpenChange={setIsProfileDropdownOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="size-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="flex items-center justify-center gap-2 font-normal">
                  <User className="h-4 w-4" />
                  {userData?.fullName}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {userData?.role !== "customer" && <NotificationDropdown />}
          </div>
        </div>
      </div>
    </nav>
  );
}
