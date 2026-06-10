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
  TimerIcon,
} from "lucide-react";
import Enquiries from "./Enquiries";
import Projects from "./Projects";
import ProjectDetails from "./ProjectDetails";
import ProjectForm from "./ProjectForm";
import TaskDetails from "./TaskDetails";
import Basics from "./Basics";
import Attendance from "./Attendance";
import { useAttendanceStore } from "@/store/attendanceStore";
import { useAuthStore } from "@/store/authStore";
import AttendanceModal from "@/components/AttendanceModal";
import Todos from './Todos';
import Customers from "./Customers";
import OutsourceTeams from "./OutsourceTeams";
import Documents from "./Documents";
import Currencies from "./Currencies";
import TimeSheet from "./TimeSheet";
import Settings from "./Settings";
import MyTasks from "./MyTasks";
import { Button } from "@/components/ui/button";
// Remove NewTeam and TeamDetails imports as they'll be handled in index.tsx

export default function Dashboard() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { checkAttendance } = useAttendanceStore();
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const { user, userData } = useAuthStore();

  useEffect(() => {
    const checkUserAttendance = async () => {
      const hasMarkedAttendance = await checkAttendance();
      if (!hasMarkedAttendance) {
        setShowAttendanceModal(true);
      }
    };

    if (user) {
      checkUserAttendance();
    }
  }, [checkAttendance, user]);

  const navLinkClass = (isActive: boolean) =>
    `flex items-center space-x-3 transition-all duration-500 rounded-xl mt-2 ${isActive
      ? "bg-primary text-primary-foreground"
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    } ${isCollapsed ? "justify-center p-2" : " p-4"}`;

  return (
    <div className="min-h-screen watermark bg-background flex flex-col">
      <div className="flex flex-1">
        <div
          className={`bg-sidebar text-sidebar-foreground transition-all duration-300 lg:flex flex-col border-r border-sidebar-border hidden ${isCollapsed ? "w-16" : "w-64"
            }`}
        >
          <div className="p-4 flex justify-between items-center border-b border-sidebar-border">
            {!isCollapsed && <span className="font-semibold">Navigation</span>}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="rounded-xl"
            >
              {isCollapsed ? (
                <ChevronRight size={20} />
              ) : (
                <ChevronLeft size={20} />
              )}
            </Button>
          </div>
          <nav className="flex-1 p-2">
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                `flex items-center space-x-3 transition-all duration-500 rounded-xl ${isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
                    className={({ isActive }) => navLinkClass(isActive)}
                  >
                    <FileQuestion size={20} />
                    {!isCollapsed && <span>Enquiries</span>}
                  </NavLink>
                  <NavLink
                    to="/dashboard/customers"
                    className={({ isActive }) => navLinkClass(isActive)}
                  >
                    <Users size={20} />
                    {!isCollapsed && <span>Customers</span>}
                  </NavLink>
                </>
              )
            }
            <NavLink
              to="/dashboard/projects"
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <Briefcase size={20} />
              {!isCollapsed && <span>Projects</span>}
            </NavLink>
            <NavLink
              to="/dashboard/attendance"
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <UserCheck size={20} />
              {!isCollapsed && <span>Attendance</span>}
            </NavLink>
            <NavLink
              to="/dashboard/todos"
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <ListTodo size={20} />
              {!isCollapsed && <span>To Do</span>}
            </NavLink>
            <NavLink
              to="/dashboard/outsource-teams/"
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <Briefcase size={20} />
              {!isCollapsed && <span>Outsource Teams</span>}
            </NavLink>
            <NavLink
              to="/dashboard/timesheet"
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <TimerIcon size={20} />
              {!isCollapsed && <span>Time Sheet</span>}
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
            <Route path="/projects/:projectId/documents/*" element={<Documents />} />
            <Route path="/currencies" element={<Currencies />} />
            <Route path="/timesheet" element={<TimeSheet />} />
            <Route path="/settings" element={<Settings/>} />
            <Route path="/mytasks" element={<MyTasks/>} />
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
