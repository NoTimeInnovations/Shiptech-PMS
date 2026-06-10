import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Project, useProjectStore } from "../store/projectStore";
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
import { Settlement } from "../store/settlementStore";
import { useTodoStore } from "../store/todoStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TaskDetails() {
  const { id: projectId, "*": taskPath } = useParams();
  const taskId = taskPath?.split("/")[taskPath.split("/").length - 1];

  const navigate = useNavigate();
  const { loading, setCurrentPath, fetchProject, project } = useProjectStore();
  const {
    tasks,
    addTask,
    fetchAllTasksWithChildren,
    task,
    updateTask,
    deleteTask,
    getTaskTimeEntries,
    startTimer,
    stopTimer,
    searchTaskFromTree
  } = useTaskStore();

  const { taskTodos, fetchTaskTodos, toggleTodoComplete: toggleReminderComplete } = useTodoStore();
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
  const { createSettlement } =
    useSettlementStore();
  const [outsourcedTeam, setOutsourcedTeam] = useState<{ name: string } | null>(
    null
  );
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [settlementToDelete, setSettlementToDelete] =
    useState<Settlement | null>(null);

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
  const [parentTaskCompleted, setParentTaskCompleted] = useState(false);

  useEffect(() => {
    const checkParentTaskCompletion = async () => {
      if (task?.parentId) {
        const parentTask = await searchTaskFromTree(task.parentId, tasks);
        setParentTaskCompleted(parentTask?.completed || false);
      } else {
        setParentTaskCompleted(false);
      }
    };

    checkParentTaskCompletion();
  }, [task?.parentId, searchTaskFromTree]);

  useEffect(() => {
    fetchProject(projectId as string)
  }, [])

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
  }, [projectId, taskPath, user, taskId, task]);

  // Fetch reminders
  useEffect(() => {
    if (task?.id) {
      fetchTaskTodos(task.id);
    }
  }, [task?.id, fetchTaskTodos]);

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
        !task.completed ? "Task marked as complete" : "Task marked as incomplete"
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
        outsource_team_id: selectedTeam,
      });

      // Create settlement
      await createSettlement({
        task_id: task.id,
        team_id: selectedTeam,
        total_amount: outsourceAmount,
        amounts_paid: [],
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

  const handleRemoveOutsourceTeam = async () => {
    try {
      if (!task) return;

      // Fetch the settlement for this task
      const settlements = await useSettlementStore
        .getState()
        .fetchTeamSettlementsWithTaskID(task.outsource_team_id!, task.id);
      const taskSettlement = settlements.find((s) => s.task_id === task.id);

      if (!taskSettlement) {
        toast.error("Settlement not found");
        return;
      }

      console.log("taskSettlement", taskSettlement.id);

      // If there are paid amounts, show confirmation modal
      if (taskSettlement.amounts_paid.length > 0) {
        setSettlementToDelete(taskSettlement);
        setShowDeleteConfirmModal(true);
        return;
      }

      // If no paid amounts, proceed with deletion
      await handleConfirmRemoveOutsource(taskSettlement);
    } catch (error) {
      console.error("Error removing outsource team:", error);
      toast.error("Failed to remove outsource team");
    }
  };

  const handleConfirmRemoveOutsource = async (taskSettlement: Settlement) => {
    try {
      if (!task) return;
      console.log("task.id", task.id);

      // Update task to remove outsource team
      await updateTask(task.id, {
        outsource_team_id: "",
      });

      console.log("taskSettlement", taskSettlement);

      console.log("settlementToDelete.id", taskSettlement.id);
      await useSettlementStore
        .getState()
        .deleteSettlement(taskSettlement.id);

      setShowDeleteConfirmModal(false);
      setSettlementToDelete(null);
      setOutsourcedTeam(null);
      toast.success("Outsource team removed successfully");
    } catch (error) {
      console.error("Error confirming outsource team removal:", error);
      toast.error("Failed to remove outsource team");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6">
        <p className="text-destructive">Task not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-heading font-semibold">{task.name}</h1>
            {task.outsource_team_id && outsourcedTeam && (
              <div className="mt-1 flex items-center text-sm text-muted-foreground">
                <span className="font-medium">Outsourced to:</span>
                <Badge variant="secondary" className="ml-2">
                  {outsourcedTeam.name}
                </Badge>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-4">
          {exceptionCase && (
            <div className="flex items-center gap-4">
              {(isTimerActive || currentDuration > 0) && (
                <div className="flex items-center gap-2 bg-muted text-foreground px-3 py-2 rounded-md">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono">{elapsedTime}</span>
                </div>
              )}
              <Button
                onClick={isTimerActive ? handleStopTimer : handleStartTimer}
                variant={isTimerActive ? "destructive" : "default"}
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
              </Button>

              <Button onClick={handleOpenManualEntry}>
                <Plus className="mr-2 h-4 w-4" />
                Add Time
              </Button>
            </div>
          )}
          {isAdmin && !task?.outsource_team_id && (
            <Button variant="secondary" onClick={() => setShowOutsourceModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Outsource Task
            </Button>
          )}
          {isAdmin && task?.outsource_team_id && (
            <Button variant="secondary" onClick={handleRemoveOutsourceTeam}>
              <Minus className="mr-2 h-4 w-4" />
              Remove Outsource Team
            </Button>
          )}
        </div>
      </div>



      <ItemDetails
        item={task}
        tasks={task.children}
        onEditClick={() => {
          setEditingTask(task);
          setIsModalOpen(true);
        }}
        exceptionCase={exceptionCase}
        onToggleComplete={handleToggleComplete}
        isAdmin={isAdmin}
        canComplete={isAdmin || exceptionCase}
        parentTaskCompleted={parentTaskCompleted} // Add this prop
      />

      {(task.timeEntries?.length ?? 0) > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Time Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {aggregateTimeByUser(task.timeEntries || []).map((userTime) => (
                <div
                  key={userTime.email}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{userTime.email}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="h-4 w-4 mr-2" />
                    {formatDuration(userTime.totalMinutes)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {taskTodos.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>To-Dos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {taskTodos.map((reminder) => (
                <div
                  key={reminder.id}
                  className={`p-4 rounded-lg border border-border ${reminder.completed ? "bg-muted" : "bg-card"
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3
                        className={`text-sm font-semibold ${reminder.completed ? "line-through text-muted-foreground" : ""
                          }`}
                      >
                        {reminder.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {reminder.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Due:{" "}
                        {new Date(reminder.endDate).toLocaleString("en-GB", {
                          year: "numeric",
                          month: "numeric",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </p>
                    </div>
                    <div>
                      <Button
                        variant={reminder.completed ? "secondary" : "outline"}
                        size="sm"
                        className={reminder.completed ? "text-green-600" : "text-muted-foreground"}
                        onClick={() => toggleReminderComplete(reminder.id)}
                      >
                        {reminder.completed ? "Completed" : "Mark Complete"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
        parentAccess={exceptionCase}
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
        project={project as Project}
      />

      <Dialog open={showManualEntry} onOpenChange={setShowManualEntry}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Time Manually</DialogTitle>
          </DialogHeader>

          <div className="p-3 bg-muted rounded-md">
            <div className="text-sm text-muted-foreground mb-1">
              Current Duration
            </div>
            <div className="text-lg font-medium">
              {Math.floor(currentDuration / 60)}h{" "}
              {Math.floor(currentDuration % 60)}m
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-1">
              <Label>Hours to Add</Label>
              <div className="flex items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-r-none"
                  onClick={() => setManualHours(Math.max(0, manualHours - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min="0"
                  value={manualHours}
                  onChange={(e) =>
                    setManualHours(Math.max(0, parseInt(e.target.value) || 0))
                  }
                  className="w-full text-center rounded-none border-x-0"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-l-none"
                  onClick={() => setManualHours(manualHours + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 space-y-1">
              <Label>Minutes to Add</Label>
              <div className="flex items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-r-none"
                  onClick={() =>
                    setManualMinutes(Math.max(0, manualMinutes - 15))
                  }
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={manualMinutes}
                  onChange={(e) =>
                    setManualMinutes(
                      Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                    )
                  }
                  className="w-full text-center rounded-none border-x-0"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-l-none"
                  onClick={() =>
                    setManualMinutes(Math.min(59, manualMinutes + 15))
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="p-3 bg-accent rounded-md">
            <div className="text-sm text-muted-foreground mb-1">
              New Total Duration
            </div>
            <div className="text-lg font-medium">
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualEntry(false)}>
              Cancel
            </Button>
            <Button onClick={handleManualTimeAdd}>Add Time</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showOutsourceModal} onOpenChange={setShowOutsourceModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Outsource Task</DialogTitle>
          </DialogHeader>

          <div className="space-y-1">
            <Label>Select Team</Label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a team..." />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id as string}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Amount</Label>
            <Input
              type="text"
              value={outsourceAmount}
              onChange={(e) => setOutsourceAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowOutsourceModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleOutsourceSubmit}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showDeleteConfirmModal && !!settlementToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setShowDeleteConfirmModal(false);
            setSettlementToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Warning</AlertDialogTitle>
            <AlertDialogDescription>
              This task has partial payments recorded. Removing the outsource
              team will delete all payment records. Are you sure you want to
              continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowDeleteConfirmModal(false);
                setSettlementToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() =>
                settlementToDelete &&
                handleConfirmRemoveOutsource(settlementToDelete)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
