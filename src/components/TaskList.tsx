import React from 'react';
import { Plus, Pencil, Trash2, User, Calendar } from 'lucide-react';
import { Task } from '../store/projectStore';

interface TaskListProps {
  tasks: Task[];
  onAddClick: () => void;
  onEditClick: (task: Task) => void;
  onDeleteClick: (taskId: string) => void;
  onTaskClick: (task: Task) => void;
  isAdmin: boolean;
}

export default function TaskList({
  tasks = [], // Provide default empty array
  onAddClick,
  onEditClick,
  onDeleteClick,
  onTaskClick,
  isAdmin
}: TaskListProps) {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
          {isAdmin && (
            <button
              onClick={onAddClick}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </button>
          )}
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              No tasks yet. Add your first task!
            </p>
          ) : (
            tasks.map(task => (
              <div 
                key={task.id}
                className="border rounded-lg hover:border-blue-500 transition-colors duration-200"
              >
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => onTaskClick(task)}
                    >
                      <h4 className="text-lg font-medium">{task.name}</h4>
                      {task.description && (
                        <p className="mt-1 text-gray-600">{task.description}</p>
                      )}
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                        {task.hours && (
                          <span>Hours: {task.hours}</span>
                        )}
                        {task.costPerHour && (
                          <span>Rate: ₹{task.costPerHour}/hr</span>
                        )}
                        {task.assignedTo && (
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            <span>{task.assignedTo.fullName}</span>
                          </div>
                        )}
                        {task.deadline && (
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>{new Date(task.deadline).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => onEditClick(task)}
                          className="p-1 text-gray-400 hover:text-blue-500"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => onDeleteClick(task.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}