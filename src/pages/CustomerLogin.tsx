import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Loader2, Ship } from "lucide-react";
import toast from "react-hot-toast";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

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
    }
  };

  return (
    <div className="min-h-screen watermark bg-white flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg w-96">
        <div className="flex flex-col items-center gap-2">
          <img src="/logo-192x192.png" alt="ShipTech PMS" className="h-20" />
          <h2 className="text-2xl font-semibold text-center mb-6">
            Login to <span className="font-bold">ShipTech PMS</span>
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              placeholder="Enter your email"
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm  p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="...................."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm  p-2"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-black/90 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 "
          >
            {loading ? <Loader2 className="animate-spin" /> : "Login"}
          </button>
        </form>
        <p className="mt-4"></p>
        {/* <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link to="/signup" className="text-blue-600 hover:text-blue-500">
            Sign up
          </Link>
        </p> */}
      </div>
    </div>
  );
}
