import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjectStore } from "../store/projectStore";
import { useCustomerStore, Customer } from "@/store/customerStore";
import {
  Loader2,
  Pencil,
  FileDown,
  ArrowLeft,
  Calendar,
  Check,
  X,
  Key,
  FileText,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import toast from "react-hot-toast";
import TaskModal from "../components/TaskModal";
import TaskList from "../components/TaskList";
import ProjectComments from "../components/ProjectComments";
import CustomerCredentialsModal from "../components/CustomerCredentialsModal";
import ProjectStatusSelect from "@/components/ProjectStatusSelect";
import { useTaskStore, Task } from "../store/taskStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

import TaskPopover from "../components/TaskPopover";

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addTask, updateTask, deleteTask, fetchAllTasksWithChildren, tasks } =
    useTaskStore();
  const {
    fetchProject,
    currentPath,
    setCurrentPath,
    updateProjectDueDate,
    updateProjectStartDate,
    updateProjectStatus,
    project,
  } = useProjectStore();
  const { fetchCustomers, customers, fetchCustomer } = useCustomerStore();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [tempDueDate, setTempDueDate] = useState<string>("");
  const [showDueDateConfirm, setShowDueDateConfirm] = useState(false);
  const [isEditingStartDate, setIsEditingStartDate] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<string>("");
  const [showStartDateConfirm, setShowStartDateConfirm] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const { user } = useAuthStore();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverTasks, setPopoverTasks] = useState<
    { name: string; deadline: string; assignees: string[] }[]
  >([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [incompleteTasks, setIncompleteTasks] = useState(0);
  const [projectDueDate, setProjectDueDate] = useState<string>("");
  const [overdueTasks, setOverdueTasks] = useState(0);
  const [completedPercentage, setCompletedPercentage] = useState<number>(0);
  const [customerDetails, setCustomerDetails] = useState<Customer | null>(null);

  const calculateCompletedPercentage = (task: Task): number => {
    if (!task.children || task.children.length === 0) {
      // If the task has no children, return the percentage based on its own completion status
      return task.completed ? task.percentage || 100 : 0;
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
    return Number(((comp * (task.percentage || 100)) / 100).toFixed(1));
  };

  const calculateProjectCompletion = (): number => {
    if (!tasks.length) return 0;

    const rootTasks = tasks;
    // console.log(rootTasks, "rootTasks");

    let sum = 0;

    rootTasks.forEach((task) => {
      // console.log(task, "task");
      const value = calculateCompletedPercentage(task);
      // console.log(value, "value");
      sum += value;
    });
    return sum;
  };

  useEffect(() => {
    const loadProject = async () => {
      if (!id) return;

      try {
        setLoading(true);
        await fetchCustomers();
        const p = await fetchProject(id);
        const data = p;
        if (data) {
          await fetchAllTasksWithChildren(id, undefined, true);
          if (data.project_due_date) {
            setTempDueDate(data.project_due_date);
          }
          if (data.project_start_date) {
            setTempStartDate(data.project_start_date);
          }
        } else {
          toast.error("Project not found");
          navigate("/dashboard/projects");
        }
      } catch (error) {
        console.error("Error loading project:", error);
        toast.error("Failed to load project");
        navigate("/dashboard/projects");
      } finally {
        setLoading(false);
      }
    };

    const checkUserRole = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        setIsAdmin(userData?.role === "admin");
      }
    };

    loadProject();
    checkUserRole();
  }, [id, user, fetchProject, navigate]);

  useEffect(() => {
    if (project) {
      fetchCustomer(project.customer_id).then((customer) => {
        // console.log("customer detail : ",customer)
        setCustomerDetails(customer);
      });
    }
  }, [project]);

  useEffect(() => {
    // Calculate analytics for tasks
    const totalTasks = tasks.length || 0;
    const completedTasks = tasks.filter((task) => task.completed).length || 0;
    const incompleteTasks = totalTasks - completedTasks;
    const projectDueDate = project?.project_due_date
      ? new Date(project.project_due_date).toLocaleDateString()
      : "No due date set";
    const overdueTasks =
      tasks.filter(
        (task) =>
          task.deadline &&
          new Date(task.deadline) < new Date() &&
          !task.completed
      ).length || 0;

    setTotalTasks(totalTasks);
    setCompletedTasks(completedTasks);
    setIncompleteTasks(incompleteTasks);
    setProjectDueDate(projectDueDate);
    setOverdueTasks(overdueTasks);
  }, [tasks]);

  const handleAddTask = async (data: Omit<Task, "id">) => {
    if (!id || !project) return;
    try {
      const newTask = {
        ...data,
        projectId: project.id as string,
        parentId:
          currentPath.length > 0
            ? currentPath[currentPath.length - 1].id
            : null,
      };
      // console.log(newTask, "newTask");
      await addTask(newTask as Task);
      toast.success("Task added successfully");
    } catch (error) {
      console.error("Failed to add task:", error);
      toast.error("Failed to add task");
    }
  };

  const handleEditTask = async (data: Partial<Task>) => {
    if (!id || !editingTask) return;
    try {
      await updateTask(editingTask.id, data);
      toast.success("Task updated successfully");
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!id) return;
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

  const handleTaskClick = (task: Task) => {
    const newPath = [...currentPath, { id: task.id }];
    setCurrentPath(newPath);
    navigate(
      `/dashboard/projects/${id}/task/${newPath.map((p) => p.id).join("/")}`
    );
  };

  const handleDueDateChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newDate = e.target.value;
    setTempDueDate(newDate);
    setShowDueDateConfirm(true);
  };

  const handleStartDateChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newDate = e.target.value;
    setTempStartDate(newDate);
    setShowStartDateConfirm(true);
  };

  const confirmDueDateChange = async () => {
    if (!id) return;
    try {
      await updateProjectDueDate(id, tempDueDate);
      toast.success("Project due date updated successfully");
      setIsEditingDueDate(false);
      setShowDueDateConfirm(false);
    } catch (error) {
      console.error("Failed to update due date:", error);
      toast.error("Failed to update due date");
    }
  };

  const confirmStartDateChange = async () => {
    if (!id) return;
    try {
      await updateProjectStartDate(id, tempStartDate);
      const updatedProject = await fetchProject(id);
      if (updatedProject) {
        toast.success("Project start date updated successfully");
      }
      setIsEditingStartDate(false);
      setShowStartDateConfirm(false);
    } catch (error) {
      console.error("Failed to update start date:", error);
      toast.error("Failed to update start date");
    }
  };

  const cancelStartDateChange = () => {
    if (!project) return;
    setTempStartDate(project.project_start_date || "");
    setShowStartDateConfirm(false);
    setIsEditingStartDate(false);
  };

  const cancelDueDateChange = () => {
    if (!project) return;
    setTempDueDate(project.project_due_date || "");
    setShowDueDateConfirm(false);
    setIsEditingDueDate(false);
  };

  useEffect(() => {
    const projectCompletionPercentage = calculateProjectCompletion();
    setCompletedPercentage(projectCompletionPercentage);
  }, [tasks]);

  const handleIncompleteTasksHover = () => {
    const IncompleteTasks =
      tasks
        .filter((task) => !task.completed)
        .map((task) => ({
          name: task.name,
          deadline: task.deadline ? task.deadline : "",
          assignees: task.assignedTo
            ? task.assignedTo.map((user) => user.name)
            : [],
        })) || [];
    setPopoverTasks(IncompleteTasks);
    setPopoverOpen(true);
  };

  // Function to handle mouse enter on overdue tasks
  const handleOverdueTasksHover = () => {
    const OverdueTasks =
      tasks
        .filter(
          (task: Task) =>
            task.deadline &&
            new Date(task.deadline) < new Date() &&
            !task.completed
        )
        .map((task: Task) => ({
          name: task.name,
          deadline: task.deadline ? task.deadline : "",
          assignees: task.assignedTo
            ? task.assignedTo.map((user) => user.name)
            : [],
        })) || [];
    setPopoverTasks(OverdueTasks);
    setPopoverOpen(true);
  };

  // Function to close the popover
  const closePopover = () => {
    setPopoverOpen(false);
  };

  // useEffect(() => {
  //   console.log(tasks, "tasks on project details");
  // }, [tasks]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-destructive">Project not found</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/projects")}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-heading font-semibold">
              Project Details
            </h2>
            <p className="text-sm text-muted-foreground">
              Overview, tasks and customer information for this project
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {isAdmin && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  const customer = customers.find(
                    (c) =>
                      c.name === project.customer.name &&
                      c.contactPersons[0]?.phone === project.customer.phone
                  );
                  setCustomerEmail(customer?.email || "");
                  setShowCredentialsModal(true);
                }}
              >
                <Key />
                Customer Credentials
              </Button>
              <CustomerCredentialsModal
                isOpen={showCredentialsModal}
                onClose={() => setShowCredentialsModal(false)}
                customerEmail={customerEmail}
                customerName={project.customer.name}
              />
              <Button
                variant="outline"
                onClick={() => navigate(`/dashboard/projects/${id}/documents`)}
              >
                <FileText />
                Documents
              </Button>
            </>
          )}
          {project.status === "completed" && (
            <Button
              variant="outline"
              // onClick={downloadInvoice}
            >
              <FileDown />
              Download Invoice
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => navigate(`/dashboard/projects/${id}/edit`)}
            >
              <Pencil />
              Edit Project
            </Button>
          )}
        </div>
      </div>

      {/* Analytics Dashboard */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Analytics Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-border bg-blue-100 p-4">
              <h3 className="text-sm font-medium">Total Tasks</h3>
              <p className="mt-1 text-2xl font-semibold">{totalTasks}</p>
            </div>
            <div className="rounded-lg border border-border bg-green-100 p-4 cursor-pointer">
              <h3 className="text-sm font-medium">Completed Tasks</h3>
              <p className="mt-1 text-2xl font-semibold">{completedTasks}</p>
            </div>
            <div
              className="rounded-lg border border-border bg-yellow-100 p-4 cursor-pointer"
              onMouseEnter={handleIncompleteTasksHover}
              onMouseLeave={closePopover}
            >
              <h3 className="text-sm font-medium">Incomplete Tasks</h3>
              <p className="mt-1 text-2xl font-semibold">{incompleteTasks}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted p-4">
              <h3 className="text-sm font-medium">Project Due Date</h3>
              <p className="mt-1 text-2xl font-semibold">
                {new Date(projectDueDate).toLocaleDateString("en-GB")}
              </p>
            </div>
            <div
              className="rounded-lg border border-border bg-red-100 p-4"
              onMouseEnter={handleOverdueTasksHover}
              onMouseLeave={closePopover}
            >
              <h3 className="text-sm font-medium">Overdue Tasks</h3>
              <p className="mt-1 text-2xl font-semibold">{overdueTasks}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Render the popover */}
      <TaskPopover
        tasks={popoverTasks}
        isOpen={popoverOpen}
        onClose={closePopover}
      />

      <div className="mt-7 flex flex-col gap-5 px-[10%]">
        {/* Project Information */}
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              <div className="flex items-center gap-4 py-3">
                <dt className="w-44 shrink-0 text-sm font-medium text-muted-foreground">
                  ID
                </dt>
                <dd className="text-sm">P-{project.projectNumber}</dd>
              </div>
              <div className="flex items-center gap-4 py-3">
                <dt className="w-44 shrink-0 text-sm font-medium text-muted-foreground">
                  Created At
                </dt>
                <dd className="text-sm">
                  {new Date(project.createdAt).toLocaleDateString("en-GB")}
                </dd>
              </div>
              <div className="flex items-center gap-4 py-3">
                <dt className="w-44 shrink-0 text-sm font-medium text-muted-foreground">
                  Name
                </dt>
                <dd className="text-sm">{project.name}</dd>
              </div>
              <div className="flex items-center gap-4 py-3">
                <dt className="w-44 shrink-0 text-sm font-medium text-muted-foreground">
                  Description
                </dt>
                <dd className="text-sm">{project.description}</dd>
              </div>
              <div className="flex items-center gap-4 py-3">
                <dt className="w-44 shrink-0 text-sm font-medium text-muted-foreground">
                  Start Date
                </dt>
                <dd className="text-sm">
                  <div className="flex items-center justify-start gap-5">
                    {isEditingStartDate ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={tempStartDate}
                          onChange={handleStartDateChange}
                          className="w-auto"
                        />
                        {showStartDateConfirm && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={confirmStartDateChange}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="size-5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={cancelStartDateChange}
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="size-5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center text-foreground">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        {project.project_start_date ? (
                          new Date(
                            project.project_start_date
                          ).toLocaleDateString("en-GB")
                        ) : (
                          <span className="text-muted-foreground">
                            No start date set
                          </span>
                        )}
                      </div>
                    )}
                    {isAdmin && !isEditingStartDate && (
                      <Button
                        variant="link"
                        size="xs"
                        onClick={() => setIsEditingStartDate(true)}
                        className="px-0"
                      >
                        {project.project_start_date
                          ? "Change"
                          : "Set Start Date"}
                      </Button>
                    )}
                  </div>
                </dd>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-4 py-3">
                  <dt className="w-44 shrink-0 text-sm font-medium text-muted-foreground">
                    Due Date
                  </dt>
                  <dd className="text-sm">
                    <div className="flex items-center justify-start gap-5">
                      {isEditingDueDate ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="date"
                            value={tempDueDate}
                            onChange={handleDueDateChange}
                            className="w-auto"
                          />
                          {showDueDateConfirm && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={confirmDueDateChange}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="size-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={cancelDueDateChange}
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="size-5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center text-foreground">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          {project.project_due_date ? (
                            new Date(
                              project.project_due_date
                            ).toLocaleDateString("en-GB")
                          ) : (
                            <span className="text-muted-foreground">
                              No due date set
                            </span>
                          )}
                        </div>
                      )}
                      {isAdmin && !isEditingDueDate && (
                        <Button
                          variant="link"
                          size="xs"
                          onClick={() => setIsEditingDueDate(true)}
                          className="px-0"
                        >
                          {project.project_due_date
                            ? "Change"
                            : "Set Due Date"}
                        </Button>
                      )}
                    </div>
                  </dd>
                </div>
              )}
              <div className="flex items-center gap-4 py-3">
                <dt className="w-44 shrink-0 text-sm font-medium text-muted-foreground">
                  Project Status
                </dt>

                {/* project status */}

                <dd className="text-sm">
                  <ProjectStatusSelect
                    project={{
                      id: project.id as string,
                      status: project.status,
                    }}
                    updateProjectStatus={updateProjectStatus}
                    tasks={tasks}
                  />
                </dd>
              </div>
              <div className="flex items-center gap-4 py-3">
                <dt className="w-44 shrink-0 text-sm font-medium text-muted-foreground">
                  Project Completion
                </dt>
                <dd className="flex-1 text-sm">
                  <div className="flex items-center gap-3">
                    <Progress
                      value={completedPercentage}
                      className="flex-1"
                    />
                    <span className="text-xs font-medium">
                      {completedPercentage}%
                    </span>
                  </div>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Customer Details Section */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent>
            {customerDetails ? (
              <div className="grid grid-cols-2 gap-4">
                {customerDetails.logoUrl && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Logo
                    </p>
                    <img
                      src={customerDetails.logoUrl}
                      alt="Customer Logo"
                      className="mt-1 max-h-20 object-contain"
                    />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Name
                  </p>
                  <p className="mt-1 text-sm">
                    {customerDetails.name || project.customer.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Email
                  </p>
                  <p className="mt-1 text-sm">{customerDetails.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    GST Number
                  </p>
                  <p className="mt-1 text-sm">{customerDetails.gstNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    End Client
                  </p>
                  <p className="mt-1 text-sm">{project.endClient}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Address
                  </p>
                  <p className="mt-1 text-sm">
                    {customerDetails.address || project.customer.address}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Billing Address
                  </p>
                  <p className="mt-1 text-sm">
                    {customerDetails.billingAddress}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Contact Persons
                  </p>
                  <div className="mt-1 space-y-2">
                    {customerDetails.contactPersons.map((person, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <span className="text-sm text-foreground">
                          {person.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          -
                        </span>
                        <span className="text-sm text-foreground">
                          {person.phone}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No customer details found.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tasks Section */}
        <TaskList
          tasks={tasks}
          onAddClick={() => {
            setEditingTask(null);
            setIsModalOpen(true);
          }}
          onEditClick={(task) => {
            setEditingTask(task);
            setIsModalOpen(true);
          }}
          onDeleteClick={handleDeleteTask}
          onTaskClick={handleTaskClick}
          isAdmin={isAdmin}
        />

        {/* Comments Section */}
        <div className="mt-6">
          {id && <ProjectComments projectData={project} projectId={id} />}
        </div>
      </div>

      <TaskModal
        tasks={tasks}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={editingTask ? handleEditTask : handleAddTask}
        initialData={editingTask || undefined}
        project={project}
      />
    </div>
  );
}
