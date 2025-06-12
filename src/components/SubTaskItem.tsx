import { Pencil, Trash2, User, Calendar } from 'lucide-react';
import { Task } from '@/store/projectStore';

interface SubTaskItemProps {
  task: Task;
  onEditClick: (task: Task) => void;
  onDeleteClick: (taskId: string) => void;
  onClick: () => void;
}

export default function SubTaskItem({
  task,
  onEditClick,
  onDeleteClick,
  onClick
}: SubTaskItemProps) {
  return (
    <div 
      className="border rounded-lg p-4 hover:border-blue-500 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">{task.name}</h3>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-sm">
              {task.percentage}%
            </span>
          </div>
          {task.description && (
            <p className="mt-1 text-gray-600">{task.description}</p>
          )}
          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
            {task.assignedTo && (
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                <span>{task.assignedTo[0].fullName}</span> 
              </div>
            )}
            {task.deadline && (
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{new Date(task.deadline).toLocaleDateString('en-GB')}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex space-x-2" onClick={e => e.stopPropagation()}>
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
      </div>
    </div>
  );
}