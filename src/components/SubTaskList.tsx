import React from 'react';
import { Plus, Pencil, Trash2, User, Calendar } from 'lucide-react';

interface SubTask {
  id: string;
  name: string;
  description?: string;
  assignedTo?: {
    fullName: string;
  };
  deadline?: string;
}

interface SubTaskListProps {
  tasks: SubTask[];
  onAddClick: () => void;
  onEditClick: (task: SubTask) => void;
  onDeleteClick: (taskId: string) => void;
  onTaskClick: (task: SubTask) => void;
}

export default function SubTaskList({
  tasks,
  onAddClick,
  onEditClick,
  onDeleteClick,
  onTaskClick
}: SubTaskListProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Subtasks</h2>
          <button
            onClick={onAddClick}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </button>
        </div>

        <div className="space-y-4">
          {tasks.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              No subtasks yet. Add your first task!
            </p>
          ) : (
            tasks.map(task => (
              <SubTaskItem
                key={task.id}
                task={task}
                onEditClick={() => onEditClick(task)}
                onDeleteClick={() => onDeleteClick(task.id)}
                onClick={() => onTaskClick(task)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}