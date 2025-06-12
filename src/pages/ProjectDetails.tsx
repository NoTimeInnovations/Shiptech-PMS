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
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-red-500">Project not found</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate("/dashboard/projects")}>
            <ArrowLeft className=" h-7 w-7" />
          </button>
          <h2 className="text-2xl font-bold">Project Details</h2>
        </div>
        <div className="flex space-x-4">
          {isAdmin && (
            <>
              <button
                onClick={() => {
                  const customer = customers.find(
                    (c) =>
                      c.name === project.customer.name &&
                      c.contactPersons[0]?.phone === project.customer.phone
                  );
                  setCustomerEmail(customer?.email || "");
                  setShowCredentialsModal(true);
                }}
                className="inline-flex items-center px-4 py-2 font-medium rounded-md text-black bg-white border-[1px] hover:opacity-70"
              >
                <Key className="mr-2 h-4 w-4" />
                Customer Credentials
              </button>
              <CustomerCredentialsModal
                isOpen={showCredentialsModal}
                onClose={() => setShowCredentialsModal(false)}
                customerEmail={customerEmail}
                customerName={project.customer.name}
              />
              <button
                onClick={() => navigate(`/dashboard/projects/${id}/documents`)}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <FileText className="w-4 h-4 mr-2" />
                Documents
              </button>
            </>
          )}
          {project.status === "completed" && (
            <button
              // onClick={downloadInvoice}
              className="inline-flex items-center px-4 py-2   font-medium rounded-md text-black bg-white border-[1px]  hover:opacity-70"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Download Invoice
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => navigate(`/dashboard/projects/${id}/edit`)}
              className="inline-flex items-center px-4 py-2 font-medium rounded-md text-black bg-white border-[1px] hover:opacity-70"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Project
            </button>
          )}
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <h2 className="text-2xl font-bold mb-4">Analytics Dashboard</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-blue-100 p-4 rounded-lg">
            <h3 className="text-lg font-semibold">Total Tasks</h3>
            <p className="text-2xl font-bold">{totalTasks}</p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg cursor-pointer">
            <h3 className="text-lg font-semibold">Completed Tasks</h3>
            <p className="text-2xl font-bold">{completedTasks}</p>
          </div>
          <div
            className="bg-yellow-100 p-4 rounded-lg cursor-pointer"
            onMouseEnter={handleIncompleteTasksHover}
            onMouseLeave={closePopover}
          >
            <h3 className="text-lg font-semibold">Incomplete Tasks</h3>
            <p className="text-2xl font-bold">{incompleteTasks}</p>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="text-lg font-semibold">Project Due Date</h3>
            <p className="text-2xl font-bold">{new Date(projectDueDate).toLocaleDateString("en-GB")}</p>
          </div>
          <div
            className="bg-red-100 p-4 rounded-lg"
            onMouseEnter={handleOverdueTasksHover}
            onMouseLeave={closePopover}
          >
            <h3 className="text-lg font-semibold">Overdue Tasks</h3>
            <p className="text-2xl font-bold">{overdueTasks}</p>
          </div>
        </div>
      </div>

      {/* Render the popover */}
      <TaskPopover
        tasks={popoverTasks}
        isOpen={popoverOpen}
        onClose={closePopover}
      />

      <div className="mt-7 flex flex-col gap-5 px-[10%]">
        {/* Project Information */}
        <div className="bg-white border-[1px] rounded-lg ">
          <div className="border-b border-gray-200 bg-white px-6 py-3">
            <h3 className="text-lg font-medium text-gray-900">
              Project Information
            </h3>
          </div>
          <div className="px-6 py-4">
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="py-2 font-medium text-gray-500">ID</td>
                  <td className="py-2">P-{project.projectNumber}</td>
                </tr>
                {/* <tr>
                  <td className="py-2 font-medium text-gray-500">Created At</td>
                  <td className="py-2">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </td>
                </tr> */}


                <tr>
  <td className="py-2 font-medium text-gray-500">Created At</td>
  <td className="py-2">
    {new Date(project.createdAt).toLocaleDateString('en-GB')}
  </td>
