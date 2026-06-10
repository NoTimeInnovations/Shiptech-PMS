import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "../store/projectStore";
import { useTodoStore } from "../store/todoStore";
import { useAuthStore } from "../store/authStore";
import { Task, useTaskStore } from "../store/taskStore";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CalendarItem {
  id?: string;
  name: string;
  dueDate: string;
  type: "project" | "task" | "todo";
  projectId?: string;
  parentId?: string | null;
  completed?: boolean;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  items: CalendarItem[];
}

export default function ProjectCalendar() {
  const navigate = useNavigate();
  const { projects, fetchProjects } = useProjectStore();
  const { tasks, getTaskPath } = useTaskStore();
  const { userData } = useAuthStore();
  const { todos, fetchUserTodos } = useTodoStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);

  // Fetch data when component mounts
  useEffect(() => {
    fetchProjects();
    fetchUserTodos();
  }, [fetchProjects, fetchUserTodos]);

  // Generate calendar days with all items
  useEffect(() => {
    const generateCalendar = async () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      // Get calendar structure
      const firstDayOfMonth = new Date(year, month, 1);
      const startingDayOfWeek = firstDayOfMonth.getDay();
      const lastDayOfMonth = new Date(year, month + 1, 0);
      const totalDaysInMonth = lastDayOfMonth.getDate();
      const lastDayOfPrevMonth = new Date(year, month, 0).getDate();

      const calendarDays: CalendarDay[] = [];

      // Collect all calendar items
      const calendarItems: CalendarItem[] = [
        // Project deadlines (show all for admin, otherwise filter)
        ...projects
          .map((project) => ({
            id: project.id,
            name: project.name,
            dueDate: project.project_due_date!,
            type: "project" as const,
            completed: false,
          }))
          .filter((item) => userData?.role === "admin" || item.dueDate),

        // All tasks with deadlines from all projects
        ...(await getAllTasksWithDeadlines()),

        // Todo deadlines
        ...todos.map((todo) => ({
          id: todo.id,
          name: todo.title,
          dueDate: todo.endDate,
          type: "todo" as const,
          completed: false,
        })),
      ];

      // Add days from previous month
      for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const date = new Date(year, month - 1, lastDayOfPrevMonth - i);
        calendarDays.push({
          date,
          isCurrentMonth: false,
          items: getItemsForDate(date, calendarItems),
        });
      }

      // Add days from current month
      for (let i = 1; i <= totalDaysInMonth; i++) {
        const date = new Date(year, month, i);
        date.setHours(0, 0, 0, 0);
        calendarDays.push({
          date,
          isCurrentMonth: true,
          items: getItemsForDate(date, calendarItems),
        });
      }

      // Add days from next month
      const remainingDays = 42 - calendarDays.length;
      for (let i = 1; i <= remainingDays; i++) {
        const date = new Date(year, month + 1, i);
        calendarDays.push({
          date,
          isCurrentMonth: false,
          items: getItemsForDate(date, calendarItems),
        });
      }

      setCalendar(calendarDays);
    };

    generateCalendar();
  }, [currentDate, projects, todos, userData]);

  // Helper function to recursively get all tasks with deadlines

  const getAllTasksWithDeadlines = async (): Promise<CalendarItem[]> => {
    const tasksCollectionRef = collection(db, "tasks"); // Reference to the tasks collection
    let tasksQuery;
    let taskss: Task[] = [];

    if (userData?.role === "admin") {
      // Fetch all tasks if the user is an admin
      tasksQuery = query(tasksCollectionRef);

      // Fetch tasks from Firestore
      const tasksSnapshot = await getDocs(tasksQuery);
      taskss = tasksSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[];
    } else {
      taskss = tasks;
    }

    // Process tasks and include child tasks recursively
    const processTasks = (tasks: Task[]): CalendarItem[] => {
      return tasks.reduce((acc: CalendarItem[], task: Task) => {
        const tasksWithDeadlines: CalendarItem[] = [];

        // Add current task if it has a deadline
        if (task.deadline) {
          tasksWithDeadlines.push({
            id: task.id,
            name: task.name,
            dueDate: task.deadline,
            type: "task" as const,
            projectId: task.projectId,
            parentId: task.parentId,
            completed: task.completed,
          });
        }

        // Recursively add child tasks with deadlines
        if (task.children && task.children.length > 0) {
          tasksWithDeadlines.push(...processTasks(task.children));
        }

        return [...acc, ...tasksWithDeadlines];
      }, []);
    };

    return processTasks(taskss);
  };

  const getItemsForDate = (date: Date, items: CalendarItem[]) => {
    return items.filter((item) => {
      const itemDate = new Date(item.dueDate);
      return (
        itemDate.getDate() === date.getDate() &&
        itemDate.getMonth() === date.getMonth() &&
        itemDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const handleItemClick = async (item: CalendarItem) => {
    switch (item.type) {
      case "project":
        navigate(`/dashboard/projects/${item.id}`);
        break;
      case "task":
        const taskPath = await getTaskPath(
          item.id as string,
          item.projectId as string
        );
        navigate(`/dashboard/projects/${item.projectId}/task/${taskPath}`);
        break;
      case "todo":
        navigate("/dashboard/todos");
        break;
    }
  };

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            Project Calendar
          </h3>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={goToPreviousMonth}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={goToNextMonth}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <p className="mt-1 text-lg text-foreground">
          {currentDate.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </p>

        {/* Color Legend */}
        <div className="mt-2 mb-4">
          <h4 className="text-md font-semibold">Color Legend:</h4>
          <div className="flex space-x-4 mt-1">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-black rounded-full mr-1"></div>
              <span>Project</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-500 rounded-full mr-1"></div>
              <span>Upcoming Task</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-1"></div>
              <span>Completed Task</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-500 rounded-full mr-1"></div>
              <span>Overdue Task</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-orange-500 rounded-full mr-1"></div>
              <span>Todo</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="bg-muted py-2 text-center text-sm font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-border">
        {calendar.map((day, index) => (
          <div
            key={index}
            className={cn(
              "min-h-[100px] p-2",
              day.isCurrentMonth ? "text-foreground" : "text-muted-foreground",
              isToday(day.date) ? "bg-blue-50" : "bg-card"
            )}
          >
            <div
              className={cn(
                "font-medium text-sm mb-1",
                isToday(day.date) && "text-blue-600"
              )}
            >
              {day.date.getDate()}
            </div>
            <div className="space-y-1 max-h-[80px] overflow-y-auto">
              {day.items.map((item, i) => {
                let itemColor = "";
                if (item.type === "project") {
                  itemColor = "bg-black text-white"; // Projects are black
                } else if (item.type === "todo") {
                  itemColor = "bg-orange-500 text-white"; // Todos are orange
                } else if (item.type === "task") {
                  const isPastDue = new Date(item.dueDate) < new Date();
                  if (item.completed) {
                    itemColor = "bg-green-500 text-white"; // Completed tasks are green
                  } else if (isPastDue) {
                    itemColor = "bg-red-500 text-white"; // Overdue tasks are red
                  } else {
                    itemColor = "bg-blue-500 text-white"; // Upcoming tasks are blue
                  }
                }

                return (
                  <div
                    key={`${item.id}-${i}`}
                    onClick={() => handleItemClick(item)}
                    className={`text-xs px-2 py-1 rounded truncate cursor-pointer ${itemColor}`}
                    title={`${item.type.toUpperCase()}: ${item.name} (${
                      item.type
                    })`}
                  >
                    {item.name}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
