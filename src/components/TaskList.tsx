import { Plus, Pencil, Trash2 } from "lucide-react";
import { Task, useTaskStore } from "../store/taskStore";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface TaskListProps {
  tasks: Task[];
  onAddClick: () => void;
  onEditClick: (task: Task) => void;
  onDeleteClick: (taskId: string) => void;
  onTaskClick: (task: Task) => void;
  isAdmin: boolean;
  currentUserId?: string;
  parentAccess?: boolean;
}

export default function TaskList({
  tasks = [],
  onAddClick,
  onEditClick,
  onDeleteClick,
  onTaskClick,
  isAdmin,
  parentAccess,
}: TaskListProps) {
  const [sortedTasks, setSortedTasks] = useState<Task[]>([]);
  const { SetaddOrPencilEdit } = useTaskStore();

  useEffect(() => {
    setSortedTasks(
      [...tasks].sort((a, b) => {
        if (!a.createdAt && !b.createdAt) return 0;
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      })
    );
  }, [tasks]);

  const calculateProgress = (children : Task[]) => {
    if (!children.length) return 0;

    const completedProgress = children.reduce((acc, task) => {
      if (task.completed) {
        return acc + (task.percentage || 0);
      }
      return acc;
    }, 0);

    return Math.round(completedProgress);
  };

  // Helper function to get color based on percentage
  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return "bg-green-600";
    if (percentage >= 50) return "bg-yellow-500";
    if (percentage >= 25) return "bg-orange-500";
    return "bg-red-600";
  };

  // Static class map so Tailwind can see the indicator colors
  const getProgressIndicatorClass = (percentage: number) => {
    if (percentage >= 75) return "[&>div]:bg-green-600";
    if (percentage >= 50) return "[&>div]:bg-yellow-500";
    if (percentage >= 25) return "[&>div]:bg-orange-500";
    return "[&>div]:bg-red-600";
  };

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Tasks</h3>
        {(isAdmin || parentAccess) && (
          <Button
            size="sm"
            onClick={() => {
              SetaddOrPencilEdit(true);
              onAddClick();
            }}
          >
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        )}
      </div>

      <Card className="py-0">
        {sortedTasks.length === 0 ? (
          <p className="p-4 text-muted-foreground">No tasks yet</p>
        ) : (
          <div className="divide-y divide-border">
            {sortedTasks.map((task) => {

              const completedPercentage = !task.children?.length ? (task.completed ? 100 : 0) : calculateProgress(task.children as Task[]);
              const assignedPercentage = task.percentage || 0;

              return (
                <div key={task.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center cursor-pointer flex-1"
                      onClick={() => onTaskClick(task)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{task.name}</h4>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">
                              Target: {assignedPercentage}%
                            </span>
                            <span
                              className={`text-sm ${
                                task.completed
                                  ? getProgressColor(completedPercentage).replace("bg-", "text-")
                                  : "text-red-600"
                              }`}
                            >
                              {task.completed ? "Completed" : "In Progress"}
                              :{" "}
                              {(
                                (completedPercentage * 100) /
                                100
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <Progress
                          value={completedPercentage}
                          className={cn(
                            "h-1.5",
                            getProgressIndicatorClass(completedPercentage)
                          )}
                        />
                        {task.timeEntries && task.timeEntries.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {task.timeEntries.length} time entries
                          </p>
                        )}
                      </div>
                    </div>
                    {(isAdmin || parentAccess) && (
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            SetaddOrPencilEdit(true);
                            onEditClick(task);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Are you sure you want to delete this task and all its subtasks?"
                              )
                            ) {
                              onDeleteClick(task.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
