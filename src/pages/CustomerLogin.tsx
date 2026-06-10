import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CustomerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn, loading, error } = useAuthStore();
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
      console.log(err);
    }
  };

  return (
    <div className="min-h-screen watermark bg-transparent flex items-center justify-center p-4">
      <Card className="w-96 shadow-2xl">
        <CardHeader className="items-center text-center">
          <img src="/logo-192x192.png" alt="ShipTech PMS" className="h-20 mx-auto" />
          <CardTitle className="text-2xl font-heading font-semibold">
            Customer Login <br /> <span className="font-bold">ShipTech-ICON</span>
          </CardTitle>
          <CardDescription>Sign in to your customer account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer-email">Email</Label>
              <Input
                id="customer-email"
                type="email"
                value={email}
                placeholder="Enter your email"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-password">Password</Label>
              <Input
                id="customer-password"
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
      </Card>
    </div>
  );
}
