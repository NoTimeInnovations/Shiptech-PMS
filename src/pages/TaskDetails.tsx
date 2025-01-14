import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore, Task } from '../store/projectStore';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import TaskModal from '../components/TaskModal';
import TaskList from '../components/TaskList';
import ItemDetails from '../components/ItemDetails';

export default function TaskDetails() {
  const { projectId, taskPath } = useParams<{ projectId: string; taskPath: string }>();
  const navigate = useNavigate();
  const { 
    getTaskByPath, 
    addTask, 
    updateTask, 
    deleteTask,
    currentPath,
    setCurrentPath
  } = useProjectStore();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    const loadTask = async () => {
      if (!projectId || !taskPath) return;

      try {
        setLoading(true);
        const pathArray = taskPath.split('/').map(id => ({ id }));
        setCurrentPath(pathArray);
        
        const data = await getTaskByPath(projectId, pathArray);
        if (data) {
          setTask({
            ...data,
            children: data.children || [] // Ensure children array exists
          });
        } else {
          toast.error('Task not found');
          navigate(`/dashboard/projects/${projectId}`);
        }
      } catch (error) {
        console.error('Error loading task:', error);
        toast.error('Failed to load task');
        navigate(`/dashboard/projects/${projectId}`);
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

    loadTask();
    checkUserRole();
  }, [projectId, taskPath, user, getTaskByPath, navigate, setCurrentPath]);

  const handleAddTask = async (data: any) => {
    if (!projectId || !taskPath) return;
    try {
      await addTask(projectId, currentPath, data);
      const updatedTask = await getTaskByPath(projectId, currentPath);
      if (updatedTask) {
        setTask({
          ...updatedTask,
          children: updatedTask.children || [] // Ensure children array exists
        });
        toast.success('Task added successfully');
      }
    } catch (error) {
      console.error('Failed to add task:', error);
      toast.error('Failed to add task');
    }
  };

  const handleEditTask = async (data: any) => {
    if (!projectId || !taskPath || !editingTask) return;
    try {
      await updateTask(projectId, currentPath, editingTask.id, data);
      const updatedTask = await getTaskByPath(projectId, currentPath);
      if (updatedTask) {
        setTask({
          ...updatedTask,
          children: updatedTask.children || [] // Ensure children array exists
        });
        toast.success('Task updated successfully');
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!projectId || !taskPath) return;
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(projectId, currentPath, taskId);
        const updatedTask = await getTaskByPath(projectId, currentPath);
        if (updatedTask) {
          setTask({
            ...updatedTask,
            children: updatedTask.children || [] // Ensure children array exists
          });
          toast.success('Task deleted successfully');
        }
      } catch (error) {
        console.error('Failed to delete task:', error);
        toast.error('Failed to delete task');
      }
    }
  };

  const handleTaskClick = (clickedTask: Task) => {
    const newPath = [...currentPath, { id: clickedTask.id }];
    setCurrentPath(newPath);
    navigate(`/dashboard/projects/${projectId}/task/${newPath.map(p => p.id).join('/')}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6">
        <p className="text-red-500">Task not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center space-x-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </button>
        <h1 className="text-2xl font-bold">{task.name}</h1>
      </div>

      <ItemDetails item={task} />

      <TaskList
        tasks={task.children}
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