import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Project, useProjectStore, User } from "../store/projectStore";
import { Task, useTaskStore } from "../store/taskStore";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Task) => Promise<void>;
  initialData?: Task;
  tasks: Task[];
  project: Project;
}

export default function TaskModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  tasks,
  project,
}: TaskModalProps) {
  const { id: projectId } = useParams();
  const { users, fetchUsers } = useProjectStore();
  const [siblingTasks, setSiblingTasks] = useState<Task[]>([]);
  const {
    tasks: allTasks,
    task,
    searchTaskFromTree,
    SetaddOrPencilEdit,
    addOrPencilEdit,
    clearTask,
  } = useTaskStore();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    hours: undefined as number | undefined,
    costPerHour: undefined as number | undefined,
    assignedTo: [] as { id: string; name: string; email: string }[],
    deadline: "",
    percentage: 0,
  });

  const [availablePercentage, setAvailablePercentage] = useState(0);
  const [ParentTask, setParentTask] = useState<Task | null>(null);
  const [availableHours, setAvailableHours] = useState(0);

  const [hourError, setHourError] = useState<string>("");
  const [parentId, setParentId] = useState<string>("");

  const clearModalValues = () => {
    console.log("Clearing modal values");
    setFormData({
      name: "",
      description: "",
      hours: undefined,
      costPerHour: undefined,
      assignedTo: [],
      deadline: "",
      percentage: 0,
    });
    setHourError("");
    setParentTask(null);
    setParentId("");

    setAvailableHours(0);
    setSiblingTasks([]);
    clearTask();
  };

  const SetaddOrPencilEditTofalse = () => {
    console.log("Setting addOrPencilEdit to false and clearing parent task");
    setParentTask(null);
    setParentId("");
    setHourError("");
    SetaddOrPencilEdit(false);
    clearTask();
  };
  const getParentTask = () => {
    console.log("Getting parent task");
    setParentTask(null);
    setParentId(""); // Clear parentId first

    if (addOrPencilEdit && task) {
      // Check if task exists
      console.log("Crucial", task?.name);
      console.log("FIND,", task?.id);

      const parentTaskId = task.id;
      if (parentTaskId) {
        // Only proceed if parentTaskId exists
        const parentTask = searchTaskFromTree(parentTaskId, allTasks);
        setParentTask(parentTask);
        setParentId(parentTaskId);
        console.log("Parent task (add/edit mode):", parentTask);
        console.log("Parent ID (add/edit mode):", parentTaskId);
      }
      return;
    }

    // For editing existing tasks, only set parent if parentId actually exists
    const parentTaskId = task?.parentId || parentId;
    if (parentTaskId && parentTaskId.trim() !== "") {
      const parentTask = searchTaskFromTree(parentTaskId, allTasks);
      setParentTask(parentTask);
      setParentId(parentTaskId);
      console.log("Parent task:", parentTask);
      console.log("Parent ID:", parentTaskId);
    } else {
      // This is a project-level task or no task selected
      setParentTask(null);
      setParentId("");
      console.log(
        "No parent task - this is a project-level task or no task selected"
      );
    }
  };

  useEffect(() => {
    if (isOpen) {
      console.log("Modal opened - clearing values first");
      clearModalValues();
      fetchUsers();
    } else {
      console.log("Modal closed - clearing values");
      clearModalValues();
      SetaddOrPencilEdit(false); // Ensure this is also set to false
    }
  }, [isOpen]);

  useEffect(() => {
    getParentTask();
  }, [tasks, addOrPencilEdit]);

  useEffect(() => {
    if (isOpen && initialData) {
      console.log("Setting form data from initialData:", initialData);
      setFormData({
        name: initialData.name || "",
        description: initialData.description || "",
        hours: initialData.hours,
        costPerHour: initialData.costPerHour,
        assignedTo: initialData.assignedTo || [],
        deadline: initialData.deadline || "",
        percentage: initialData.percentage || 0,
      });
      setParentId(initialData.parentId || "");
      console.log("Parent ID set to:", initialData.parentId || "");
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    const fetchSibTasks = async () => {
      // const sib = await fetchSiblingTasks(
      //   initialData?.parentId || "",
      //   initialData?.id || "",
      //   projectId || ""
      // );

      if (initialData?.parentId) {
        setSiblingTasks(
          tasks.filter(
            (task) => task.parentId === initialData?.parentId
          ) as Task[]
        );
      } else {
        setSiblingTasks(tasks);
      }

      // console.log(tasks, "passed tasks");
    };
    fetchSibTasks();
    return () => {
      setSiblingTasks([]);
    };
  }, [isOpen, initialData, tasks]);

  useEffect(() => {
    if (siblingTasks) {
      calculateAvailablePercentage();
    }
  }, [siblingTasks, initialData]);

  useEffect(() => {
    if (siblingTasks && ParentTask) {
      calculateAvailableHours();
    }
  }, [siblingTasks, initialData, ParentTask]);

  const calculateAvailableHours = () => {
    if (!ParentTask || !ParentTask.hours) {
      setAvailableHours(0);
      return;
    }

    const totalAllocatedHours = siblingTasks
      .filter((task) => !initialData || task.id !== initialData.id)
      .reduce((sum, task) => sum + (task.hours || 0), 0);

    const availableHours = ParentTask.hours - totalAllocatedHours;
    setAvailableHours(Math.max(0, availableHours));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const taskData = {
      ...formData,
      id: initialData?.id || "",
      projectId: projectId || "",
      parentId: initialData?.parentId || "",
      completed: initialData?.completed || false,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!formData.name) {
      toast.error("Please fill in the task name");
      return;
    }
    if (!formData.deadline) {
      toast.error("Please fill in the deadline");
      return;
    }
    if (formData.percentage == 0) {
      toast.error("Please set a percentage greater than 0");
      return;
    }
    if (formData.assignedTo.length == 0) {
      toast.error("Please assign the task to at least one user");
      return;
    }

    if (ParentTask && ParentTask.hours && formData.hours) {
      console.log("TYPING HOUR", formData.hours);

      if (formData.hours > availableHours) {
        toast.error(
          `Hours cannot exceed available hours (${availableHours}). Please reduce hours of other subtasks first.`
        );
        return;
      }
    }

    setParentTask(null);
    onSubmit(taskData as Task);
    SetaddOrPencilEditTofalse();
    onClose();
  };

  const handleAssignedToChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions);
    const selectedUsers = selectedOptions
      .map(
        (option) => users.find((user: User) => user.id === option.value) || null
      )
      .filter((user): user is User => user !== null);

    const assignedTo = selectedUsers.map((user) => ({
      id: user.id,
      name: user.fullName,
      email: user.email,
    }));

    setFormData((prev) => ({ ...prev, assignedTo }));
  };

  const calculateAvailablePercentage = () => {
    const totalAllocated = siblingTasks
      .filter((task) => !initialData || task.id !== initialData.id)
      .reduce((sum, task) => sum + (task.percentage || 0), 0);

    const availablePercentage = 100 - totalAllocated;
    setAvailablePercentage(availablePercentage);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          SetaddOrPencilEditTofalse();
          onClose();
        }
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-md">
        {/* Header - Fixed */}
        <DialogHeader className="border-b p-6">
          <DialogTitle>{initialData ? "Edit Task" : "Add Task"}</DialogTitle>
        </DialogHeader>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="task-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="task-name">Name</Label>
              <Input
                id="task-name"
                type="text"
                required
                placeholder="Enter task name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                placeholder="Enter task description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="task-hours">
                  Hours{" "}
                  {ParentTask && ParentTask.hours && (
                    <span className="text-sm font-normal text-muted-foreground">
                      (Available: {availableHours})
                    </span>
                  )}
                </Label>
                <Input
                  id="task-hours"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0.0"
                  max={
                    ParentTask && ParentTask.hours
                      ? availableHours + (formData.hours || 0)
                      : undefined
                  }
                  value={formData.hours || ""}
                  onChange={(e) => {
                    const value = e.target.value
                      ? Number(e.target.value)
                      : undefined;
                    setHourError(""); // Clear previous error

                    if (
                      (ParentTask &&
                        ParentTask.hours &&
                        value &&
                        value > availableHours) ||
                      0
                    ) {
                      let errorMsg = "";
                      if (availableHours > 1) {
                        errorMsg = `Only  ${availableHours} hours left `;
                      } else {
                        errorMsg = `Only  ${availableHours} hour left `;
                      }

                      setHourError(errorMsg);
                      console.log("Hour validation error:", errorMsg);
                      toast.error(errorMsg);
                      return;
                    }

                    setFormData((prev) => ({
                      ...prev,
                      hours: value,
                    }));
                  }}
                  aria-invalid={!!hourError}
                />
                {hourError && (
                  <span className="mt-1 block text-sm text-destructive">
                    {hourError}
                  </span>
                )}
                {ParentTask && ParentTask.hours && availableHours === 0 && (
                  <span className="mt-2 flex justify-center rounded border-2 border-destructive p-1 text-center text-sm text-destructive">
                    No hours available! Reduce hours of other subtasks first
                  </span>
                )}
                {ParentTask && ParentTask.hours && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Parent task has {ParentTask.hours} hours total
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="task-cost-per-hour">Cost/Hour</Label>
                <Input
                  id="task-cost-per-hour"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.costPerHour || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      costPerHour: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-assign-to">Assign To</Label>
              <select
                id="task-assign-to"
                multiple
                value={formData.assignedTo.map((user) => user.id)}
                onChange={handleAssignedToChange}
                className="block w-full rounded-md border border-input bg-transparent p-2 text-sm shadow-xs outline-hidden focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                size={4}
              >
                {users.map((user: User) => (
                  <option key={user.id} value={user.id} className="capitalize">
                    {user.fullName}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-muted-foreground">
                Hold Ctrl/Cmd to select multiple users
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-deadline">Deadline</Label>
              <Input
                id="task-deadline"
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    deadline: e.target.value,
                  }))
                }
                max={
                  ParentTask && ParentTask.deadline
                    ? (ParentTask.deadline as string) // Ensure it's treated as a string
                    : (project?.project_due_date as string) // Ensure it's treated as a string
                } // Set maximum date based on ParentTask or project due date
              />
            </div>

            <div className="mb-6">
              <Label className="mb-2 block">
                Percentage Allocation (Max: {availablePercentage}
                %)
              </Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Current: {formData.percentage}%
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Available:{" "}
                    {availablePercentage - formData.percentage < 0
                      ? 0
                      : availablePercentage - formData.percentage}
                    %
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={availablePercentage}
                  value={formData.percentage}
                  onChange={(e) => {
                    const value = Math.min(
                      parseInt(e.target.value),
                      availablePercentage
                    );
                    setFormData((prev) => ({ ...prev, percentage: value }));
                  }}
                  className="h-2 w-full cursor-pointer rounded-lg bg-muted"
                />
                <div className="relative h-2 w-full overflow-hidden rounded-lg bg-muted">
                  <div
                    className="absolute top-0 left-0 h-full bg-primary transition-all duration-150"
                    style={{
                      width: `${
                        (formData.percentage / availablePercentage) * 100
                      }%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>{Math.floor(availablePercentage / 2)}%</span>
                  <span>{availablePercentage}%</span>
                </div>
              </div>
              <div className="mt-2">
                <Input
                  type="number"
                  min="0"
                  max={availablePercentage + formData.percentage}
                  value={formData.percentage}
                  onChange={(e) => {
                    const value = Math.min(
                      parseInt(e.target.value) || 0,
                      availablePercentage
                    );
                    setFormData((prev) => ({ ...prev, percentage: value }));
                  }}
                  className="h-8 w-20 text-center text-sm"
                />
              </div>
              {availablePercentage === 0 && (
                <span className="mt-3 flex justify-center border-2 border-destructive p-1 text-center text-sm text-destructive">
                  You cant allocate any more percentage! Reduce percentage of
                  other tasks first
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Footer - Fixed */}
        <DialogFooter className="border-t p-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              SetaddOrPencilEditTofalse();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button type="submit" form="task-form">
            {initialData ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
