import { useEffect, useState } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import {
  ChevronRight,
  ChevronLeft,
  LayoutDashboard,
  FileQuestion,
  Briefcase,
  UserCheck,
  ListTodo,
  Users,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Enquiries from "./Enquiries";
import Projects from "./Projects";
import ProjectDetails from "./ProjectDetails";
import ProjectForm from "./ProjectForm";
import TaskDetails from "./TaskDetails";
import Basics from "./Basics";
import Attendance from "./Attendance";
import { useAttendanceStore } from "@/store/attendanceStore";
import { useAuthStore } from "@/store/authStore";
import { useLeaveStore } from "@/store/leaveStore";
import { useWorkFromStore } from "@/store/workfromhomestore";
import AttendanceModal from "@/components/AttendanceModal";
import Todos from './Todos';
import Customers from "./Customers";
import OutsourceTeams from "./OutsourceTeams";
// Remove NewTeam and TeamDetails imports as they'll be handled in index.tsx

export default function Dashboard() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { checkAttendance } = useAttendanceStore();
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const { user , userData } = useAuthStore();
  const { allLeaveRequests, fetchAllLeaveRequests } = useLeaveStore();
  const { allWorkFromRequests, fetchAllWorkFromRequests } = useWorkFromStore();
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkUserAttendance = async () => {
      const hasMarkedAttendance = await checkAttendance();
      if (!hasMarkedAttendance) {
        setShowAttendanceModal(true);
      }
    };

    const checkAdminStatus = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        setIsAdmin(userData?.role === 'admin');
      }
    };

    if (user) {
      checkUserAttendance();
      checkAdminStatus();
      fetchAllLeaveRequests();
      fetchAllWorkFromRequests();
    }
  }, [checkAttendance, user, fetchAllLeaveRequests, fetchAllWorkFromRequests]);

  useEffect(() => {
    const fetchPendingRequests = async () => {
      const leaveRequests = await Promise.all(
        allLeaveRequests
          .filter(req => req.status === "pending" && req.userId !== user?.uid)
          .map(async req => {
            const userDoc = await getDoc(doc(db, 'users', req.userId));
            return {
              ...req,
              type: 'leave',
              userName: userDoc.data()?.fullName
            };
          })
      );

      const workFromRequests = allWorkFromRequests
        .filter(req => req.status === "pending" && req.userId !== user?.uid)
        .map(req => ({
          ...req,
          type: 'work from home'
        }));

      setPendingRequests([...leaveRequests, ...workFromRequests]);
    };

    if (user) {
      fetchPendingRequests();
    }
  }, [allLeaveRequests, allWorkFromRequests, user?.uid]);

  return (
    <div className="min-h-screen watermark bg-gray-50 flex flex-col">
      {isAdmin && pendingRequests.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Pending Requests</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc pl-5 space-y-1">
                  {pendingRequests.map((req, index) => (
                    <li key={index}>
                      {req.userName} has a pending {req.type} request from {req.startDate} to {req.endDate}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1">
        <div
          className={`bg-white transition-all duration-300 lg:flex flex-col border-r-[1px] hidden ${
            isCollapsed ? "w-16" : "w-64"
          }`}
        >
          <div className="p-4 flex justify-between items-center border-b">
            {!isCollapsed && <span className="font-semibold">Navigation</span>}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 hover:bg-gray-100 rounded-xl"
            >
              {isCollapsed ? (
                <ChevronRight size={20} />
              ) : (
                <ChevronLeft size={20} />
              )}
            </button>
          </div>
          <nav className="flex-1 p-2">
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                `flex items-center space-x-3 transition-all duration-500 rounded-xl ${
                  isActive
                    ? "bg-black/90 text-white"
                    : "text-gray-700 hover:bg-gray-50"
                } ${isCollapsed ? "justify-center p-2" : " p-4"}`
              }
            >
              <LayoutDashboard size={20} />
              {!isCollapsed && <span>Dashboard</span>}
            </NavLink>
            {
              userData?.role === 'admin' && (
                <>
                  <NavLink
                    to="/dashboard/enquiries"
                    className={({ isActive }) =>
                      `flex items-center space-x-3 transition-all duration-500 rounded-xl mt-2 ${
                        isActive
                          ? "bg-black/90 text-white"
                          : "text-gray-700 hover:bg-gray-50"
                      } ${isCollapsed ? "justify-center p-2" : " p-4"}`
                    }
                  >
                    <FileQuestion size={20} />
                    {!isCollapsed && <span>Enquiries</span>}
                  </NavLink>
                  <NavLink
                    to="/dashboard/customers"
                    className={({ isActive }) =>
                      `flex items-center space-x-3 transition-all duration-500 rounded-xl mt-2 ${
                        isActive
                          ? "bg-black/90 text-white"
                          : "text-gray-700 hover:bg-gray-50"
                      } ${isCollapsed ? "justify-center p-2" : " p-4"}`
                    }
                  >
                    <Users size={20} />
                    {!isCollapsed && <span>Customers</span>}
                  </NavLink>
                </>
              )
            }
            <NavLink
              to="/dashboard/projects"
              className={({ isActive }) =>
                `flex items-center space-x-3 transition-all duration-500 rounded-xl mt-2 ${
                  isActive
                    ? "bg-black/90 text-white"
                    : "text-gray-700 hover:bg-gray-50"
                } ${isCollapsed ? "justify-center p-2" : " p-4"}`
              }
            >
              <Briefcase size={20} />
              {!isCollapsed && <span>Projects</span>}
            </NavLink>
            <NavLink
              to="/dashboard/attendance"
              className={({ isActive }) =>
                `flex items-center space-x-3 transition-all duration-500 rounded-xl mt-2 ${
                  isActive
                    ? "bg-black/90 text-white"
                    : "text-gray-700 hover:bg-gray-50"
                } ${isCollapsed ? "justify-center p-2" : " p-4"}`
              }
            >
              <UserCheck size={20} />
              {!isCollapsed && <span>Attendance</span>}
            </NavLink>
            <NavLink
              to="/dashboard/todos"
              className={({ isActive }) =>
                `flex items-center space-x-3 transition-all duration-500 rounded-xl mt-2 ${
                  isActive
                    ? "bg-black/90 text-white"
                    : "text-gray-700 hover:bg-gray-50"
                } ${isCollapsed ? "justify-center p-2" : " p-4"}`
              }
            >
              <ListTodo size={20} />
              {!isCollapsed && <span>Todos</span>}
            </NavLink>
            <NavLink
              to="/dashboard/outsource-teams/"
              className={({ isActive }) =>
                `flex items-center space-x-3 transition-all duration-500 rounded-xl mt-2 ${
                  isActive
                   ? "bg-black/90 text-white"
                    : "text-gray-700 hover:bg-gray-50"
                } ${isCollapsed? "justify-center p-2" : " p-4"}`
              }
            >
              <Briefcase size={20} />
              {!isCollapsed && <span>Outsource Teams</span>}
            </NavLink>
          </nav>
        </div>

        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Basics />} />
            <Route path="/enquiries/*" element={<Enquiries />} />
            <Route path="/customers/*" element={<Customers />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetails />} />
            <Route path="/projects/:id/task/*" element={<TaskDetails />} />
            <Route path="/projects/:id/edit" element={<ProjectForm />} />
            <Route path="/projects/new" element={<ProjectForm />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/todos" element={<Todos />} />
            <Route path="/outsource-teams/*" element={<OutsourceTeams />} />
          </Routes>
        </div>

        {user && (
          <AttendanceModal
            isOpen={showAttendanceModal}
            onClose={() => setShowAttendanceModal(false)}
          />
        )}
      </div>
    </div>
  );
}
