import { useEffect } from 'react';
import { useTaskStore } from '../store/taskStore';
import { Button } from '@/components/ui/button';

const TaskManagement = ({ projectId }) => {
  const { tasks, fetchTasks, addTask, updateTask, deleteTask } = useTaskStore();

  useEffect(() => {
    fetchTasks(projectId);
  }, [projectId, fetchTasks]);

  const handleAddTask = async () => {
    const newTask = {
      name: 'New Task',
      description: 'Task description',
      hours: 5,
      costPerHour: 100,
      total: 500,
      completed: false,
      projectId,
    };
    await addTask(newTask);
  };

  const handleUpdateTask = async (id) => {
    await updateTask(id, { completed: true });
  };

  const handleDeleteTask = async (id) => {
    await deleteTask(id);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-heading font-semibold">Task Management</h1>
      <Button onClick={handleAddTask}>Add Task</Button>
      <ul className="space-y-2">
        {tasks.map(task => (
          <li key={task.id} className="flex items-center gap-2">
            <span>{task.name}</span>
            <Button variant="outline" size="sm" onClick={() => handleUpdateTask(task.id)}>Complete</Button>
            <Button variant="destructive" size="sm" onClick={() => handleDeleteTask(task.id)}>Delete</Button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TaskManagement; 