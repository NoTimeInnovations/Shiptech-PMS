import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProjectStore } from "../store/projectStore";
import { useAttendanceStore } from "../store/attendanceStore";
import { useTodoStore } from "../store/todoStore";
import {
  Calendar,
  Clock,
  AlertCircle,
  UserCheck,
  ListTodo,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { useTaskStore } from "../store/taskStore";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function MemberBasics() {
  const navigate = useNavigate();
  const { fetchUserTasks, tasks: userTasks } = useTaskStore();
  const { loading: tasksLoading, projects } = useProjectStore();
  const { user, userData } = useAuthStore();
  const { checkAttendance } = useAttendanceStore();
  const { todos, loading: todosLoading, fetchUserTodos } = useTodoStore();
  const [hasMarkedAttendance, setHasMarkedAttendance] = React.useState(true);

  useEffect(() => {
    fetchUserTasks({
      id: user?.uid as string,
      name: userData?.fullName as string,
      email: userData?.email as string,
    });
    fetchUserTodos();
  }, [fetchUserTasks, fetchUserTodos, user?.uid]);

  useEffect(() => {
    const checkUserAttendance = async () => {
      // Use the returned value — reading `hasAttendance` from the hook here
      // gives the stale value captured before the check ran
      const marked = await checkAttendance();
      setHasMarkedAttendance(marked);
    };
    checkUserAttendance();
  }, [checkAttendance]);

  // Get upcoming todos (nearest 2 by due date that aren't completed)
  const upcomingTodos = todos
    .filter((todo) => !todo.completed)
    .sort(
      (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
    )
    .slice(0, 2);

  // Get upcoming tasks (nearest 2 by deadline that aren't completed)
  const upcomingTasks = userTasks
    ?.filter((task) => !task.completed)
    .sort((a, b) => new Date(a.deadline as string).getTime() - new Date(b.deadline as string).getTime())

  const handleTaskClick = (projectId: string, taskid: string) => {
    navigate(`/dashboard/projects/${projectId}/task/${taskid}`);
  };

  // Calculate analytics
  const totalProjects = projects.length;
  const ongoingProjects = projects.filter(
    (project) => project.status === "ongoing"
  ).length;
  const completedProjects = projects.filter(
    (project) => project.status === "completed"
  ).length;

  if (tasksLoading || todosLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Analytics Board */}
      <div
        onClick={() => {
          navigate("/dashboard/projects")
        }}
        className="mb-6 cursor-pointer"
      >
        <h2 className="text-2xl font-heading font-semibold mb-4">Analytics Dashboard</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-blue-100/60 gap-2">
            <CardHeader>
              <CardTitle className="text-lg">Total Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalProjects}</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-100/60 gap-2">
            <CardHeader>
              <CardTitle className="text-lg">Ongoing Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{ongoingProjects}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-100/60 gap-2">
            <CardHeader>
              <CardTitle className="text-lg">Completed Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{completedProjects}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {!hasMarkedAttendance && (
        <div
          onClick={() => navigate("/dashboard/attendance")}
          className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md cursor-pointer hover:bg-red-100 transition-colors duration-200"
        >
          <div className="flex items-center">
            <UserCheck className="h-6 w-6 text-red-400 mr-3" />
            <div>
              <h3 className="text-red-800 font-medium">Mark Your Attendance</h3>
              <p className="text-red-700 text-sm">
                Please mark your attendance for today. Click here to mark
                attendance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Todos Section */}
      {upcomingTodos.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-heading font-semibold">My To do</h2>
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard/todos")}
              className="text-blue-600 hover:text-blue-800"
            >
              <span>View All</span>
              <ListTodo className="h-4 w-4" />
            </Button>
          </div>
          <Card className="py-0 gap-0 divide-y divide-border overflow-hidden">
            {upcomingTodos.map((todo) => (
              <div
                onClick={() => navigate(`/dashboard/todos`)}
                key={todo.id}
                className="p-4 hover:bg-accent cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-foreground">{todo.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {todo.description}
                    </p>
                    <div className="flex items-center mt-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>
                        Due: {new Date(todo.endDate).toLocaleString('en-GB', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                          hour12: false
                        })}
                      </span>
                    </div>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    Pending
                  </Badge>
                </div>
              </div>
            ))}
            <div
              onClick={() => navigate("/dashboard/todos")}
              className="p-3 text-center text-sm text-blue-600 hover:bg-accent cursor-pointer font-medium"
            >
              {todos.filter((t) => !t.completed).length - 2 > 0
                ? `${todos.filter((t) => !t.completed).length - 2} more To Do${todos.filter((t) => !t.completed).length - 2 === 1 ? "" : "s"
                } pending. View all`
                : "View all"}
            </div>
          </Card>
        </div>
      )}

      {/* Existing Tasks Section */}
      <div className="flex justify-between">
        <h2 className="text-2xl font-heading font-semibold mb-6">My Tasks</h2>
        <Link
          to="/dashboard/mytasks"
          className="text-blue-600 hover:text-blue-800"
        >
          View All My Tasks
        </Link>
      </div>
      <Card className="py-0 gap-0 overflow-hidden">
        {userTasks.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
            </div>
            <p>No tasks assigned to you yet.</p>
            <div className="mt-4">
              <Link
                to="/dashboard/mytasks"
                className="text-blue-600 hover:text-blue-800"
              >
                View All My Tasks
              </Link>
            </div>
          </div>
        ) : (
          <>
            {upcomingTasks.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <div className="flex justify-center mb-4">
                  <CheckCheck className="h-12 w-12 text-muted-foreground" />
                </div>
                <p>All your tasks are completed.</p>
                <div className="mt-4">
                  <Link
                    to="/dashboard/mytasks"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    View All My Tasks
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() =>
                      handleTaskClick(
                        task.projectId as string,
                        task.id as string
                      )
                    }
                    className="p-4 hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-foreground">
                          {task.name}
                        </h3>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          {task.hours && (
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              <span>{task.hours} hours</span>
                            </div>
                          )}
                          {task.deadline && (
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              <span>
                                {new Date(task.deadline).toLocaleDateString('en-GB')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge
                        className={task.completed
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {task.completed ? "Completed" : "In Progress"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
