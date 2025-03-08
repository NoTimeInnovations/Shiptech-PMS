import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import ProjectComments from "../components/ProjectComments";
import { Project } from "@/store/projectStore";
import ProjectStatusSelect from "@/components/ProjectStatusSelect";
import { Task, useTaskStore } from "@/store/taskStore";
import { Customer, useCustomerStore } from "@/store/customerStore";

export default function CustomerProject() {
  const { fetchCustomerProjects, fetchCustomerByUserId } = useCustomerStore();
  const { tasks, fetchAllTasksWithChildren } = useTaskStore();
  const [loading, setLoading] = useState(true);
  const [customerProject, setCustomerProject] = useState<Project | null>();
  const { user, userData } = useAuthStore();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const navigate = useNavigate();
  const [progressPercentage, setProgress] = useState(0);

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

  const calculateCompletedPercentage = (task: Task): number => {
    if (!task.children || task.children.length === 0) {
      return task.completed ? 100 : 0;
    }

    const totalAssignedToChildren = task.children.reduce(
      (sum, child) => sum + (child.percentage || 0),
      0
    );

    if (totalAssignedToChildren === 0) return 0;

    const completedSum = task.children.reduce((sum, subtask) => {
      return sum + (subtask.completed ? subtask.percentage || 0 : 0);
    }, 0);

    const comp = Math.round((completedSum / totalAssignedToChildren) * 100);
    return Number(((comp * task.percentage) / 100).toFixed(1));
  };

  const calculateProjectCompletion = (): number => {
    if (!tasks.length) return 0;

    const rootTasks = tasks;

    let sum = 0;

    rootTasks.forEach((task) => {
      let value = calculateCompletedPercentage(task);
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

  if (!customerProject) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Project Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold mb-2 capitalize">
            {customerProject.name}
          </h1>
          <p className="text-gray-600 mb-4">{customerProject.description}</p>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Overall Progress</span>
              <span className="text-gray-600">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">
              {tasks.filter((task) => task.completed).length} of {tasks.length}{" "}
              main tasks completed
            </p>
          </div>
        </div>

        {/* Project Details */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Project Details</h2>
          <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
            <tbody>
              <tr className="border-b">
                <td className="px-4 py-2 text-sm font-medium text-gray-500 bg-gray-100">
                  Project ID
                </td>
                <td className="px-4 py-2">{customerProject.__id}</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-2 text-sm font-medium text-gray-500 bg-gray-100">
                  Created At
                </td>
                <td className="px-4 py-2">
                  {new Date(customerProject.createdAt).toLocaleDateString()}
                </td>
              </tr>
              {customerProject.project_start_date && (
                <tr className="border-b">
                  <td className="px-4 py-2 text-sm font-medium text-gray-500 bg-gray-100">
                    Start Date
                  </td>
                  <td className="px-4 py-2">
                    {new Date(
                      customerProject.project_start_date
                    ).toLocaleDateString()}
                  </td>
                </tr>
              )}
              {customerProject.project_due_date && (
                <tr className="border-b">
                  <td className="px-4 py-2 text-sm font-medium text-gray-500 bg-gray-100">
                    Due Date
                  </td>
                  <td className="px-4 py-2">
                    {new Date(
                      customerProject.project_due_date
                    ).toLocaleDateString()}
                  </td>
                </tr>
              )}
              <tr>
                <td className="px-4 py-2 text-sm font-medium text-gray-500 bg-gray-100">
                  Project Status
                </td>
                <td className="px-4 py-2">
                  <ProjectStatusSelect
                    project={{
                      id: customerProject.id as string,
                      status: customerProject.status,
                    }}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Main Tasks</h2>
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="border rounded-lg p-4 hover:border-blue-100 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{task.name}</h3>
                    {task.description && (
                      <p className="text-gray-600 mt-1">{task.description}</p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      task.completed
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {task.completed ? "Completed" : "In Progress"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-6">
          <ProjectComments projectId={customerProject.id as string} />
        </div>
      </div>
    </div>
  );
}