</tr>
                <tr>
                  <td className="py-2 font-medium text-gray-500">Name</td>
                  <td className="py-2">{project.name}</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-gray-500">
                    Description
                  </td>
                  <td className="py-2">{project.description}</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-gray-500">Start Date</td>
                  <td className="py-2">
                    <div className="flex items-center justify-start gap-5">
                      {isEditingStartDate ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="date"
                            value={tempStartDate}
                            onChange={handleStartDateChange}
                            className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                          {showStartDateConfirm && (
                            <div className="flex space-x-2">
                              <button
                                onClick={confirmStartDateChange}
                                className="p-1 text-green-600 hover:text-green-700"
                              >
                                <Check className="h-5 w-5" />
                              </button>
                              <button
                                onClick={cancelStartDateChange}
                                className="p-1 text-red-600 hover:text-red-700"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center text-gray-900">
                          
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {project.project_start_date ? (
                            new Date(
                              project.project_start_date
                            ).toLocaleDateString("en-GB")
                          ) : (
                            <span className="text-gray-500">
                              No start date set
                            </span>
                          )}
                        </div>
                      )}
                      {isAdmin && !isEditingStartDate && (
                        <button
                          onClick={() => setIsEditingStartDate(true)}
                          className="text-blue-600 hover:text-blue-700 text-[12px]"
                        >
                          {project.project_start_date
                            ? "Change"
                            : "Set Start Date"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {isAdmin && (
                  <tr>
                    <td className="py-2 font-medium text-gray-500">Due Date</td>
                    <td className="py-2">
                      <div className="flex items-center justify-start gap-5">
                        {isEditingDueDate ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="date"
                              value={tempDueDate}
                              onChange={handleDueDateChange}
                              className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                            {showDueDateConfirm && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={confirmDueDateChange}
                                  className="p-1 text-green-600 hover:text-green-700"
                                >
                                  <Check className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={cancelDueDateChange}
                                  className="p-1 text-red-600 hover:text-red-700"
                                >
                                  <X className="h-5 w-5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center text-gray-900">
                            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                            {project.project_due_date ? (
                              new Date(
                                project.project_due_date
                              ).toLocaleDateString("en-GB")
                            ) : (
                              <span className="text-gray-500">
                                No due date set
                              </span>
                            )}
                          </div>
                        )}
                        {isAdmin && !isEditingDueDate && (
                          <button
                            onClick={() => setIsEditingDueDate(true)}
                            className="text-blue-600 hover:text-blue-700 text-[12px]"
                          >
                            {project.project_due_date
                              ? "Change"
                              : "Set Due Date"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="py-2 font-medium text-gray-500">
                    Project Status
                  </td>

                  {/* project status */}

                  <td className="py-2">
                    <ProjectStatusSelect
                      project={{
                        id: project.id as string,
                        status: project.status,
                      }}
                      updateProjectStatus={updateProjectStatus}
                      tasks={tasks}
                    />
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-gray-500">
                    Project Completion
                  </td>
                  <td className="py-2">
                    <div className="w-full bg-gray-200 rounded-full">
                      <div
                        className="bg-blue-600 text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-full"
                        style={{ width: `${completedPercentage}%` }}
                      >
                        {completedPercentage}%
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Details Section */}
        <div className="bg-white rounded-xl border-[1px] overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-3">
            <h3 className="text-lg font-medium text-gray-900">
              Customer Details
            </h3>
          </div>
          <div className="px-6 py-4">
            {customerDetails ? (
              <div className="grid grid-cols-2 gap-4">
                {customerDetails.logoUrl && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-500">Logo</p>
                    <img
                      src={customerDetails.logoUrl}
                      alt="Customer Logo"
                      className="mt-1 max-h-20 object-contain"
                    />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="mt-1">
                    {customerDetails.name || project.customer.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="mt-1">{customerDetails.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    GST Number
                  </p>
                  <p className="mt-1">{customerDetails.gstNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    End Client
                  </p>
                  <p className="mt-1">{project.endClient}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-500">Address</p>
                  <p className="mt-1">
                    {customerDetails.address || project.customer.address}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-500">
                    Billing Address
                  </p>
                  <p className="mt-1">{customerDetails.billingAddress}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-500">
                    Contact Persons
                  </p>
                  <div className="mt-1 space-y-2">
                    {customerDetails.contactPersons.map((person, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <span className="text-sm text-gray-700">
                          {person.name}
                        </span>
                        <span className="text-sm text-gray-500">-</span>
                        <span className="text-sm text-gray-700">
                          {person.phone}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No customer details found.
              </p>
            )}
          </div>
        </div>

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
