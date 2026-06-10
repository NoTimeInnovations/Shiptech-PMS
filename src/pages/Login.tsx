import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn, loading, error } = useAuthStore();
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState(""); // State for email input in modal
  const [resetError, setResetError] = useState(""); // State for reset error message
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userCredential = await signIn(email, password);
      if (userCredential) {
        // Get user role from Firestore
        const userDoc = await getDoc(doc(db, "users", userCredential.uid));
        const userData = userDoc.data();

        toast.success("Successfully logged in!");

        // Route based on user role
        if (userData?.role === "admin") {
          navigate("/dashboard");
        } else if (userData?.role === "customer") {
          navigate("/customer");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (err) {
      toast.error("Failed to login. Please try again.");
    }
  };

  const handleResetPassword = async () => {
    try {
      // Check if the email exists in the users collection
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", resetEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setResetError("User does not exist.");
        return;
      }

      // Send password reset email
      await sendPasswordResetEmail(auth, resetEmail);
      toast.success("Password reset email sent!");
      setShowResetPassword(false);
      setResetError(""); // Clear any previous error
    } catch (err) {
      toast.error("Failed to send password reset email. Please try again.");
      setResetError("Failed to send password reset email. Please try again.");
    }
  };

  return (
    <div className="min-h-screen watermark flex items-center justify-center p-4">
      <Card className="w-96 shadow-2xl">
        <CardHeader className="items-center text-center">
          <img src="/logo-192x192.png" alt="ShipTech PMS" className="h-20 mx-auto" />
          <CardTitle className="text-2xl font-heading font-semibold">
            Login to <span className="font-bold">ShipTech-ICON</span>
          </CardTitle>
          <CardDescription>Enter your credentials to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                placeholder="Enter your email"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="...................."
                required
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="animate-spin" /> : "Login"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary underline-offset-4 hover:underline">
              Sign up
            </Link>
          </p>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => setShowResetPassword(true)}
          >
            Forgot Password?
          </Button>
        </CardFooter>
      </Card>

      <Dialog
        open={showResetPassword}
        onOpenChange={(open) => {
          if (!open) {
            setShowResetPassword(false);
            setResetError(""); // Clear error when closing modal
          }
        }}
      >
        <DialogContent className="sm:max-w-96">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              value={resetEmail}
              placeholder="Enter your email"
              onChange={(e) => setResetEmail(e.target.value)}
              required
            />
            {resetError && <p className="text-destructive text-sm">{resetError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowResetPassword(false);
                setResetError(""); // Clear error when closing modal
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleResetPassword}>
              Send Reset Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
