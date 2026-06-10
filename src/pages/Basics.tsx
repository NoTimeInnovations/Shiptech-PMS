import React from "react";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import AdminBasics from "./AdminBasics";
import MemberBasics from "./MemberBasics";
import ProjectCalendar from "../components/ProjectCalendar";
export default function Basics() {
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const { user } = useAuthStore();

  React.useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        setIsAdmin(userData?.role === "admin");
      }
      setLoading(false);
    };

    checkUserRole();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <MemberBasics />
      <div className=" p-6">
        <ProjectCalendar />
      </div>
      {isAdmin && <AdminBasics />}
    </div>
  );
}
