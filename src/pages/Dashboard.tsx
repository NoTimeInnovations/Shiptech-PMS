import React, { useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { 
  Calendar, 
  ChevronRight, 
  ChevronLeft,
  LayoutDashboard,
  FileQuestion,
  Briefcase
} from 'lucide-react';
import Enquiries from './Enquiries';
import Projects from './Projects';
import ProjectDetails from './ProjectDetails';
import ProjectForm from './ProjectForm';
import DeliverableDetails from './DeliverableDetails';

const Basics = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold mb-6">Basics</h2>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Calendar</h3>
        <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
          Calendar Component Coming Soon
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Incoming Mails</h3>
        <div className="space-y-4">
          <div className="border-b pb-4">
            <p className="font-medium">No new messages</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className={`bg-white shadow-lg transition-all duration-300 flex flex-col ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="p-4 flex justify-between items-center border-b">
          {!isCollapsed && <span className="font-semibold">Navigation</span>}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
        <nav className="flex-1 p-4">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `flex items-center space-x-3 p-2 rounded-lg ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              } ${isCollapsed ? 'justify-center' : ''}`
            }
          >
            <LayoutDashboard size={20} />
            {!isCollapsed && <span>Basics</span>}
          </NavLink>
          <NavLink
            to="/dashboard/enquiries"
            className={({ isActive }) =>
              `flex items-center space-x-3 p-2 rounded-lg mt-2 ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              } ${isCollapsed ? 'justify-center' : ''}`
            }
          >
            <FileQuestion size={20} />
            {!isCollapsed && <span>Enquiries</span>}
          </NavLink>
          <NavLink
            to="/dashboard/projects"
            className={({ isActive }) =>
              `flex items-center space-x-3 p-2 rounded-lg mt-2 ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              } ${isCollapsed ? 'justify-center' : ''}`
            }
          >
            <Briefcase size={20} />
            {!isCollapsed && <span>Projects</span>}
          </NavLink>
        </nav>
      </div>

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Basics />} />
          <Route path="/enquiries/*" element={<Enquiries />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetails />} />
          <Route path="/projects/:projectId/deliverable/:path" element={<DeliverableDetails />} />
          <Route path="/projects/:id/edit" element={<ProjectForm />} />
          <Route path="/projects/new" element={<ProjectForm />} />
        </Routes>
      </div>
    </div>
  );
}