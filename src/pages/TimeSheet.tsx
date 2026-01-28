import React, { useEffect, useState } from "react";
import { useTimeSheetStore } from "@/store/timeSheetStore";
import { useProjectStore } from "@/store/projectStore"; // Import project store
import { useAuthStore, UserData } from "@/store/authStore";
import { useTaskStore, Task } from "@/store/taskStore"; // Import Task interface and store
import CustomModal from "@/components/CustomModal"; // Import the custom modal
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Trash2, Edit2Icon, ChevronDown, ChevronUp } from "lucide-react";

export interface CustomUserData {
  id: string;
  createdAt: string;
  email: string;
  fullName: string;
  projectId?: string;
  role: "admin" | "member" | "customer";
  verified: boolean;
  designation: string;
  phone?: string;
  address?: string;
}

const TimeSheet = () => {
  const [users, setUsers] = useState<Record<string, UserData>>({});
  const [HasChnaged, setHasChnaged] = useState<boolean>(false);
  const { user, userData } = useAuthStore();
  const {
    timeSheets,
    fetchTimeSheets,
    addTimeSheet,
    deleteTimeSheet,
    updateTimeSheet,
  } = useTimeSheetStore();
  const { fetchUserTasks, tasks, fetchAllTasksWithChildren } = useTaskStore(); // Access fetchAllTasksWithChildren
  const { projects, fetchProjects } = useProjectStore(); // Access projects
  const [selectedUserId, setSelectedUserId] = useState(user?.uid);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]); // Assignments state for modal

  const [newTimeSheet, setNewTimeSheet] = useState<{
    title: string;
    description: string;
    hours: number;
    minutes: number;
    projectId?: string;
    taskIds?: string[];
  }>({
    title: "",
    description: "",
    hours: 0,
    minutes: 0,
    projectId: "",
    taskIds: [],
  });
  const [editingTimeSheetId, setEditingTimeSheetId] = useState<string | null>(
    null
  );
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedTaskRows, setExpandedTaskRows] = useState<Set<string>>(
    new Set()
  ); // State for expanded task rows

  // Filter states
  const [filterProjectId, setFilterProjectId] = useState<string>("");
  const [filterTaskId, setFilterTaskId] = useState<string>("");
  const [filterProjectTasks, setFilterProjectTasks] = useState<Task[]>([]);

  useEffect(() => {
    const loadFilterTasks = async () => {
      if (filterProjectId) {
        // Force fetch tasks for filter WITHOUT updating global state
        const tasks = await fetchAllTasksWithChildren(filterProjectId, undefined, true, false);
        setFilterProjectTasks(tasks);
      } else {
        setFilterProjectTasks([]);
      }
    };
    loadFilterTasks();
  }, [filterProjectId]);

  useEffect(() => {
    const loadUsers = async () => {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersData = querySnapshot.docs.reduce((acc, doc) => {
        const userData = doc.data() as UserData; // Cast to UserData
        if (userData.verified && userData.role !== "customer") {
          const { id, ...rest } = userData; // Destructure to remove id
          return {
            ...acc,
            [doc.id]: { id: doc.id, ...rest }, // Now spread rest which does not include id
          };
        }
        return acc;
      }, {} as Record<string, UserData>);
      setUsers(usersData);

      // Set the selected user to the current user if available
      if (auth.currentUser?.uid) {
        const foundUser = usersData[auth.currentUser.uid];
        if (foundUser) {
          setSelectedUser(foundUser);
          setSelectedUserId(auth.currentUser.uid);
        }
      }
    };

    loadUsers();
  }, []);

  const [taskLookup, setTaskLookup] = useState<Map<string, string>>(new Map()); // Map taskId -> taskName

  useEffect(() => {
    const loadLookupTasks = async () => {
      const projectIds = Array.from(new Set(timeSheets.map(ts => ts.projectId).filter(Boolean)));
      const newLookup = new Map(taskLookup);

      for (const pid of projectIds) {
        // Fetch without updating global state
        const tasks = await fetchAllTasksWithChildren(pid as string, undefined, false, false);
        const flatten = (tList: Task[]) => {
          tList.forEach(t => {
            newLookup.set(t.id, t.name);
            if (t.children) flatten(t.children);
          });
        };
        flatten(tasks);
      }
      setTaskLookup(newLookup);
    };

    if (timeSheets.length > 0) {
      loadLookupTasks();
    }
  }, [timeSheets]);

  useEffect(() => {
    if (user && user.uid && userData?.fullName && user.email) {
      fetchTimeSheets(user.uid);
      fetchUserTasks({
        id: user.uid,
        name: userData.fullName,
        email: user.email,
      });
      fetchProjects(); // Fetch projects
    }
  }, [user, userData]);

  const handleAddTimeSheet = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    if (user?.uid) {
      if (editingTimeSheetId) {
        // Update existing time sheet
        await updateTimeSheet({
          ...newTimeSheet,
          userId: user.uid,
          id: editingTimeSheetId,
        }); // Include createdAt
      } else {
        // Add new time sheet
        await addTimeSheet({ ...newTimeSheet, userId: user.uid });
      }
      setShowModal(false);
      setNewTimeSheet({
        title: "",
        description: "",
        hours: 0,
        minutes: 0,
        projectId: "",
        taskIds: [],
      });
      setProjectTasks([]); // Reset tasks
      setEditingTimeSheetId(null); // Reset editing ID
    } else {
      console.error("User ID is not defined");
    }
  };

  const handleEditTimeSheet = (sheet: {
    id: string;
    title: string;
    description: string;
    hours: number;
    minutes: number;
    projectId?: string;
    taskIds?: string[];
  }) => {
    setNewTimeSheet({
      title: sheet.title,
      description: sheet.description,
      hours: sheet.hours,
      minutes: sheet.minutes,
      projectId: sheet.projectId || "",
      taskIds: sheet.taskIds || [],
    });

    if (sheet.projectId) {
      const loadTasks = async () => {
        const tasks = await fetchAllTasksWithChildren(sheet.projectId!);
        setProjectTasks(tasks);
      };
      loadTasks();
    } else {
      setProjectTasks([]);
    }

    setEditingTimeSheetId(sheet.id);
    setShowModal(true);
  };

  const handleDeleteTimeSheet = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this time sheet?")) {
      await deleteTimeSheet(id);
    }
  };

  const handleFetchUserTimeSheets = async () => {
    if (selectedUserId && selectedUser) {
      await fetchTimeSheets(selectedUserId);
      await fetchUserTasks({
        id: selectedUser.id,
        name: selectedUser.fullName,
        email: selectedUser.email,
      });
      setHasChnaged(false);
    }
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUserId = e.target.value;
    setSelectedUserId(selectedUserId);
    setHasChnaged(true);
    const data = users[selectedUserId]; // Directly access the user by ID
    setSelectedUser(data || null); // Set selected user or null if not found
    handleFetchUserTimeSheets(); // Fetch time sheets and tasks for the selected user
  };

  const toggleRowExpansion = (id: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  const toggleTaskRowExpansion = (id: string) => {
    const newExpandedTaskRows = new Set(expandedTaskRows);
    if (newExpandedTaskRows.has(id)) {
      newExpandedTaskRows.delete(id);
    } else {
      newExpandedTaskRows.add(id);
    }
    setExpandedTaskRows(newExpandedTaskRows);
  };

  // Filter logic
  const filteredTimeSheets = timeSheets.filter((sheet) => {
    if (filterProjectId && sheet.projectId !== filterProjectId) return false;
    if (filterTaskId && !sheet.taskIds?.includes(filterTaskId)) return false;
    return true;
  });

  const filteredTasks = tasks.filter((task) => {
    if (filterProjectId && task.projectId !== filterProjectId) return false;
    if (filterTaskId && task.id !== filterTaskId) return false;
    return true;
  });

  // Calculate total time spent (using filtered data)
  const totalTime = filteredTimeSheets.reduce(
    (acc, sheet) => {
      acc.hours += sheet.hours;
      acc.minutes += sheet.minutes;
      return acc;
    },
    { hours: 0, minutes: 0 }
  );

  // Convert total minutes to hours
  totalTime.hours += Math.floor(totalTime.minutes / 60);
  totalTime.minutes = totalTime.minutes % 60;

  // Calculate total time spent on tasks (using filtered data)
  const totalTaskTime = filteredTasks.reduce(
    (acc, task) => {
      if (task.timeEntries) {
        task.timeEntries.forEach((entry) => {
          if (entry.userId === (selectedUserId || user?.uid)) { // Ensure we only count user's time
            acc.minutes += entry.duration;
          }
        });
      }
      return acc;
    },
    { hours: 0, minutes: 0 }
  );

  // Convert total task minutes to hours
  totalTaskTime.hours += Math.floor(totalTaskTime.minutes / 60);
  totalTaskTime.minutes = totalTaskTime.minutes % 60;

  return (
    <div className="p-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold mb-4">Time Sheet</h1>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black/90 hover:bg-black/80"
        >
          Add to Time Sheet
        </button>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center flex-wrap">
        {userData?.role === "admin" && (
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs font-semibold text-gray-500 uppercase">User</label>
            <select
              onChange={handleUserChange}
              value={selectedUserId}
              className="p-2 border rounded bg-white min-w-[200px] shadow-sm focus:ring-2 focus:ring-black/5 outline-none"
            >
              <option value="">Select a user...</option>
              {Object.values(users).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-semibold text-gray-500 uppercase">Project</label>
          <select
            value={filterProjectId}
            onChange={(e) => {
              setFilterProjectId(e.target.value);
              setFilterTaskId(""); // Reset task filter when project changes
            }}
            className="p-2 border rounded bg-white min-w-[200px] shadow-sm focus:ring-2 focus:ring-black/5 outline-none"
          >
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-semibold text-gray-500 uppercase">Task</label>
          <select
            value={filterTaskId}
            onChange={(e) => setFilterTaskId(e.target.value)}
            className="p-2 border rounded bg-white min-w-[200px] shadow-sm focus:ring-2 focus:ring-black/5 outline-none disabled:bg-gray-100 disabled:text-gray-400"
            disabled={!filterProjectId}
          >
            <option value="">All Tasks</option>
            {filterProjectTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleFetchUserTimeSheets}
          className={`inline-flex items-center px-4 py-2 mt-auto border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors ${HasChnaged && "animate-pulse"
            }`}
        >
          Fetch Time Sheets
        </button>
      </div>
      {filteredTimeSheets.length > 0 ? (
        <>
          <h2 className="text-xl font-bold my-6">User Extra Time Entries</h2>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tasks
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Spent
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTimeSheets.map((sheet) => (
                <React.Fragment key={sheet.id}>
                  <tr
                    onClick={() => toggleRowExpansion(sheet.id)}
                    className="hover:bg-gray-50 hover:cursor-pointer text-center"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <span className="relative group">{sheet.title}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {projects.find((p) => p.id === sheet.projectId)?.name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs overflow-hidden text-ellipsis">
                      {sheet.taskIds?.map(taskId => {
                        const taskName = taskLookup.get(taskId) || tasks.find(t => t.id === taskId)?.name;
                        return taskName || "";
                      }).filter(Boolean).join(", ") || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sheet.hours} Hours {sheet.minutes} Minutes
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex justify-center gap-3">
                      <button
                        onClick={() => handleEditTimeSheet(sheet)}
                        className="text-blue-600 hover:text-blue-900 mr-2"
                      >
                        <Edit2Icon size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteTimeSheet(sheet.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => toggleRowExpansion(sheet.id)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        {expandedRows.has(sheet.id) ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </button>
                    </td>
                  </tr>
                  {expandedRows.has(sheet.id) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 bg-gray-100">
                        <div>
                          <h3 className="font-semibold">Details:</h3>
                          <p>Title: {sheet.title}</p>
                          <p>Description: {sheet.description}</p>
                          <p>
                            Time Taken: {sheet.hours} Hours {sheet.minutes}{" "}
                            Minutes
                          </p>
                          <p>
                            Created At:{" "}
                            {sheet.createdAt.toDate().toLocaleString()}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-4 bg-green-500 text-md font-semibold text-gray-900 text-right"
                >
                  Total Time Spent: {totalTime.hours} hours {totalTime.minutes}{" "}
                  minutes
                </td>
              </tr>
            </tbody>
          </table>
          <h2 className="text-xl font-bold mt-6">User Task Time Entries</h2>
          {filteredTasks.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 mt-4">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time Entries
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider flex justify-end">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.map((task) => (
                  <React.Fragment key={task.id}>
                    <tr
                      onClick={() => toggleTaskRowExpansion(task.id)}
                      className="hover:bg-gray-50 hover:cursor-pointer"
                    >
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
                      <td className=" py-4 whitespace-nowrap text-sm text-gray-500 flex justify-end items-center pr-12">
                        <button
                          onClick={() => toggleRowExpansion(task.id)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          {expandedRows.has(task.id) ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedTaskRows.has(task.id) && (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 bg-gray-100">
                          <div>
                            <h3 className="font-semibold">Task Details:</h3>
                            <p>Description: {task.description}</p>
                            <p>
                              Assigned To:{" "}
                              {task.assignedTo
                                ?.map((user) => user.name)
                                .join(", ")}
                            </p>
                            <p>
                              Deadline: {task.deadline || "No deadline set"}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-4 bg-green-500 text-md font-semibold text-gray-900 text-right"
                  >
                    Total Time Spent on Tasks: {totalTaskTime.hours} hours{" "}
                    {totalTaskTime.minutes} minutes
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="bg-white shadow-md rounded-lg p-4 mb-4">
              <h2 className="text-lg font-semibold">No Tasks Available</h2>
              <p>Please add tasks to see the entries.</p>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-4 mb-4">
          <h2 className="text-lg font-semibold">No Time Sheets Available</h2>
          <p>Please add a time sheet to see the entries.</p>
        </div>
      )}
      <CustomModal isOpen={showModal} onClose={() => setShowModal(false)}>
        <h2 className="text-xl font-bold mb-4">
          {editingTimeSheetId ? "Edit Time Sheet" : "Add Time Sheet"}
        </h2>
        <form onSubmit={handleAddTimeSheet}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Project (Optional)</label>
            <select
              value={newTimeSheet.projectId || ""}
              onChange={async (e) => {
                const projectId = e.target.value;
                setNewTimeSheet({ ...newTimeSheet, projectId, taskIds: [] });
                if (projectId) {
                  // Force fetch tasks for the dropdown WITHOUT updating global state
                  const tasks = await fetchAllTasksWithChildren(projectId, undefined, true, false);
                  setProjectTasks(tasks);
                } else {
                  setProjectTasks([]);
                }
              }}
              className="w-full p-2 border rounded"
            >
              <option value="">Select a project...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {newTimeSheet.projectId && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Tasks (Optional)</label>
              <div className="max-h-40 overflow-y-auto border rounded p-2 bg-white">
                {projectTasks.length > 0 ? (
                  projectTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 mb-1">
                      <input
                        type="checkbox"
                        id={`task-${task.id}`}
                        checked={newTimeSheet.taskIds?.includes(task.id) || false}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          const currentTaskIds = newTimeSheet.taskIds || [];
                          if (isChecked) {
                            setNewTimeSheet({
                              ...newTimeSheet,
                              taskIds: [...currentTaskIds, task.id],
                            });
                          } else {
                            setNewTimeSheet({
                              ...newTimeSheet,
                              taskIds: currentTaskIds.filter((id) => id !== task.id),
                            });
                          }
                        }}
                      />
                      <label htmlFor={`task-${task.id}`} className="text-sm cursor-pointer">
                        {task.name}
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No tasks found for this project.</p>
                )}
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              placeholder="Enter title"
              value={newTimeSheet.title}
              onChange={(e) =>
                setNewTimeSheet({ ...newTimeSheet, title: e.target.value })
              }
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              placeholder="Enter description"
              value={newTimeSheet.description}
              onChange={(e) =>
                setNewTimeSheet({
                  ...newTimeSheet,
                  description: e.target.value,
                })
              }
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Hours</label>
            <input
              type="number"
              placeholder="Enter hours"
              value={newTimeSheet.hours}
              onChange={(e) =>
                setNewTimeSheet({
                  ...newTimeSheet,
                  hours: Number(e.target.value),
                })
              }
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Minutes</label>
            <input
              type="number"
              placeholder="Enter minutes"
              value={newTimeSheet.minutes}
              onChange={(e) =>
                setNewTimeSheet({
                  ...newTimeSheet,
                  minutes: Number(e.target.value),
                })
              }
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-gray-600 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-red-600 rounded"
            >
              Submit
            </button>
          </div>
        </form>
      </CustomModal>
    </div>
  );
};

export default TimeSheet;
