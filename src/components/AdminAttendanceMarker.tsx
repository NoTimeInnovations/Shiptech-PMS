import { useState } from "react";
import { useAttendanceStore } from "../store/attendanceStore";
import toast from "react-hot-toast";

interface User {
  id: string;
  fullName: string;
  email: string;
  verified?: boolean;
}

interface AdminAttendanceMarkerProps {
  users: Record<string, User>;
  setShowAttendanceMarker: (show: boolean) => void;
}

export const AdminAttendanceMarker = ({
  users,
  setShowAttendanceMarker,
}: AdminAttendanceMarkerProps) => {
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [attendanceType, setAttendanceType] = useState<'full' | 'half'>('full');
  const { markAttendanceForUser } = useAttendanceStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const message = await markAttendanceForUser(selectedUser, selectedDate, attendanceType);
      toast.success(message);
      setSelectedUser("");
      setSelectedDate("");
      setAttendanceType('full');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to mark attendance"
      );
    }
  };

  return (
    <div className="fixed z-[100] inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-96 relative">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold mb-4">
            Mark Attendance for Employee
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Select Employee
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              required
              className="w-full p-2 border rounded"
            >
              <option value="">Select Employee</option>
              {Object.values(users).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
              className="w-full p-2 border rounded"
              max={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Attendance Type
            </label>
            <select
              value={attendanceType}
              onChange={(e) => setAttendanceType(e.target.value as 'full' | 'half')}
              required
              className="w-full p-2 border rounded"
            >
              <option value="full">Full Day</option>
              <option value="half">Half Day</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              className="px-4 py-2 text-gray-800 bg-transparent rounded border border-gray-500"
              onClick={() => setShowAttendanceMarker(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              Mark Attendance
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
