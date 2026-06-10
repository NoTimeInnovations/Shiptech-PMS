import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Task, useProjectStore } from '../store/projectStore';
import { Loader2 } from 'lucide-react';
import TaskDetailsModal from '../components/TaskDetailsModal';
import BackButton from '../components/BackButton';
import ItemDetails from '../components/ItemDetails';
import SubTaskList from '../components/SubTaskList';
import toast from 'react-hot-toast';

interface TaskFormData {
  name: string;
  description: string;
  assignedTo?: User;
  deadline?: string;
}

interface User {
  id: string;
  fullName: string;
  email: string;
}

export default function DeliverableDetails() {
  const { projectId, path } = useParams<{ projectId: string; path: string }>();
  const navigate = useNavigate();
  const {
    getTaskByPath,
    addTask,
    updateTask,
    deleteTask,
    setCurrentPath,
  } = useProjectStore();
  const [item, setItem] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    const loadItem = async () => {
      if (!projectId || !path) return;

      try {
        const pathArray = path.split('/').map((p) => {
          const [type, id] = p.split(':');
          return { type: type as 'deliverable' | 'subtask', id };
        });

        setCurrentPath(pathArray);
        const data = await getTaskByPath(projectId, pathArray);
        if (data) {
          setItem(data);
        } else {
          toast.error('Item not found');
          navigate(`/dashboard/projects/${projectId}`);
        }
      } catch (error) {
        console.error('Error loading item:', error);
        toast.error('Failed to load item');
        navigate(`/dashboard/projects/${projectId}`);
      } finally {
        setLoading(false);
      }
    };

    loadItem();
  }, [projectId, path, getTaskByPath, navigate, setCurrentPath]);

  const handleAddTask = async (data: TaskFormData) => {
    if (!projectId || !path) return;

    try {
      const pathArray = path.split('/').map((p) => {
        const [type, id] = p.split(':');
        return { type: type as 'deliverable' | 'subtask', id };
      });

      const newTask: Omit<Task, 'id' | 'completed' | 'children'> = {
        name: data.name,
        description: data.description,
        assignedTo: data.assignedTo ? [data.assignedTo] : undefined,
        deadline: data.deadline,
        hours: 0,
        costPerHour: 0,
        timeEntries: [],
        percentage: 0,
      };

      await addTask(projectId, pathArray, newTask);
      const updatedItem = await getTaskByPath(projectId, pathArray);
      if (updatedItem) {
        setItem(updatedItem);
        toast.success('Task added successfully');
      }
    } catch (error) {
      console.error('Failed to add task:', error);
      toast.error('Failed to add task');
    }
  };

  const handleEditTask = async (data: TaskFormData) => {
    if (!projectId || !path || !editingTask) return;

    try {
      const pathArray = path.split('/').map((p) => {
        const [type, id] = p.split(':');
        return { type: type as 'deliverable' | 'subtask', id };
      });

      const updatedTask: Task = {
        ...editingTask,
        name: data.name,
        description: data.description,
        assignedTo: data.assignedTo ? [data.assignedTo] : undefined,
        deadline: data.deadline,
      };

      await updateTask(projectId, pathArray, editingTask.id, updatedTask);
      const updatedItem = await getTaskByPath(projectId, pathArray);
      if (updatedItem) {
        setItem(updatedItem);
        toast.success('Task updated successfully');
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!projectId || !path) return;

    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        const pathArray = path.split('/').map((p) => {
          const [type, id] = p.split(':');
          return { type: type as 'deliverable' | 'subtask', id };
        });

        await deleteTask(projectId, pathArray, taskId);
        const updatedItem = await getTaskByPath(projectId, pathArray);
        if (updatedItem) {
          setItem(updatedItem);
          toast.success('Task deleted successfully');
        }
      } catch (error) {
        console.error('Failed to delete task:', error);
        toast.error('Failed to delete task');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-6">
        <p className="text-destructive">Item not found</p>
      </div>
    );
  }

  // Convert Task to ItemDetails compatible format
  const itemDetailsData = {
    id: item.id,
    description: item.description || '',
    assignedTo: item.assignedTo?.map(user => ({ fullName: user.fullName })) || [],
    deadline: item.deadline || undefined,
    completed: item.completed,
    hours: item.hours,
    costPerHour: item.costPerHour,
    children: item.children,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center space-x-4 mb-8">
        <BackButton onClick={() => navigate(-1)} />
        <h1 className="text-2xl font-heading font-semibold">{item.name}</h1>
      </div>

      <ItemDetails item={itemDetailsData} />

      <SubTaskList
        tasks={item.children || []}
        onAddClick={() => {
          setEditingTask(null);
          setIsModalOpen(true);
        }}
        onEditClick={(task) => {
          setEditingTask(task as Task);
          setIsModalOpen(true);
        }}
        onDeleteClick={handleDeleteTask}
        onTaskClick={() => {}} // This will be handled by the task click handler in SubTaskList
      />

      <TaskDetailsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={editingTask ? handleEditTask : handleAddTask}
        initialData={editingTask ? {
          name: editingTask.name,
          description: editingTask.description,
          assignedTo: editingTask.assignedTo?.[0],
          deadline: editingTask.deadline || undefined,
        } : undefined}
      />
    </div>
  );
}