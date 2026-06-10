import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Loader2, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import ProjectComments from "../components/ProjectComments";
import { Project } from "@/store/projectStore";
import ProjectStatusSelect from "@/components/ProjectStatusSelect";
import { Task, useTaskStore } from "@/store/taskStore";
import { Customer, useCustomerStore } from "@/store/customerStore";
import { useProjectStore } from "@/store/projectStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

interface CustomerProjectProps {
  projectId: string; // Accept projectId as a prop
}

export default function CustomerProject({ projectId }: CustomerProjectProps) {
  const { fetchCustomerProjects, fetchCustomerByUserId } = useCustomerStore();
  const { tasks, fetchAllTasksWithChildren } = useTaskStore();
  const [loading, setLoading] = useState(true);
  const [customerProject, setCustomerProject] = useState<Project | null>();
  const { user, userData } = useAuthStore();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const navigate = useNavigate();
  const [progressPercentage, setProgress] = useState(0);
  const { fetchProject, project } = useProjectStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCustomer = async () => {
      if (user) {
        try {
          const cus = await fetchCustomerByUserId(user.uid);
          setCustomer(cus);
        } catch (error) {
          console.error("Error loading customer:", error);
          toast.error("Failed to load customer");
        }
      }
    };

    loadCustomer();
  }, [user, navigate]);

  useEffect(() => {
    const loadCustomerProject = async () => {
      try {
        if (!user) {
          navigate("/login");
          return;
        }

        if (!userData || userData.role !== "customer") {
          navigate("/dashboard");
          return;
        }
        const projects = await fetchCustomerProjects({
          id: customer?.id as string,
          name: userData.fullName,
          phone: customer?.contactPersons[0].phone as string,
          address: customer?.address as string,
        });

        setCustomerProject(projects[0]);
      } catch (error) {
        console.error("Error loading project:", error);
        toast.error("Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    loadCustomerProject();
  }, [customer]);

  useEffect(() => {
    if (customerProject) {
      fetchAllTasksWithChildren(customerProject.id as string);
    }
  }, [customerProject]);

  useEffect(() => {
    const loadProjectData = async () => {
      try {
        await fetchProject(projectId); // Fetch project using the passed projectId
      } catch (err) {
        setError("Failed to load project details");
        toast.error("Failed to load project details");
        console.log(err);

      }
    };

    loadProjectData();
  }, [projectId, fetchProject]);

  const calculateCompletedPercentage = (task: Task): number => {
    if (!task.children || task.children.length === 0) {
      // If the task has no children, return the percentage based on its own completion status
      return task.completed ? (task.percentage || 100) : 0;
    }

    const totalAssignedToChildren = task.children.reduce((sum, child) =>
      sum + (child.percentage || 0), 0);

    if (totalAssignedToChildren === 0) return 0;

    const completedSum = task.children.reduce((sum, subtask) => {
      return sum + (subtask.completed ? (subtask.percentage || 0) : 0);
    }, 0);

    const comp = Math.round((completedSum / totalAssignedToChildren) * 100);
    return Number(((comp * (task.percentage || 100)) / 100).toFixed(1));
  };

  const calculateProjectCompletion = (): number => {
    if (!tasks.length) return 0;

    const rootTasks = tasks;

    let sum = 0;

    rootTasks.forEach((task) => {
      const value = calculateCompletedPercentage(task);
      sum += value;
    });
    return sum;
  };

  useEffect(() => {
    const progressPercentage = calculateProjectCompletion();
    setProgress(progressPercentage);
  }, [tasks]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold text-muted-foreground">Project not found</h2>
        <Button className="mt-4" onClick={() => navigate("/customer")}>
          Back to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back Button and Heading */}
        <div className="flex items-center mb-4">
          <Link to="/customer" className="flex items-center text-foreground">
            <ArrowLeft className="h-7 w-7 mr-2" />
          </Link>
        </div>
        <h2 className="text-2xl font-heading font-semibold mb-2">Project Details</h2>

        {/* Project Header */}
        <Card>
          <CardContent>
            <h1 className="text-2xl font-heading font-semibold mb-2 capitalize">
              {project.name}
            </h1>
            <p className="text-muted-foreground mb-4">{project.description}</p>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Overall Progress</span>
                <span className="text-muted-foreground">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} />
              <p className="text-sm text-muted-foreground">
                {tasks.filter((task) => task.completed).length} of {tasks.length}{" "}
                main tasks completed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Project Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Project Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium text-muted-foreground bg-muted">
                      Project ID
                    </TableCell>
                    <TableCell>{project.__id}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-muted-foreground bg-muted">
                      Created At
                    </TableCell>
                    <TableCell>
                      {new Date(project.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                  {project.project_start_date && (
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground bg-muted">
                        Start Date
                      </TableCell>
                      <TableCell>
                        {new Date(
                          project.project_start_date
                        ).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  )}
                  {project.project_due_date && (
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground bg-muted">
                        Due Date
                      </TableCell>
                      <TableCell>
                        {new Date(
                          project.project_due_date
                        ).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell className="font-medium text-muted-foreground bg-muted">
                      Project Status
                    </TableCell>
                    <TableCell>
                      <ProjectStatusSelect
                        project={{
                          id: project.id as string,
                          status: project.status,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Main Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-border rounded-lg p-4 hover:border-blue-100 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{task.name}</h3>
                      {task.description && (
                        <p className="text-muted-foreground mt-1">{task.description}</p>
                      )}
                    </div>
                    <Badge
                      className={
                        task.completed
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
          </CardContent>
        </Card>

        {/* Comments Section */}
        <div className="mt-6">
          <ProjectComments projectData={project} projectId={project.id as string} />
        </div>
      </div>
    </div>
  );
}
