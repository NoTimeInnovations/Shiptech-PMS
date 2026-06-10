import React, { useEffect, useState } from "react";
import { useTimeSheetStore } from "@/store/timeSheetStore";
import { useProjectStore } from "@/store/projectStore"; // Import project store
import { useAuthStore, UserData } from "@/store/authStore";
import { useTaskStore, Task } from "@/store/taskStore"; // Import Task interface and store
import CustomModal from "@/components/CustomModal"; // Import the custom modal
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Trash2, Edit2Icon, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
        <div className="mb-4">
          <h1 className="text-2xl font-heading font-semibold">Time Sheet</h1>
          <p className="text-muted-foreground text-sm">
            Track and review time entries across projects and tasks.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>Add to Time Sheet</Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center flex-wrap">
        {userData?.role === "admin" && (
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <Label className="text-xs font-semibold text-muted-foreground uppercase">
              User
            </Label>
            <Select
              value={selectedUserId ?? ""}
              onValueChange={(value) =>
                handleUserChange({
                  target: { value },
                } as React.ChangeEvent<HTMLSelectElement>)
              }
            >
              <SelectTrigger className="min-w-[200px] w-full sm:w-auto">
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent>
                {Object.values(users).map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <Label className="text-xs font-semibold text-muted-foreground uppercase">
            Project
          </Label>
          <Select
            value={filterProjectId || "all"}
            onValueChange={(value) => {
              setFilterProjectId(value === "all" ? "" : value);
              setFilterTaskId(""); // Reset task filter when project changes
            }}
          >
            <SelectTrigger className="min-w-[200px] w-full sm:w-auto">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id as string}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <Label className="text-xs font-semibold text-muted-foreground uppercase">
            Task
          </Label>
          <Select
            value={filterTaskId || "all"}
            onValueChange={(value) =>
              setFilterTaskId(value === "all" ? "" : value)
            }
            disabled={!filterProjectId}
          >
            <SelectTrigger className="min-w-[200px] w-full sm:w-auto">
              <SelectValue placeholder="All Tasks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              {filterProjectTasks.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  {task.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleFetchUserTimeSheets}
          className={`mt-auto ${HasChnaged ? "animate-pulse" : ""}`}
        >
          Fetch Time Sheets
        </Button>
      </div>
      {filteredTimeSheets.length > 0 ? (
        <>
          <Card className="my-6">
            <CardHeader>
              <CardTitle>User Extra Time Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">Title</TableHead>
                    <TableHead className="text-center">Project</TableHead>
                    <TableHead className="text-center">Tasks</TableHead>
                    <TableHead className="text-center">Time Spent</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTimeSheets.map((sheet) => (
                    <React.Fragment key={sheet.id}>
                      <TableRow
                        onClick={() => toggleRowExpansion(sheet.id)}
                        className="hover:cursor-pointer text-center"
                      >
                        <TableCell className="font-medium">
                          <span className="relative group">{sheet.title}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {projects.find((p) => p.id === sheet.projectId)
                            ?.name || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs overflow-hidden text-ellipsis">
                          {sheet.taskIds?.map(taskId => {
                            const taskName = taskLookup.get(taskId) || tasks.find(t => t.id === taskId)?.name;
                            return taskName || "";
                          }).filter(Boolean).join(", ") || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {sheet.hours} Hours {sheet.minutes} Minutes
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditTimeSheet(sheet)}
                            >
                              <Edit2Icon size={18} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteTimeSheet(sheet.id)}
                            >
                              <Trash2 size={18} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleRowExpansion(sheet.id)}
                            >
                              {expandedRows.has(sheet.id) ? (
                                <ChevronUp size={18} />
                              ) : (
                                <ChevronDown size={18} />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(sheet.id) && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/50">
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
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="bg-muted font-semibold text-right"
                    >
                      Total Time Spent: {totalTime.hours} hours{" "}
                      {totalTime.minutes} minutes
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {filteredTasks.length > 0 ? (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>User Task Time Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task Name</TableHead>
                      <TableHead>Time Entries</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <React.Fragment key={task.id}>
                        <TableRow
                          onClick={() => toggleTaskRowExpansion(task.id)}
                          className="hover:cursor-pointer"
                        >
                          <TableCell className="font-medium">
                            {task.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {task.timeEntries
                              ? task.timeEntries
                                .filter(entry => entry.userId === user?.uid) // Filter by user ID
                                .reduce((total, entry) => total + entry.duration, 0) / 60 // Convert to hours
                              : 0}{" "}
                            hours
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={task.completed ? "default" : "secondary"}
                            >
                              {task.completed ? "completed" : "incomplete"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end items-center pr-8">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleRowExpansion(task.id)}
                              >
                                {expandedRows.has(task.id) ? (
                                  <ChevronUp size={18} />
                                ) : (
                                  <ChevronDown size={18} />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedTaskRows.has(task.id) && (
                          <TableRow>
                            <TableCell colSpan={4} className="bg-muted/50">
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
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="bg-muted font-semibold text-right"
                      >
                        Total Time Spent on Tasks: {totalTaskTime.hours} hours{" "}
                        {totalTaskTime.minutes} minutes
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card className="mt-6 mb-4">
              <CardHeader>
                <CardTitle>No Tasks Available</CardTitle>
                <CardDescription>
                  Please add tasks to see the entries.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </>
      ) : (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>No Time Sheets Available</CardTitle>
            <CardDescription>
              Please add a time sheet to see the entries.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      <CustomModal isOpen={showModal} onClose={() => setShowModal(false)}>
        <h2 className="text-xl font-heading font-semibold mb-4">
          {editingTimeSheetId ? "Edit Time Sheet" : "Add Time Sheet"}
        </h2>
        <form onSubmit={handleAddTimeSheet}>
          <div className="mb-4 space-y-1">
            <Label>Project (Optional)</Label>
            <Select
              value={newTimeSheet.projectId || "none"}
              onValueChange={async (value) => {
                const projectId = value === "none" ? "" : value;
                setNewTimeSheet({ ...newTimeSheet, projectId, taskIds: [] });
                if (projectId) {
                  // Force fetch tasks for the dropdown WITHOUT updating global state
                  const tasks = await fetchAllTasksWithChildren(projectId, undefined, true, false);
                  setProjectTasks(tasks);
                } else {
                  setProjectTasks([]);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a project..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select a project...</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id as string}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {newTimeSheet.projectId && (
            <div className="mb-4 space-y-1">
              <Label>Tasks (Optional)</Label>
              <div className="max-h-40 overflow-y-auto border border-border rounded-md p-2 bg-card">
                {projectTasks.length > 0 ? (
                  projectTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 mb-1">
                      <Checkbox
                        id={`task-${task.id}`}
                        checked={newTimeSheet.taskIds?.includes(task.id) || false}
                        onCheckedChange={(checked) => {
                          const isChecked = checked === true;
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
                      <Label
                        htmlFor={`task-${task.id}`}
                        className="text-sm cursor-pointer font-normal"
                      >
                        {task.name}
                      </Label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No tasks found for this project.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mb-4 space-y-1">
            <Label htmlFor="timesheet-title">Title</Label>
            <Input
              id="timesheet-title"
              type="text"
              placeholder="Enter title"
              value={newTimeSheet.title}
              onChange={(e) =>
                setNewTimeSheet({ ...newTimeSheet, title: e.target.value })
              }
              required
            />
          </div>
          <div className="mb-4 space-y-1">
            <Label htmlFor="timesheet-description">Description</Label>
            <Textarea
              id="timesheet-description"
              placeholder="Enter description"
              value={newTimeSheet.description}
              onChange={(e) =>
                setNewTimeSheet({
                  ...newTimeSheet,
                  description: e.target.value,
                })
              }
              required
            />
          </div>
          <div className="mb-4 space-y-1">
            <Label htmlFor="timesheet-hours">Hours</Label>
            <Input
              id="timesheet-hours"
              type="number"
              placeholder="Enter hours"
              value={newTimeSheet.hours}
              onChange={(e) =>
                setNewTimeSheet({
                  ...newTimeSheet,
                  hours: Number(e.target.value),
                })
              }
              required
            />
          </div>
          <div className="mb-4 space-y-1">
            <Label htmlFor="timesheet-minutes">Minutes</Label>
            <Input
              id="timesheet-minutes"
              type="number"
              placeholder="Enter minutes"
              value={newTimeSheet.minutes}
              onChange={(e) =>
                setNewTimeSheet({
                  ...newTimeSheet,
                  minutes: Number(e.target.value),
                })
              }
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Submit</Button>
          </div>
        </form>
      </CustomModal>
    </div>
  );
};

export default TimeSheet;
