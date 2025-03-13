import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MonthlyAttendance } from "@/pages/Attendance";
import { useLeaveStore } from "@/store/leaveStore";
import { useWorkFromStore } from "@/store/workfromhomestore";
import { useAuthStore } from "@/store/authStore";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useOOOStore } from "@/store/oooStore";
import { useAttendanceStore } from "../store/attendanceStore";
import { toast } from "react-hot-toast";
import { auth } from "../lib/firebase"; // Import auth from firebase

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
}

export default function AttendanceCalendar({
  monthlyAttendance,
  selectedUser,
  isAdmin,
}: {
  monthlyAttendance: MonthlyAttendance[];
  selectedUser?: string | null;
  isAdmin: boolean;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const {
    leaveRequests: leaves,
    fetchUserLeaveRequests,
    cancelLeaveRequest,
    updateLeaveStatus,
  } = useLeaveStore();
  const {
    workFromRequests,
    fetchUserWorkFromRequests,
    cancelWorkFromHome,
    updateWorkFromStatus,
  } = useWorkFromStore();
  const { user, userData } = useAuthStore();
  const [showDialog, setShowDialog] = useState(false);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<any>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [requestUserName, setRequestUserName] = useState<string>("");
  const {
    oooRequests,
    fetchUserOOORequests,
    cancelOOORequest,
    updateOOOStatus,
  } = useOOOStore();
  const [showUpdateAttendanceModal, setShowUpdateAttendanceModal] =
    useState(false);
  const [selectedAttendanceDate, setSelectedAttendanceDate] =
    useState<Date | null>(null);
  const [selectedAttendanceType, setSelectedAttendanceType] = useState<
    "full" | "half"
  >("full");
  const { updateAttendance, removeAttendance } = useAttendanceStore();

  // State for active analytics tab
  const [activeTab, setActiveTab] = useState<'thisMonth' | 'threeMonths' | 'sixMonths' | 'yearly' | 'overall'>('thisMonth');

  // Generate calendar days for the current month
  useEffect(() => {
    const generateCalendar = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      // Get the first day of the month
      const firstDayOfMonth = new Date(year, month, 1);
      const startingDayOfWeek = firstDayOfMonth.getDay();

      // Get the last day of the month
      const lastDayOfMonth = new Date(year, month + 1, 0);
      const totalDaysInMonth = lastDayOfMonth.getDate();

      // Get the last day of the previous month
      const lastDayOfPrevMonth = new Date(year, month, 0).getDate();

      const calendarDays: CalendarDay[] = [];

      // Add days from previous month
      for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const date = new Date(year, month - 1, lastDayOfPrevMonth - i);
        calendarDays.push({
          date,
          isCurrentMonth: false,
        });
      }

      // Add days from current month
      for (let i = 1; i <= totalDaysInMonth; i++) {
        const date = new Date(year, month, i);
        date.setHours(0, 0, 0, 0);

        calendarDays.push({
          date,
          isCurrentMonth: true,
        });
      }

      // Add days from next month to complete the grid
      const remainingDays = 42 - calendarDays.length; // 6 rows × 7 days
      for (let i = 1; i <= remainingDays; i++) {
        const date = new Date(year, month + 1, i);
        calendarDays.push({
          date,
          isCurrentMonth: false,
        });
      }

      setCalendar(calendarDays);
    };

    generateCalendar();
    // console.log(selectedUser);

    if (selectedUser) {
      fetchUserLeaveRequests(selectedUser);
      fetchUserWorkFromRequests(selectedUser);
    } else {
      fetchUserLeaveRequests();
      fetchUserWorkFromRequests();
    }
  }, [currentDate, selectedUser]);

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getDateStatuses = (date: Date) => {
    const userId = selectedUser || auth.currentUser?.uid;
    const statuses = [];

    // Check attendance
    const attendance = monthlyAttendance.some((month) =>
      month.records.some((record) => {
        const recordDate = new Date(record.date).toLocaleDateString();
        const compareDate = date.toLocaleDateString();
        return recordDate === compareDate;
      })
    );

    if (attendance) {
      const record = monthlyAttendance
        .flatMap((month) => month.records)
        .find(
          (record) =>
            new Date(record.date).toLocaleDateString() ===
            date.toLocaleDateString()
        );

      statuses.push({
        type: "attendance",
        userId: userId,
        date: date.toISOString(),
        attendanceType: record?.type || "full",
      });
    }

    // Check leave
    const leave = leaves.find((l) => {
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      const compareDate = new Date(date);
      compareDate.setHours(0, 0, 0, 0);
      return compareDate >= start && compareDate <= end && l.userId === userId;
    });
    if (leave) {
      statuses.push({
        type: "leave",
        status: leave.status,
        id: leave.id,
        reason: leave.reason,
        leaveType: leave.leaveType,
      });
    }

    // Check work from home
    const workFrom = workFromRequests.find((w) => {
      const start = new Date(w.startDate);
      const end = new Date(w.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      return date >= start && date <= end && w.userId === userId;
    });
    if (workFrom) {
      statuses.push({
        type: "workfrom",
        status: workFrom.status,
        id: workFrom.id,
        reason: workFrom.reason,
      });
    }

    // Check OOO
    const ooo = oooRequests.find((o) => {
      const start = new Date(o.startDate);
      const end = new Date(o.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      return date >= start && date <= end && o.userId === userId;
    });
    if (ooo) {
      statuses.push({
        type: "ooo",
        status: ooo.status,
        id: ooo.id,
        reason: ooo.reason,
      });
    }

    return statuses;
  };

  const handleClick = async (e: React.MouseEvent, status: any) => {
    e.preventDefault();
    if (status?.type === "attendance" && isAdmin) {
      setSelectedAttendanceDate(new Date(status.date));
      setSelectedAttendanceType(status.attendanceType);
      setShowUpdateAttendanceModal(true);
    } else if (status?.status === "pending") {
      setSelectedStatus(status);

      // Get user's full name
      const userId = selectedUser || user?.uid;
      if (userId) {
        const fullName = await getUserFullName(userId);
        setRequestUserName(fullName);
      }

      if (selectedUser && selectedUser !== user?.uid) {
        setShowAdminDialog(true);
      } else if (!selectedUser) {
        setShowDialog(true);
      }
    }
  };

  const handleCancel = () => {
    if (selectedStatus.type === "workfrom") {
      cancelWorkFromHome(selectedStatus.id);
    } else if (selectedStatus.type === "leave") {
      cancelLeaveRequest(selectedStatus.id);
    } else if (selectedStatus.type === "ooo") {
      cancelOOORequest(selectedStatus.id);
    }
    setShowDialog(false);
    setSelectedStatus(null);
  };

  const handleAdminAction = async (action: "approve" | "reject") => {
    if (action === "approve") {
      setIsApproving(true);
    }

    try {
      if (selectedStatus.type === "leave") {
        if (action === "approve") {
          await updateLeaveStatus(selectedStatus.id, "approved");
        } else {
          await updateLeaveStatus(selectedStatus.id, "rejected");
        }
        await fetchUserLeaveRequests(selectedUser as string);
      } else if (selectedStatus.type === "workfrom") {
        if (action === "approve") {
          await updateWorkFromStatus(selectedStatus.id, "approved");
        } else {
          await updateWorkFromStatus(selectedStatus.id, "rejected");
        }
        await fetchUserWorkFromRequests(selectedUser as string);
      } else if (selectedStatus.type === "ooo") {
        if (action === "approve") {
          await updateOOOStatus(selectedStatus.id, "approved");
        } else {
          await updateOOOStatus(selectedStatus.id, "rejected");
        }
        await fetchUserOOORequests(selectedUser as string);
      }
    } finally {
      setIsApproving(false);
      setShowDialog(false);
      setShowAdminDialog(false);
      setSelectedStatus(null);
    }
  };

  const getStatusStyle = (status: any) => {
    if (status.type === "attendance") {
      return {
        bg: status.attendanceType === "half" ? "bg-green-100" : "bg-green-200",
        text: status.attendanceType === "half" ? "Present (Half)" : "Present",
      };
    }
    if (status.type === "leave") {
      const leaveTypeText = status.leaveType === "half" ? " (Half)" : "";
      if (status.status === "pending") {
        return {
          bg: "bg-red-200 animate-pulse",
          text: `Leave${leaveTypeText} Pending`,
        };
      } else if (status.status === "approved") {
        return {
          bg: "bg-red-200",
          text: `Leave${leaveTypeText} Approved`,
        };
      } else {
        return {
          bg: "bg-red-100",
          text: `Leave${leaveTypeText} Rejected`,
        };
      }
    }
    if (status.type === "workfrom") {
      if (status.status === "pending") {
        return {
          bg: "bg-violet-200 animate-pulse",
          text: "WFH Pending",
        };
      } else if (status.status === "approved") {
        return {
          bg: "bg-violet-200",
          text: "WFH Approved",
        };
      } else {
        return {
          bg: "bg-violet-100",
          text: "WFH Rejected",
        };
      }
    }
    if (status.type === "ooo") {
      if (status.status === "pending") {
        return {
          bg: "bg-purple-200 animate-pulse",
          text: "OOO Pending",
        };
      } else if (status.status === "approved") {
        return {
          bg: "bg-purple-200",
          text: "OOO Approved",
        };
      } else {
        return {
          bg: "bg-purple-100",
          text: "OOO Rejected",
        };
      }
    }
    return {
      bg: "bg-white",
      text: "",
    };
  };

  // Add this function to get user's full name
  const getUserFullName = async (userId: string) => {
    const userDoc = await getDoc(doc(db, "users", userId));
    const userData = userDoc.data();
    return userData?.fullName || "Unknown User";
  };

  const handleUpdateAttendance = async (action: "update" | "remove") => {
    try {
      const userId = selectedUser || user?.uid;
      if (!userId || !selectedAttendanceDate) return;

      // console.log(
      //   "before update :",
      //   userId,
      //   selectedAttendanceDate,
      //   selectedAttendanceType
      // );

      if (action === "update") {
        await updateAttendance(
          userId,
          selectedAttendanceDate,
          selectedAttendanceType
        );
        toast.success("Attendance updated successfully");
      } else {
        await removeAttendance(userId, selectedAttendanceDate);
        toast.success("Attendance removed successfully");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update attendance"
      );
    } finally {
      setShowUpdateAttendanceModal(false);
    }
  };

  // Function to calculate attendance metrics based on the selected time frame
  const calculateMetrics = (timeFrame: 'thisMonth' | 'threeMonths' | 'sixMonths' | 'yearly' | 'overall') => {
    if (!userData) return;

    const createdAt = new Date(userData.createdAt);
    const today = new Date();
    const totalDays = Math.floor((today.getTime() - createdAt.getTime()) / (1000 * 3600 * 24));

    let totalAttendanceDays = 0;
    let totalLeaves = 0;
    let totalWFH = 0;
    let totalOOO = 0;

    const startDate = new Date();
    if (timeFrame === 'thisMonth') {
      startDate.setFullYear(currentDate.getFullYear(), currentDate.getMonth(), 1); // Set to the first day of the current month
    } else if (timeFrame === 'threeMonths') {
      startDate.setMonth(today.getMonth() - 3);
    } else if (timeFrame === 'sixMonths') {
      startDate.setMonth(today.getMonth() - 6);
    } else if (timeFrame === 'yearly') {
      startDate.setFullYear(today.getFullYear() - 1);
    } else if (timeFrame === 'overall') {
      startDate.setTime(0); // Start from epoch time
    }

    monthlyAttendance.forEach(month => {
      month.records.forEach(record => {
        const recordDate = new Date(record.date);
        if (recordDate >= createdAt && recordDate >= startDate && recordDate.getMonth() === currentDate.getMonth() && recordDate.getFullYear() === currentDate.getFullYear()) {
          if (record.type === 'full' || record.type === 'half') {
            totalAttendanceDays++;
          }
        }
      });
    });

    // Calculate total leaves
    leaves.forEach(leave => {
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      if (leaveStart >= createdAt && leaveStart >= startDate && leaveStart.getMonth() === currentDate.getMonth() && leaveStart.getFullYear() === currentDate.getFullYear()) {
        totalLeaves++;
      }
    });

    // Calculate total work from home days
    workFromRequests.forEach(request => {
      const requestStart = new Date(request.startDate);
      const requestEnd = new Date(request.endDate);
      if (requestStart >= createdAt && requestStart >= startDate && requestStart.getMonth() === currentDate.getMonth() && requestStart.getFullYear() === currentDate.getFullYear()) {
        totalWFH++;
      }
    });

    // Calculate total out-of-office days
    oooRequests.forEach(request => {
      const requestStart = new Date(request.startDate);
      const requestEnd = new Date(request.endDate);
      if (requestStart >= createdAt && requestStart >= startDate && requestStart.getMonth() === currentDate.getMonth() && requestStart.getFullYear() === currentDate.getFullYear()) {
        totalOOO++;
      }
    });

    return {
      totalDays,
      totalAttendanceDays,
      totalLeaves,
      totalWFH,
      totalOOO,
    };
  };

  const metrics = calculateMetrics(activeTab); // Calculate metrics based on the active tab

  return (
    <div className="">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Attendance Calendar
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm bg-black/90 text-white rounded-md hover:bg-black/80"
              >
                Today
              </button>
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
          <p className="mt-1 text-lg text-gray-900">
            {currentDate.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="bg-gray-50 py-2 text-center text-sm font-medium text-gray-500"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {calendar.map((day, index) => {
            const statuses = getDateStatuses(day.date);
            const isCurrentDay = isToday(day.date);
            const baseClasses = `min-h-[100px] p-2 ${
              day.isCurrentMonth ? "text-gray-900" : "text-gray-400"
            } ${isCurrentDay ? "bg-blue-100" : "bg-white"} cursor-pointer`;

            return (
              <div key={index} className={baseClasses}>
                <div
                  className={`font-medium text-sm mb-1 ${
                    isCurrentDay ? "text-blue-600" : ""
                  }`}
                >
                  {day.date.getDate()}
                </div>
                <div className="flex flex-col gap-1">
                  {statuses.map((status, idx) => {
                    const style = getStatusStyle(status);
                    return (
                      <div
                        key={idx}
                        onClick={(e) => handleClick(e, status)}
                        className={`${style.bg} text-xs p-1 rounded`}
                      >
                        {style.text}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {showDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
              <h3 className="text-lg font-medium mb-4">Cancel Request</h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Employee:</span>{" "}
                  {requestUserName}
                </p>
                {selectedStatus?.type === "leave" && (
                  <>
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Leave Type:</span>{" "}
                      {selectedStatus.leaveType === "half"
                        ? "Half Day"
                        : "Full Day"}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Reason for Leave:</span>{" "}
                      {selectedStatus.reason}
                    </p>
                  </>
                )}
                {selectedStatus?.type === "workfrom" && (
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Reason for WFH:</span>{" "}
                    {selectedStatus.reason}
                  </p>
                )}
                {selectedStatus?.type === "ooo" && (
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Reason for OOO:</span>{" "}
                    {selectedStatus.reason}
                  </p>
                )}
              </div>
              <p className="mb-6">
                Are you sure you want to cancel this request?
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowDialog(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  OK
                </button>
                {userData?.role === "admin" && (
                  <button
                    onClick={() => handleAdminAction("approve")}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    disabled={isApproving}
                  >
                    {isApproving ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                    ) : (
                      "Approve as Admin"
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {showAdminDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
              <h3 className="text-lg font-medium mb-4">Review Request</h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Employee:</span>{" "}
                  {requestUserName}
                </p>
                {selectedStatus?.type === "leave" && (
                  <>
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Leave Type:</span>{" "}
                      {selectedStatus.leaveType === "half"
                        ? "Half Day"
                        : "Full Day"}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Reason for Leave:</span>{" "}
                      {selectedStatus.reason}
                    </p>
                  </>
                )}
                {selectedStatus?.type === "workfrom" && (
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Reason for WFH:</span>{" "}
                    {selectedStatus.reason}
                  </p>
                )}
                {selectedStatus?.type === "ooo" && (
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Reason for OOO:</span>{" "}
                    {selectedStatus.reason}
                  </p>
                )}
              </div>
              <p className="mb-6">
                What would you like to do with this request?
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowAdminDialog(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAdminAction("reject")}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  disabled={isApproving}
                >
                  Reject
                </button>
                <button
                  onClick={() => handleAdminAction("approve")}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  disabled={isApproving}
                >
                  {isApproving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                  ) : (
                    "Approve"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Update Attendance Modal */}
        {showUpdateAttendanceModal && (
          <div className="fixed z-[100] inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg w-96">
              <h2 className="text-xl font-bold mb-4">Update Attendance</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Attendance Type
                </label>
                <select
                  value={selectedAttendanceType}
                  onChange={(e) =>
                    setSelectedAttendanceType(e.target.value as "full" | "half")
                  }
                  className="w-full p-2 border rounded"
                >
                  <option value="full">Full Day</option>
                  <option value="half">Half Day</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowUpdateAttendanceModal(false)}
                  className="px-4 py-2 text-gray-800 bg-transparent rounded border border-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateAttendance("remove")}
                  className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700"
                >
                  Remove Attendance
                </button>
                <button
                  onClick={() => handleUpdateAttendance("update")}
                  className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Dashboard */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Attendance Analytics</h3>
          <div className="flex space-x-4 mt-4">
            <button
              onClick={() => setActiveTab('thisMonth')}
              className={`px-4 py-2 rounded ${activeTab === 'thisMonth' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              This Month
            </button>
            <button
              onClick={() => setActiveTab('threeMonths')}
              className={`px-4 py-2 rounded ${activeTab === 'threeMonths' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Last 3 Months
            </button>
            <button
              onClick={() => setActiveTab('sixMonths')}
              className={`px-4 py-2 rounded ${activeTab === 'sixMonths' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Last 6 Months
            </button>
            <button
              onClick={() => setActiveTab('yearly')}
              className={`px-4 py-2 rounded ${activeTab === 'yearly' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Last Year
            </button>
            <button
              onClick={() => setActiveTab('overall')}
              className={`px-4 py-2 rounded ${activeTab === 'overall' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Overall
            </button>
          </div>
          {metrics && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-blue-100 p-4 rounded-lg">
                <h4 className="font-medium">Total Days Since Joining</h4>
                <p className="text-2xl">{metrics.totalDays}</p>
              </div>
              <div className="bg-green-100 p-4 rounded-lg">
                <h4 className="font-medium">Total Attendance Days</h4>
                <p className="text-2xl">{metrics.totalAttendanceDays}</p>
              </div>
              <div className="bg-yellow-100 p-4 rounded-lg">
                <h4 className="font-medium">Total Leaves Taken</h4>
                <p className="text-2xl">{metrics.totalLeaves}</p>
              </div>
              <div className="bg-purple-100 p-4 rounded-lg">
                <h4 className="font-medium">Total WFH Days</h4>
                <p className="text-2xl">{metrics.totalWFH}</p>
              </div>
              <div className="bg-red-100 p-4 rounded-lg">
                <h4 className="font-medium">Total OOO Days</h4>
                <p className="text-2xl">{metrics.totalOOO}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
