import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { Loader2 } from 'lucide-react';
import TaskDetailsModal from '../components/TaskDetailsModal';
import BackButton from '../components/BackButton';
import ItemDetails from '../components/ItemDetails';
import SubTaskList from '../components/SubTaskList';
import toast from 'react-hot-toast';

export default function DeliverableDetails() {
  const { projectId, path } = useParams<{ projectId: string; path: string }>();
  const navigate = useNavigate();
  const { 
    getItemByPath,
    addSubTask,
    updateSubTask,
    deleteSubTask,
    currentPath,
    setCurrentPath
  } = useProjectStore();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  useEffect(() => {
    const loadItem = async () => {
      if (!projectId || !path) return;
      
      const pathArray = path.split('/').map(p => {
        const [type, id] = p.split(':');
        return { type: type as 'deliverable' | 'subtask', id };
      });

      setCurrentPath(pathArray);
      const data = await getItemByPath(projectId, pathArray);
      if (data) {
        setItem(data);
      } else {
        toast.error('Item not found');
        navigate(`/dashboard/projects/${projectId}`);
      }
      setLoading(false);
    };

    loadItem();
  }, [projectId, path, getItemByPath, navigate, setCurrentPath]);

  const handleAddTask = async (data: any) => {
    if (!projectId || !path) return;
    
    try {
      const pathArray = path.split('/').map(p => {
        const [type, id] = p.split(':');
        return { type: type as 'deliverable' | 'subtask', id };
      });

      const lastItem = pathArray[pathArray.length - 1];
      await addSubTask(
        projectId,
        pathArray[0].id,
        lastItem.type === 'subtask' ? lastItem.id : null,
        data
      );
      
      const updatedItem = await getItemByPath(projectId, pathArray);
      if (updatedItem) {
        setItem(updatedItem);
        toast.success('Task added successfully');
      }
    } catch (error) {
      toast.error('Failed to add task');
    }
  };

  const handleEditTask = async (data: any) => {
    if (!projectId || !path || !editingTask) return;

    try {
      const pathArray = path.split('/').map(p => {
        const [type, id] = p.split(':');
        return { type: type as 'deliverable' | 'subtask', id };
      });

      await updateSubTask(projectId, pathArray[0].id, editingTask.id, data);
      
      const updatedItem = await getItemByPath(projectId, pathArray);
      if (updatedItem) {
        setItem(updatedItem);
        toast.success('Task updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!projectId || !path) return;

    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        const pathArray = path.split('/').map(p => {
          const [type, id] = p.split(':');
          return { type: type as 'deliverable' | 'subtask', id };
        });

        await deleteSubTask(projectId, pathArray[0].id, taskId);
        
        const updatedItem = await getItemByPath(projectId, pathArray);
        if (updatedItem) {
          setItem(updatedItem);
          toast.success('Task deleted successfully');
        }
      } catch (error) {
        toast.error('Failed to delete task');
      }
    }
  };

  const handleTaskClick = (task: any) => {
    const newPath = [...currentPath, { type: 'subtask', id: task.id }];
    const pathString = newPath.map(p => `${p.type}:${p.id}`).join('/');
    navigate(`/dashboard/projects/${projectId}/deliverable/${pathString}`);
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
        <p className="text-red-500">Item not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center space-x-4 mb-8">
        <BackButton onClick={() => navigate(-1)} />
        <h1 className="text-2xl font-bold">{item.name}</h1>
      </div>

      <ItemDetails item={item} />
      
      <SubTaskList
        tasks={item.subTasks}
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
      />

      <TaskDetailsModal
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