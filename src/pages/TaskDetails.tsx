import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjectStore } from "../store/projectStore";
import {
  Loader2,
  ArrowLeft,
  Play,
  Square,
  Clock,
  User,
  Plus,
  Minus,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import toast from "react-hot-toast";
import TaskModal from "../components/TaskModal";
import TaskList from "../components/TaskList";
import ItemDetails from "../components/ItemDetails";
import { Task, useTaskStore, TimeEntry } from "../store/taskStore";
import { useOutsourceTeamStore } from "../store/outsourceTeamStore";
import { useSettlementStore } from "../store/settlementStore";

export default function TaskDetails() {
  const { id: projectId, "*": taskPath } = useParams();
  const taskId = taskPath?.split("/")[taskPath.split("/").length - 1];

  const navigate = useNavigate();
  const { loading, setCurrentPath } = useProjectStore();
  const {
    tasks,
    addTask,
    fetchAllTasksWithChildren,
    task,
    checkActiveTime,
    updateTask,
    deleteTask,
    getTaskTimeEntries,
    startTimer,
    stopTimer,
  } = useTaskStore();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");
  const { user, userData } = useAuthStore();
  const [currentDuration, setCurrentDuration] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualHours, setManualHours] = useState(0);
  const [manualMinutes, setManualMinutes] = useState(0);
  const [exceptionCase, setExceptionCase] = useState(false);
  const [showOutsourceModal, setShowOutsourceModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [outsourceAmount, setOutsourceAmount] = useState<string>("");
  const { teams, fetchTeams, fetchTeamById } = useOutsourceTeamStore();
  const { createSettlement } = useSettlementStore();
  const [outsourcedTeam, setOutsourcedTeam] = useState<{ name: string } | null>(null);

  const formatTimeDisplay = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const getChildTasks = (parentId: string) => {
    return tasks.filter((task) => task.parentId === parentId);
  };

  const loadTask = async () => {
    if (!projectId || !taskPath) {
      navigate(`/dashboard/projects/${projectId}`);
      return;
    }

    try {
      await fetchAllTasksWithChildren(projectId, taskId);
    } catch (error) {
      console.error("Error loading task:", error);
      toast.error("Failed to load task");
      navigate(`/dashboard/projects/${projectId}`);
    }
  };

  const findUserEntry = (entries: TimeEntry[]) => {
    const userEntry = entries.find((entry) => entry.userId === user?.uid);
    if (userEntry) {
      setCurrentDuration(userEntry.duration || 0);
      // Display the current duration
      const totalSeconds = Math.floor(userEntry.duration * 60); // Convert minutes to seconds
      setElapsedTime(formatTimeDisplay(totalSeconds));
    }
  };

  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        setIsAdmin(userData?.role === "admin");
      }
    };

    const initializeActiveTimer = async () => {
      try {
        const timer = task?.timeEntries?.find(
          (entry) => entry.userId === user?.uid
        );
        // console.log(timer, "timer");

        if (timer) {
          const localTimer = localStorage.getItem("activeTimer");
          if (localTimer) {
            const parsedTimer = JSON.parse(localTimer);
            if (parsedTimer.taskId === task?.id) {
              setIsTimerActive(true);
            }
          }
          setCurrentDuration(timer.duration);
          setElapsedTime(formatTimeDisplay(timer.duration * 60));
        }
      } catch (error) {
        console.error("Error checking active timer:", error);
      }
    };

    loadTask();
    checkUserRole();
    initializeActiveTimer();

    return () => {
      setIsTimerActive(false);
      setManualHours(0);
      setManualMinutes(0);
      setCurrentDuration(0);
      setElapsedTime("00:00:00");
      setIsAdmin(false);
      setCurrentPath([]);
    };
  }, [projectId, taskPath, user, taskId , task]);

  // Timer effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isTimerActive) {
      const updateElapsedTime = () => {
        const storedTimer = localStorage.getItem("activeTimer");
        if (storedTimer) {
          const timer = JSON.parse(storedTimer);
          const start = new Date(timer.startTime).getTime();
          const now = new Date().getTime();
          const elapsedSeconds = Math.floor((now - start) / 1000);

          // Calculate total seconds including the current duration
          const totalMinutes = Math.floor(currentDuration);
          const totalSeconds = Math.floor(totalMinutes * 60) + elapsedSeconds;

          setElapsedTime(formatTimeDisplay(totalSeconds));
        }
      };

      updateElapsedTime();
      intervalId = setInterval(updateElapsedTime, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isTimerActive, currentDuration]);

  const handleToggleComplete = async () => {
    if (!projectId || !task) return;

    // Check if task has subtasks and if they're all complete
    const childTasks = getChildTasks(task.id);
    const hasSubtasks = childTasks.length > 0;
    const allSubtasksComplete = hasSubtasks
      ? childTasks.every((subtask) => subtask.completed)
      : true;

    if (hasSubtasks && !allSubtasksComplete && !task.completed) {
      toast.error("Cannot complete task - some subtasks are still pending");
      return;
    }

    try {
      await updateTask(task.id, {
        completed: !task.completed,
      });
      toast.success(
        task.completed ? "Task marked as complete" : "Task marked as incomplete"
      );
    } catch (error) {
      console.error("Error toggling task completion:", error);
      toast.error("Failed to update task status");
    }
  };

  const handleAddTask = async (data: Omit<Task, "id">) => {
    if (!projectId || !task) return;
    try {
      await addTask({
        ...data,
        completed: false,
        projectId: task.projectId,
        parentId: task.id,
      });
      toast.success("Task added successfully");
    } catch (error) {
      console.error("Failed to add task:", error);
      toast.error("Failed to add task");
    }
  };

  const handleEditTask = async (data: Partial<Task>) => {
    if (!projectId || !task) return;
    try {
      await updateTask(data.id as string, data, true);
      toast.success("Task updated successfully");
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!projectId) return;
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteTask(taskId);
        toast.success("Task deleted successfully");
      } catch (error) {
        console.error("Failed to delete task:", error);
        toast.error("Failed to delete task");
      }
    }
  };

  const handleTaskClick = (clickedTask: Task) => {
    const newPath = taskPath ? `${taskPath}/${clickedTask.id}` : clickedTask.id;
    navigate(`/dashboard/projects/${projectId}/task/${newPath}`);
  };

  const handleStartTimer = async () => {
    try {
      if (!projectId || !task) return;
      await startTimer(task.id, {
        id: user?.uid || "",
        name: userData?.fullName || "",
      });
      setIsTimerActive(true);
      localStorage.setItem(
        "activeTimer",
        JSON.stringify({
          startTime: new Date().toISOString(),
          taskId: task.id,
        })
      );
    } catch (error) {
      console.error("Error starting timer:", error);
      toast.error("Failed to start timer");
    }
  };

  const handleStopTimer = async () => {
    try {
      if (!projectId || !task) return;
      await stopTimer(task.id, {
        id: user?.uid || "",
        name: userData?.fullName || "",
      });
      setIsTimerActive(false);
      localStorage.removeItem("activeTimer");

      // Update current duration from the latest time entries
      const entries = await getTaskTimeEntries(task.id);
      if (entries) {
        const userEntry = entries.find((entry) => entry.userId === user?.uid);
        if (userEntry) {
          setCurrentDuration(userEntry.duration || 0);
          const totalSeconds = Math.floor(userEntry.duration * 60);
          setElapsedTime(formatTimeDisplay(totalSeconds));
        }
      }
    } catch (error) {
      console.error("Error stopping timer:", error);
      toast.error("Failed to stop timer");
    }
  };

  const aggregateTimeByUser = (
    entries: TimeEntry[]
  ): { email: string; totalMinutes: number }[] => {
    const userTimes = entries.reduce((acc, entry) => {
      if (!entry.duration) return acc;

      const key = entry.userName;
      if (!acc[key]) {
        acc[key] = {
          email: entry.userName,
          totalMinutes: 0,
        };
      }
      acc[key].totalMinutes += entry.duration;
      return acc;
    }, {} as Record<string, { email: string; totalMinutes: number }>);

    return Object.values(userTimes);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = (minutes % 60).toFixed(0);
    return `${hours}h ${remainingMinutes}m`;
  };

  useEffect(() => {
    const isAssignedToCurrentUser = (task: Task) => {
      // return task.assignedTo?.some((u) => u.id === user?.uid);
      const result = task.assignedTo?.find((u) => u.id === user?.uid);
      if (!result) {
        return false;
      }
      return true;
    };

    if (task) {
      const result2 = isAssignedToCurrentUser(task);
      setExceptionCase(result2);
    }
  }, [task, user]);

  const handleOpenManualEntry = () => {
    setManualHours(0);
    setManualMinutes(0);
    setShowManualEntry(true);
  };

  const handleManualTimeAdd = async () => {
    try {
      if (!projectId || !task) return;

      const totalMinutes = manualHours * 60 + manualMinutes;

      if (totalMinutes <= 0) {
        toast.error("Please enter a valid time");
        return;
      }

      // Add the new time to the current duration
      const newDuration = currentDuration + totalMinutes;
      // Find existing time entry for current user
      const existingEntry = task.timeEntries?.find(
        (entry) => entry.userId === user?.uid
      );

      let updatedTimeEntries;
      if (existingEntry) {
        // Update existing entry
        updatedTimeEntries = task.timeEntries?.map((entry) => {
          if (entry.userId === user?.uid) {
            // console.log("entry", entry);
            const newDuration = entry.duration + totalMinutes;
            // console.log("newDuration", newDuration);
            return {
              ...entry,
              duration: newDuration,
            };
          }
          return entry;
        });
      } else {
        // Add new entry
        updatedTimeEntries = [
          ...(task.timeEntries || []),
          {
            userId: user?.uid || "",
            userName: user?.email || "",
            duration: totalMinutes,
            startTime: new Date().toISOString(),
            id: crypto.randomUUID(),
          },
        ];
      }

      await updateTask(task.id, {
        ...task,
        timeEntries: updatedTimeEntries,
      });

      // Update the display with the new total duration
      setCurrentDuration(newDuration);
      setElapsedTime(formatTimeDisplay(newDuration * 60)); // Convert minutes to seconds and format

      setShowManualEntry(false);
      const entries = await getTaskTimeEntries(task.id);
      findUserEntry(entries || []);
      toast.success("Time added successfully");
    } catch (error) {
      console.error("Error updating time:", error);
      toast.error("Failed to update time");
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleOutsourceSubmit = async () => {
    try {
      if (!selectedTeam || !outsourceAmount || !task) {
        toast.error("Please select a team and enter amount");
        return;
      }

      // Update task with outsource team id
      await updateTask(task.id, {
        outsource_team_id: selectedTeam
      });

      // Create settlement
      await createSettlement({
        task_id: task.id,
        team_id: selectedTeam,
        total_amount: outsourceAmount,
        amounts_paid: []
      });

      setShowOutsourceModal(false);
      setSelectedTeam("");
      setOutsourceAmount("");
      toast.success("Task outsourced successfully");
    } catch (error) {
      console.error("Error outsourcing task:", error);
      toast.error("Failed to outsource task");
    }
  };

  useEffect(() => {
    const fetchOutsourcedTeam = async () => {
      if (task?.outsource_team_id) {
        try {
          const team = await fetchTeamById(task.outsource_team_id);
          if (team) {
            setOutsourcedTeam(team);
          }
        } catch (error) {
          console.error("Error fetching outsourced team:", error);
        }
      } else {
        setOutsourcedTeam(null);
      }
    };

    fetchOutsourcedTeam();
  }, [task?.outsource_team_id, fetchTeamById]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6">
        <p className="text-red-500">Task not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className=" h-7 w-7" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{task.name}</h1>
            {task.outsource_team_id && outsourcedTeam && (
              <div className="mt-1 flex items-center text-sm text-gray-600">
                <span className="font-medium">Outsourced to:</span>
                <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded">
                  {outsourcedTeam.name}
                </span>
              </div>
            )}
          </div>
        </div>
        {exceptionCase && (
          <div className="flex items-center space-x-4">
            {(isTimerActive || currentDuration > 0) && (
              <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-md">
                <Clock className="h-4 w-4" />
                <span className="font-mono">{elapsedTime}</span>
              </div>
            )}
            <button
              onClick={isTimerActive ? handleStopTimer : handleStartTimer}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                isTimerActive
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isTimerActive ? (
                <>
                  <Square className="mr-2 h-4 w-4" />
                  Stop Timer
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Timer
                </>
              )}
            </button>

            <button
              onClick={handleOpenManualEntry}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Time
            </button>

            {!task?.outsource_team_id && (
              <button
                onClick={() => setShowOutsourceModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Outsource Task
              </button>
            )}
          </div>
        )}
      </div>

      <ItemDetails
        item={task}
        tasks={task.children}
        onEditClick={() => {
          setEditingTask(task);
          setIsModalOpen(true);
        }}
        onToggleComplete={handleToggleComplete}
        isAdmin={isAdmin}
        canComplete={isAdmin || exceptionCase}
      />

      {(task.timeEntries?.length ?? 0) > 0 && (
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
            <h3 className="text-lg font-medium text-gray-900">Time Spent</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {aggregateTimeByUser(task.timeEntries || []).map((userTime) => (
                <div
                  key={userTime.email}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">{userTime.email}</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Clock className="h-4 w-4 mr-2" />
                    {formatDuration(userTime.totalMinutes)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <TaskList
        tasks={task.children as Task[]}
        onAddClick={() => setIsModalOpen(true)}
        onEditClick={(task) => {
          setEditingTask(task);
          setIsModalOpen(true);
        }}
        onDeleteClick={handleDeleteTask}
        onTaskClick={handleTaskClick}
        isAdmin={isAdmin}
        currentUserId={user?.uid}
        exceptionCase={exceptionCase}
      />

      <TaskModal
        tasks={task.children as Task[]}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={editingTask ? handleEditTask : handleAddTask}
        initialData={editingTask || undefined}
      />

      {showManualEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">Add Time Manually</h3>

            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <div className="text-sm text-gray-500 mb-1">Current Duration</div>
              <div className="text-lg font-medium">
                {Math.floor(currentDuration / 60)}h{" "}
                {Math.floor(currentDuration % 60)}m
              </div>
            </div>

            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hours to Add
                </label>
                <div className="flex items-center">
                  <button
                    onClick={() => setManualHours(Math.max(0, manualHours - 1))}
                    className="p-2 bg-gray-100 rounded-l-md hover:bg-gray-200"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={manualHours}
                    onChange={(e) =>
                      setManualHours(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-full text-center border-y p-2"
                  />
                  <button
                    onClick={() => setManualHours(manualHours + 1)}
                    className="p-2 bg-gray-100 rounded-r-md hover:bg-gray-200"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minutes to Add
                </label>
                <div className="flex items-center">
                  <button
                    onClick={() =>
                      setManualMinutes(Math.max(0, manualMinutes - 15))
                    }
                    className="p-2 bg-gray-100 rounded-l-md hover:bg-gray-200"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={manualMinutes}
                    onChange={(e) =>
                      setManualMinutes(
                        Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                      )
                    }
                    className="w-full text-center border-y p-2"
                  />
                  <button
                    onClick={() =>
                      setManualMinutes(Math.min(59, manualMinutes + 15))
                    }
                    className="p-2 bg-gray-100 rounded-r-md hover:bg-gray-200"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-md">
              <div className="text-sm text-blue-600 mb-1">
                New Total Duration
              </div>
              <div className="text-lg font-medium text-blue-700">
                {Math.floor(
                  (currentDuration + manualHours * 60 + manualMinutes) / 60
                )}
                h{" "}
                {Math.floor(
                  (currentDuration + manualHours * 60 + manualMinutes) % 60
                )}
                m
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowManualEntry(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleManualTimeAdd}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Time
              </button>
            </div>
          </div>
        </div>
      )}

      {showOutsourceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">Outsource Task</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Team
              </label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select a team...</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                type="text"
                value={outsourceAmount}
                onChange={(e) => setOutsourceAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full p-2 border rounded-md"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowOutsourceModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleOutsourceSubmit}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
