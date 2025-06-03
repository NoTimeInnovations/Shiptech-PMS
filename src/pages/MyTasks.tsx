import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useTaskStore } from "@/store/taskStore";
import { Trash2, Edit2Icon, ChevronDown, ChevronUp, File } from "lucide-react";
import { Link } from "react-router-dom";
// Add project store import
import { useProjectStore } from "@/store/projectStore";

export default function MyTasks() {
  const { user, userData } = useAuthStore();
  const { fetchUserTasks, tasks } = useTaskStore();
  const { projects, fetchProjects } = useProjectStore(); // Add project store
  const [expandedTaskRows, setExpandedTaskRows] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed'>('ongoing');
  const [filteredTasks, setFilteredTasks] = useState(tasks);

  useEffect(() => {
    const fetchData = async () => {
      if (user && userData) {
        await fetchUserTasks({
          id: user.uid,
          name: userData.fullName,
          email: userData.email,
        });
      }
      if(projects.length === 0) {
        await fetchProjects(); 
      }
    };
    fetchData();
  }, [user, userData, fetchUserTasks, fetchProjects]);

  useEffect(() => {
    const filtered = activeTab === 'ongoing'
      ? tasks.filter(task => {
          const project = projects.find(p => p.id === task.projectId);
          return !task.completed && project?.status !== 'completed';
        })
      : tasks.filter(task => {
          const project = projects.find(p => p.id === task.projectId);
          return task.completed && project?.status !== 'completed';
        });
    setFilteredTasks(filtered);
  }, [tasks, activeTab, projects]);

  const toggleTaskRowExpansion = (id: string) => {
    const newExpandedTaskRows = new Set(expandedTaskRows);
    if (newExpandedTaskRows.has(id)) {
      newExpandedTaskRows.delete(id);
    } else {
      newExpandedTaskRows.add(id);
    }
    setExpandedTaskRows(newExpandedTaskRows);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Tasks</h1>
      
      {/* Add Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('ongoing')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
              ${activeTab === 'ongoing' ? 'border-black/90 text-black/90' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <span>Ongoing</span>
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
              ${activeTab === 'completed' ? 'border-black/90 text-black/90' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <span>Completed</span>
          </button>
        </div>
      </div>

      {filteredTasks.length > 0 ? (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Task Name
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time Entries
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider flex justify-end">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTasks.map((task) => (
              <React.Fragment key={task.id}>
                <tr onClick={() => toggleTaskRowExpansion(task.id)} className="hover:bg-gray-50 hover:cursor-pointer text-center">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {task.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {task.timeEntries
                      ? task.timeEntries
                          .filter(entry => entry.userId === user?.uid) // Filter by user ID
                          .reduce((total, entry) => total + entry.duration, 0) / 60 // Convert to hours
                      : 0}{" "}
                    hours
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {task.completed ? "completed" : "incomplete"}
                  </td>
                  <td className="py-4 whitespace-nowrap text-sm text-gray-500 flex justify-end items-center pr-12">
                    <button className="text-gray-600 hover:text-gray-900">
                      {expandedTaskRows.has(task.id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </td>
                </tr>
                {expandedTaskRows.has(task.id) && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 bg-gray-100">
                      <div>
                        <h3 className="font-semibold">Task Details:</h3>
                        <p>Description: {task.description}</p>
                        <p>Assigned To: {task.assignedTo?.map(user => user.name).join(", ")}</p>
                        <p>Deadline:{task.deadline? new Date(task.deadline).toLocaleString("en-GB") : "No deadline set"}</p>

                        <Link to={`/dashboard/projects/${task.projectId}`} className="text-blue-500 flex items-center gap-1 hover:cursor-pointer"><File size={18} /> Go to project</Link>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-4 mb-4">
          <h2 className="text-lg font-semibold">No {activeTab === 'ongoing' ? 'Ongoing' : 'Completed'} Tasks</h2>
          <p>You have no {activeTab === 'ongoing' ? 'ongoing' : 'completed'} tasks.</p>
        </div>
      )}
    </div>
  );
}
