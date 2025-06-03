import {
  User,
  Calendar,
  Clock,
  DollarSign,
  Check,
  AlertCircle,
} from "lucide-react";
import ItemStatusBadge from "./ItemStatusBadge";
import { Task, useTaskStore } from "@/store/taskStore";
import { useAuthStore } from "@/store/authStore";
import { useProjectStore, Project } from "@/store/projectStore";

interface ItemDetailsProps {
  item: Task;
  tasks?: Task[];
  onEditClick?: () => void;
  onToggleComplete?: () => void;
  isAdmin?: boolean;
  canComplete?: boolean;
  exceptionCase?: boolean;
  parentTaskCompleted?: boolean; // Add this
}

export default function ItemDetails({
  item,
  tasks = [],
  onEditClick,
  onToggleComplete,
  isAdmin,
  canComplete = true,
  exceptionCase = false,
  parentTaskCompleted = false, // Add this
}: ItemDetailsProps) {
  const { userData } = useAuthStore();
  const { project } = useProjectStore();
  const allChildrenComplete = tasks?.length
    ? tasks.every((child) => child.completed)
    : true;

  const calculateProgress = () => {
    
    if (!tasks.length) return 0;

    const completedProgress = tasks.reduce((acc, task) => {
      if (task.completed) {
        return acc + (task.percentage || 0);
      }
      return acc;
    }, 0);

    return Math.round(completedProgress);
  };

  const progress = calculateProgress();

  return (
    <div className="bg-white rounded-xl border-[1px] mb-6">
      <div className="p-6">
        {tasks.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Progress</h3>
              <span className="text-sm font-medium text-gray-700">
                {progress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {tasks.filter((task) => task.completed).length} of {tasks.length}{" "}
              subtasks completed
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Description
              </h3>
              <p className="text-gray-700">
                {item.description || "No description provided"}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* {!parentTaskCompleted && (isAdmin || exceptionCase) && onEditClick && project && project.status !== 'completed' &&( */}
              {!parentTaskCompleted && (isAdmin || exceptionCase) && onEditClick && project && project.status !== 'completed' &&(
                <button
                  onClick={()=>{
                    onEditClick()
                  }}
                  className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Edit Details
                </button>
              )}
              {/* {!parentTaskCompleted && onToggleComplete && project && project.status !== 'completed' && ( */}
              {!parentTaskCompleted && onToggleComplete && project && project.status !== 'completed' && (
                <button
                  onClick={onToggleComplete}
                  disabled={
                    !canComplete ||
                    ((tasks?.length && !allChildrenComplete) as boolean)
                  }
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    item.completed
                      ? "text-yellow-600 hover:text-yellow-700"
                      : "text-green-600 hover:text-green-700"
                  } ${
                    !canComplete || (tasks?.length && !allChildrenComplete)
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {item.completed ? "Mark Incomplete" : "Mark Complete"}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {item.assignedTo && item.assignedTo.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Assigned To
                </h3>
                <div className="flex flex-col gap-2">
                  {item.assignedTo.map((user, index) => (
                    <div key={index} className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <p>{user.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {item.deadline && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Deadline
                </h3>
                <div className="flex items-center">
                  
                  <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                  <p>{new Date(item.deadline).toLocaleString('en-GB')}</p>
                </div>  
              </div>
            )}

            {(item.hours !== undefined || item.costPerHour !== undefined) && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {item.hours !== undefined && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Estimated Hours
                    </h3>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-2" />
                      <p>{item.hours} hours</p>
                    </div>
                  </div>
                )}

                {item.costPerHour !== undefined &&
                  userData?.role === "admin" && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">
                        Cost per Hour
                      </h3>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                        <p>₹{item.costPerHour}</p>
                      </div>
                    </div>
                  )}
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
              <div className="flex items-center space-x-2">
                <ItemStatusBadge completed={item.completed} />
                {tasks?.length && tasks.length > 0 && !allChildrenComplete ? (
                  <span className="text-sm text-red-600">
                    (Cannot complete - subtasks pending)
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
