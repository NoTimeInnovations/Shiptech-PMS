import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { 
  Loader2, 
  Pencil, 
  FileDown, 
  ArrowLeft,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import html2pdf from 'html2pdf.js';
import toast from 'react-hot-toast';
import TaskModal from '../components/TaskModal';
import TaskList from '../components/TaskList';
import { Task } from '../store/projectStore';

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    fetchProject, 
    addTask, 
    updateTask, 
    deleteTask,
    currentPath,
    setCurrentPath
  } = useProjectStore();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    const loadProject = async () => {
      if (!id) return;

      try {
        const data = await fetchProject(id);
        if (data) {
          setProject({
            ...data,
            tasks: data.tasks || [] // Ensure tasks array exists
          });
        } else {
          toast.error('Project not found');
          navigate('/dashboard/projects');
        }
      } catch (error) {
        console.error('Error loading project:', error);
        toast.error('Failed to load project');
        navigate('/dashboard/projects');
      } finally {
        setLoading(false);
      }
    };

    const checkUserRole = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        setIsAdmin(userData?.role === 'admin');
      }
    };

    loadProject();
    checkUserRole();
  }, [id, user, fetchProject, navigate]);

  const handleAddTask = async (data: any) => {
    if (!id) return;
    try {
      await addTask(id, currentPath, data);
      const updatedProject = await fetchProject(id);
      if (updatedProject) {
        setProject({
          ...updatedProject,
          tasks: updatedProject.tasks || [] // Ensure tasks array exists
        });
        toast.success('Task added successfully');
      }
    } catch (error) {
      console.error('Failed to add task:', error);
      toast.error('Failed to add task');
    }
  };

  const handleEditTask = async (data: any) => {
    if (!id || !editingTask) return;
    try {
      await updateTask(id, currentPath, editingTask.id, data);
      const updatedProject = await fetchProject(id);
      if (updatedProject) {
        setProject({
          ...updatedProject,
          tasks: updatedProject.tasks || [] // Ensure tasks array exists
        });
        toast.success('Task updated successfully');
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!id) return;
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(id, currentPath, taskId);
        const updatedProject = await fetchProject(id);
        if (updatedProject) {
          setProject({
            ...updatedProject,
            tasks: updatedProject.tasks || [] // Ensure tasks array exists
          });
          toast.success('Task deleted successfully');
        }
      } catch (error) {
        console.error('Failed to delete task:', error);
        toast.error('Failed to delete task');
      }
    }
  };

  const handleTaskClick = (task: Task) => {
    const newPath = [...currentPath, { id: task.id }];
    setCurrentPath(newPath);
    navigate(`/dashboard/projects/${id}/task/${newPath.map(p => p.id).join('/')}`);
  };

  const downloadInvoice = () => {
    if (!project) return;

    const calculateTaskTotal = (task: Task): number => {
      const taskTotal = (task.hours || 0) * (task.costPerHour || 0);
      const childrenTotal = task.children.reduce((sum, child) => sum + calculateTaskTotal(child), 0);
      return taskTotal + childrenTotal;
    };

    const totalAmount = project.tasks.reduce((sum: number, task: Task) => 
      sum + calculateTaskTotal(task), 0);

    const renderTasksRecursively = (tasks: Task[], level = 0): string => {
      return tasks.map(task => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            ${'&nbsp;'.repeat(level * 4)}${task.name}
            ${task.description ? `<br><span style="color: #666; font-size: 0.9em;">${task.description}</span>` : ''}
          </td>
          <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">${task.hours || 0}</td>
          <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">₹${task.costPerHour || 0}</td>
          <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">₹${(task.hours || 0) * (task.costPerHour || 0)}</td>
        </tr>
        ${renderTasksRecursively(task.children, level + 1)}
      `).join('');
    };

    const content = `
      <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #2563eb;">PROJECT INVOICE</h1>
          <p style="color: #666;">Project ID: ${project.__id}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2>ShipTech-ICON</h2>
          <p>Center for Innovation Technology Transfer & Industrial Collaboration</p>
          <p>CITTIC, CUSAT, Kochi, Kerala 682022</p>
        </div>

        <div style="margin-bottom: 30px;">
          <h3>Project Information</h3>
          <p><strong>Name:</strong> ${project.name}</p>
          <p><strong>Description:</strong> ${project.description}</p>
        </div>

        <div style="margin-bottom: 30px;">
          <h3>Customer Details:</h3>
          <p><strong>${project.customer.name}</strong></p>
          <p>${project.customer.address}</p>
          <p>Phone: ${project.customer.phone}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Task</th>
              <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">Hours</th>
              <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">Rate/Hour</th>
              <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${renderTasksRecursively(project.tasks)}
            <tr style="background-color: #f3f4f6;">
              <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">Total Amount:</td>
              <td style="padding: 12px; text-align: right; font-weight: bold;">₹${totalAmount}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    const opt = {
      margin: 1,
      filename: `project-invoice-${project.__id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    const element = document.createElement('div');
    element.innerHTML = content;
    document.body.appendChild(element);

    html2pdf().set(opt).from(element).save().then(() => {
      document.body.removeChild(element);
    });
  };

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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard/projects')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </button>
          <h2 className="text-2xl font-bold">Project Details</h2>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={downloadInvoice}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Download Invoice
          </button>
          {isAdmin && (
            <button
              onClick={() => navigate(`/dashboard/projects/${id}/edit`)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Project
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Project Information */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
            <h3 className="text-lg font-medium text-gray-900">Project Information</h3>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">ID</p>
                <p className="mt-1">{project.__id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Created At</p>
                <p className="mt-1">{new Date(project.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="mt-1">{project.name}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p className="mt-1">{project.description}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Customer Name</p>
                <p className="mt-1">{project.customer.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Phone</p>
                <p className="mt-1">{project.customer.phone}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500">Address</p>
                <p className="mt-1">{project.customer.address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks Section */}
        <TaskList
          tasks={project.tasks}
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
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={editingTask ? handleEditTask : handleAddTask}
        initialData={editingTask}
      />
    </div>
  );
}