import {
  User,
  Calendar,
  Clock,
  DollarSign,
  Check,
  AlertCircle,
  Bell,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useTodoStore } from "@/store/todoStore";
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

  const [showToDoModal, setShowToDoModal] = useState(false);
  const [toDoData, setToDoData] = useState({
    title: "",
    description: "",
    leadTime: 0,
    leadTimeUnit: "days" as "days" | "weeks" | "months",
    endDate: "",
  });

  const { addTodo } = useTodoStore();

  const handleOpenToDoModal = () => {
    setToDoData({
      title: item.name || "",
      description: item.description || "",
      leadTime: 0,
      leadTimeUnit: "days",
      endDate: "",
    });
    setShowToDoModal(true);
  };

  const handleLeadTimeChange = (
    value: number,
    unit: "days" | "weeks" | "months"
  ) => {
    const now = new Date();
    let newDate = new Date(now);

    if (unit === "days") {
      newDate.setDate(now.getDate() + value);
    } else if (unit === "weeks") {
      newDate.setDate(now.getDate() + value * 7);
    } else if (unit === "months") {
      // Handle month overflow (e.g., Jan 31 + 1 month -> Feb 28/29)
      const currentDay = now.getDate();
      newDate.setMonth(now.getMonth() + value);

      // If the day changed (e.g. was 31st, now 3rd of March), rollback to last day of intended month
      if (newDate.getDate() !== currentDay) {
        newDate.setDate(0);
      }
    }

    // Format for datetime-local input: YYYY-MM-DDTHH:mm
    // Adjust for timezone offset to keep local time correct
    const offset = newDate.getTimezoneOffset() * 60000;
    const localISOTime = new Date(newDate.getTime() - offset).toISOString().slice(0, 16);

    setToDoData((prev) => ({
      ...prev,
      leadTime: value,
      leadTimeUnit: unit,
      endDate: localISOTime,
    }));
  };

  const handleEndDateChange = (dateStr: string) => {
    if (!dateStr) {
      setToDoData((prev) => ({
        ...prev,
        endDate: dateStr,
        leadTime: 0,
        // leadTimeUnit: "days", // Keep previous unit
      }));
      return;
    }

    const date = new Date(dateStr);
    const now = new Date();

    // Calculate difference in milliseconds
    const diffTime = date.getTime() - now.getTime();

    // Calculate days first
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Use current unit preference
    const currentUnit = toDoData.leadTimeUnit;
    let newLeadTime = 0;

    if (currentUnit === "days") {
      newLeadTime = diffDays > 0 ? diffDays : 0;
    } else if (currentUnit === "weeks") {
      // Convert to weeks, keeping 1 decimal place if needed
      const weeks = diffDays / 7;
      // If it's effectively an integer (e.g. 2.0), show integer. Else fixed to 1 decimal
      newLeadTime = weeks > 0 ? parseFloat(weeks.toFixed(1)) : 0;
    } else if (currentUnit === "months") {
      // Rough month calculation
      let months = (date.getFullYear() - now.getFullYear()) * 12 + (date.getMonth() - now.getMonth());
      // Adjust for day of month
      if (date.getDate() < now.getDate()) {
        months--;
      }
      // Add fractional month? For simplicity, we might just use full months or simple ratio
      // Given the previous forward logic was simpler, let's stick to simple integer months if possible,
      // or maybe just approximation: diffDays / 30

      // Better approach for months: 
      // If user selected months, they probably want to see approx months.
      const approxMonths = diffDays / 30.44; // Average days in month
      newLeadTime = approxMonths > 0 ? parseFloat(approxMonths.toFixed(1)) : 0;
    }

    setToDoData((prev) => ({
      ...prev,
      endDate: dateStr,
      leadTime: newLeadTime,
      // unit stays same
    }));
  };

  const handleAddToDo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toDoData.endDate) {
      toast.error("Please select an end date or lead time");
      return;
    }
    await addTodo(
      toDoData.title,
      toDoData.description,
      toDoData.endDate,
      toDoData.leadTime,
      toDoData.leadTimeUnit,
      item.projectId || null,
      item.id || null,
      project?.__id || null,
      project?.name || null,
      item.name || null
    );
    toast.success("To-Do created successfully");
    setShowToDoModal(false);
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
              {!parentTaskCompleted && (isAdmin || exceptionCase) && onEditClick && project && project.status !== 'completed' && (
                <button
                  onClick={() => {
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
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${item.completed
                    ? "text-yellow-600 hover:text-yellow-700"
                    : "text-green-600 hover:text-green-700"
                    } ${!canComplete || (tasks?.length && !allChildrenComplete)
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
              <button
                onClick={handleOpenToDoModal}
                className="mt-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                <div className="flex items-center">
                  <Bell className="h-4 w-4 mr-2" />
                  Create To-Do
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showToDoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg p-6 w-[32rem]">
            <h2 className="text-xl font-bold mb-4">Create To-Do</h2>
            <form onSubmit={handleAddToDo}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={toDoData.title}
                  onChange={(e) =>
                    setToDoData({ ...toDoData, title: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  value={toDoData.description}
                  onChange={(e) =>
                    setToDoData({
                      ...toDoData,
                      description: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Lead Time
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      value={toDoData.leadTime}
                      onChange={(e) =>
                        handleLeadTimeChange(
                          parseInt(e.target.value) || 0,
                          toDoData.leadTimeUnit
                        )
                      }
                      className="w-full p-2 border rounded"
                    />
                    <select
                      value={toDoData.leadTimeUnit}
                      onChange={(e) =>
                        handleLeadTimeChange(
                          0,
                          e.target.value as "days" | "weeks" | "months"
                        )
                      }
                      className="p-2 border rounded bg-white"
                    >
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    End Date
                  </label>
                  <input
                    type="datetime-local"
                    value={toDoData.endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowToDoModal(false)}
                  className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save To-Do
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
