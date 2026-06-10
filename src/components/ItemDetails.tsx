import { User, Calendar, Clock, DollarSign, Bell } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useTodoStore } from "@/store/todoStore";
import ItemStatusBadge from "./ItemStatusBadge";
import { Task } from "@/store/taskStore";
import { useAuthStore } from "@/store/authStore";
import { useProjectStore } from "@/store/projectStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ItemDetailsProps {
  item: Task;
  tasks?: Task[];
  onEditClick?: () => void;
  onToggleComplete?: () => void;
  isAdmin?: boolean;
  canComplete?: boolean;
  exceptionCase?: boolean;
  parentTaskCompleted?: boolean; // Add this
}

export default function ItemDetails({
  item,
  tasks = [],
  onEditClick,
  onToggleComplete,
  isAdmin,
  canComplete = true,
  exceptionCase = false,
  parentTaskCompleted = false, // Add this
}: ItemDetailsProps) {
  const { userData } = useAuthStore();
  const { project } = useProjectStore();
  const allChildrenComplete = tasks?.length
    ? tasks.every((child) => child.completed)
    : true;

  const calculateProgress = () => {

    if (!tasks.length) return 0;

    const completedProgress = tasks.reduce((acc, task) => {
      if (task.completed) {
        return acc + (task.percentage || 0);
      }
      return acc;
    }, 0);

    return Math.round(completedProgress);
  };

  const [showToDoModal, setShowToDoModal] = useState(false);
  const [toDoData, setToDoData] = useState({
    title: "",
    description: "",
    leadTime: 0,
    leadTimeUnit: "days" as "days" | "weeks" | "months",
    endDate: "",
  });

  const { addTodo } = useTodoStore();

  const handleOpenToDoModal = () => {
    setToDoData({
      title: item.name || "",
      description: item.description || "",
      leadTime: 0,
      leadTimeUnit: "days",
      endDate: "",
    });
    setShowToDoModal(true);
  };

  const handleLeadTimeChange = (
    value: number,
    unit: "days" | "weeks" | "months"
  ) => {
    const now = new Date();
    let newDate = new Date(now);

    if (unit === "days") {
      newDate.setDate(now.getDate() + value);
    } else if (unit === "weeks") {
      newDate.setDate(now.getDate() + value * 7);
    } else if (unit === "months") {
      // Handle month overflow (e.g., Jan 31 + 1 month -> Feb 28/29)
      const currentDay = now.getDate();
      newDate.setMonth(now.getMonth() + value);

      // If the day changed (e.g. was 31st, now 3rd of March), rollback to last day of intended month
      if (newDate.getDate() !== currentDay) {
        newDate.setDate(0);
      }
    }

    // Format for datetime-local input: YYYY-MM-DDTHH:mm
    // Adjust for timezone offset to keep local time correct
    const offset = newDate.getTimezoneOffset() * 60000;
    const localISOTime = new Date(newDate.getTime() - offset).toISOString().slice(0, 16);

    setToDoData((prev) => ({
      ...prev,
      leadTime: value,
      leadTimeUnit: unit,
      endDate: localISOTime,
    }));
  };

  const handleEndDateChange = (dateStr: string) => {
    if (!dateStr) {
      setToDoData((prev) => ({
        ...prev,
        endDate: dateStr,
        leadTime: 0,
        // leadTimeUnit: "days", // Keep previous unit
      }));
      return;
    }

    const date = new Date(dateStr);
    const now = new Date();

    // Calculate difference in milliseconds
    const diffTime = date.getTime() - now.getTime();

    // Calculate days first
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Use current unit preference
    const currentUnit = toDoData.leadTimeUnit;
    let newLeadTime = 0;

    if (currentUnit === "days") {
      newLeadTime = diffDays > 0 ? diffDays : 0;
    } else if (currentUnit === "weeks") {
      // Convert to weeks, keeping 1 decimal place if needed
      const weeks = diffDays / 7;
      // If it's effectively an integer (e.g. 2.0), show integer. Else fixed to 1 decimal
      newLeadTime = weeks > 0 ? parseFloat(weeks.toFixed(1)) : 0;
    } else if (currentUnit === "months") {
      // Rough month calculation
      let months = (date.getFullYear() - now.getFullYear()) * 12 + (date.getMonth() - now.getMonth());
      // Adjust for day of month
      if (date.getDate() < now.getDate()) {
        months--;
      }

      // Better approach for months:
      // If user selected months, they probably want to see approx months.
      const approxMonths = diffDays / 30.44; // Average days in month
      newLeadTime = approxMonths > 0 ? parseFloat(approxMonths.toFixed(1)) : 0;
    }

    setToDoData((prev) => ({
      ...prev,
      endDate: dateStr,
      leadTime: newLeadTime,
      // unit stays same
    }));
  };

  const handleAddToDo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toDoData.endDate) {
      toast.error("Please select an end date or lead time");
      return;
    }
    await addTodo(
      toDoData.title,
      toDoData.description,
      toDoData.endDate,
      toDoData.leadTime,
      toDoData.leadTimeUnit,
      item.projectId || null,
      item.id || null,
      project?.__id || null,
      project?.name || null,
      item.name || null
    );
    toast.success("To-Do created successfully");
    setShowToDoModal(false);
  };

  const progress = calculateProgress();

  return (
    <Card className="mb-6">
      <CardContent>
        {tasks.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Progress</h3>
              <span className="text-sm font-medium text-foreground">
                {progress}%
              </span>
            </div>
            <Progress value={progress} className="h-2.5 [&>div]:bg-blue-600" />
            <div className="mt-2 text-xs text-muted-foreground">
              {tasks.filter((task) => task.completed).length} of {tasks.length}{" "}
              subtasks completed
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Description
              </h3>
              <p className="text-foreground">
                {item.description || "No description provided"}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {!parentTaskCompleted && (isAdmin || exceptionCase) && onEditClick && project && project.status !== 'completed' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700"
                  onClick={() => {
                    onEditClick()
                  }}
                >
                  Edit Details
                </Button>
              )}
              {!parentTaskCompleted && onToggleComplete && project && project.status !== 'completed' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleComplete}
                  disabled={
                    !canComplete ||
                    ((tasks?.length && !allChildrenComplete) as boolean)
                  }
                  className={cn(
                    item.completed
                      ? "text-yellow-600 hover:text-yellow-700"
                      : "text-green-600 hover:text-green-700"
                  )}
                >
                  {item.completed ? "Mark Incomplete" : "Mark Complete"}
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {item.assignedTo && item.assignedTo.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Assigned To
                </h3>
                <div className="flex flex-col gap-2">
                  {item.assignedTo.map((user, index) => (
                    <div key={index} className="flex items-center">
                      <User className="h-4 w-4 text-muted-foreground mr-2" />
                      <p>{user.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {item.deadline && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Deadline
                </h3>
                <div className="flex items-center">

                  <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                  <p>{new Date(item.deadline).toLocaleString('en-GB')}</p>
                </div>
              </div>
            )}

            {(item.hours !== undefined || item.costPerHour !== undefined) && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {item.hours !== undefined && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Estimated Hours
                    </h3>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-muted-foreground mr-2" />
                      <p>{item.hours} hours</p>
                    </div>
                  </div>
                )}

                {item.costPerHour !== undefined &&
                  userData?.role === "admin" && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        Cost per Hour
                      </h3>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-muted-foreground mr-2" />
                        <p>₹{item.costPerHour}</p>
                      </div>
                    </div>
                  )}
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
              <div className="flex items-center space-x-2">
                <ItemStatusBadge completed={item.completed} />
                {tasks?.length && tasks.length > 0 && !allChildrenComplete ? (
                  <span className="text-sm text-destructive">
                    (Cannot complete - subtasks pending)
                  </span>
                ) : null}
              </div>
              <Button
                onClick={handleOpenToDoModal}
                className="mt-4 bg-blue-600 text-white hover:bg-blue-700"
              >
                <Bell className="h-4 w-4" />
                Create To-Do
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      <Dialog open={showToDoModal} onOpenChange={setShowToDoModal}>
        <DialogContent className="sm:max-w-[32rem]">
          <DialogHeader>
            <DialogTitle>Create To-Do</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddToDo}>
            <div className="mb-4 space-y-1">
              <Label htmlFor="todo-title">Title</Label>
              <Input
                id="todo-title"
                type="text"
                value={toDoData.title}
                onChange={(e) =>
                  setToDoData({ ...toDoData, title: e.target.value })
                }
                required
              />
            </div>
            <div className="mb-4 space-y-1">
              <Label htmlFor="todo-description">Description</Label>
              <Textarea
                id="todo-description"
                value={toDoData.description}
                onChange={(e) =>
                  setToDoData({
                    ...toDoData,
                    description: e.target.value,
                  })
                }
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-1">
                <Label htmlFor="todo-lead-time">Lead Time</Label>
                <div className="flex gap-2">
                  <Input
                    id="todo-lead-time"
                    type="number"
                    min="0"
                    value={toDoData.leadTime}
                    onChange={(e) =>
                      handleLeadTimeChange(
                        parseInt(e.target.value) || 0,
                        toDoData.leadTimeUnit
                      )
                    }
                  />
                  <Select
                    value={toDoData.leadTimeUnit}
                    onValueChange={(value) =>
                      handleLeadTimeChange(
                        0,
                        value as "days" | "weeks" | "months"
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="weeks">Weeks</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="todo-end-date">End Date</Label>
                <Input
                  id="todo-end-date"
                  type="datetime-local"
                  value={toDoData.endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowToDoModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                Save To-Do
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
