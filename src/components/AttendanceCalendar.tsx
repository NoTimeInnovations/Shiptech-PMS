import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MonthlyAttendance } from "@/pages/Attendance";
import { useLeaveStore } from "@/store/leaveStore";
import { useWorkFromStore } from "@/store/workfromhomestore";
import { useAuthStore } from "@/store/authStore";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useOOOStore } from "@/store/oooStore";
import { useAttendanceStore, getLocalDateString } from "../store/attendanceStore";
import { toast } from "react-hot-toast";
import { auth } from "../lib/firebase"; // Import auth from firebase
import { useHolidayStore } from "@/store/holidayStore"; // Import holiday store

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
  const { holidays, fetchHolidays } = useHolidayStore(); // Fetch holidays from the store
  const {
    leaveRequests: leaves,
    fetchUserLeaveRequests,
    cancelLeaveRequest,
    updateLeaveStatus,
    updateDate,
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
  const { oooRequests, cancelOOORequest, updateOOOStatus } = useOOOStore();
  const [showUpdateAttendanceModal, setShowUpdateAttendanceModal] =
    useState(false);
  const [selectedAttendanceDate, setSelectedAttendanceDate] =
    useState<Date | null>(null);
  const [selectedAttendanceType, setSelectedAttendanceType] = useState<
    "full" | "half"
  >("full");
  const { updateAttendance, removeAttendance } = useAttendanceStore();
  const [approveFromDate, setApproveFromDate] = useState("");
  const [approveToDate, setApproveToDate] = useState("");
  const [dontShowReject, setDontShowReject] = useState(false);
  // State for active analytics tab - removing multiple tabs, keeping only overall
  const [activeTab, setActiveTab] = useState<"overall" | "custom" | "lastYear">("overall");

  // Add state for custom date range
  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

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

    if (selectedUser) {
      fetchUserLeaveRequests(selectedUser);
      fetchUserWorkFromRequests(selectedUser);
    } else {
      fetchUserLeaveRequests();
      fetchUserWorkFromRequests();
    }

    fetchHolidays(); // Fetch holidays when the component mounts
  }, [currentDate, selectedUser, fetchHolidays]);

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

    // Normalized copy for range comparisons — never mutate the calendar day itself
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    // record.date is already a local "YYYY-MM-DD" string, so compare strings
    // directly instead of round-tripping through Date (which parses as UTC)
    const dateString = getLocalDateString(date);

    // Check attendance
    const record = monthlyAttendance
      .flatMap((month) => month.records)
      .find((record) => record.date === dateString);

    if (record) {
      statuses.push({
        type: "attendance",
        userId: userId,
        date: date.toISOString(),
        attendanceType: record.type || "full",
        session: record.session || null,
      });
    }

    // Check leave
    const leave = leaves.find((l) => {
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return compareDate >= start && compareDate <= end && l.userId === userId;
    });

    if (leave) {
      statuses.push({
        type: "leave",
        status: leave.status,
        id: leave.id,
        reason: leave.reason,
        leaveType: leave.leaveType,
        session: leave.session || null,
        startDate: leave.startDate,
        endDate: leave.endDate,
      });
    }

    // Check work from home
    const workFrom = workFromRequests.find((w) => {
      const start = new Date(w.startDate);
      const end = new Date(w.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return compareDate >= start && compareDate <= end && w.userId === userId;
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
      return compareDate >= start && compareDate <= end && o.userId === userId;
    });
    if (ooo) {
      statuses.push({
        type: "ooo",
        status: ooo.status,
        id: ooo.id,
        reason: ooo.reason,
      });
    }

    // Check holidays
    const holiday = holidays.find((h) => {
      const start = new Date(h.startDate);
      const end = new Date(h.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return compareDate >= start && compareDate <= end;
    });
    if (holiday) {
      statuses.push({
        type: "holiday",
        name: holiday.name,
        id: holiday.id,
      });
    }

    // Check for 2nd and 4th Saturdays
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 6) { // Saturday
      const dayOfMonth = date.getDate();
      const weekOfMonth = Math.ceil(dayOfMonth / 7);
      if (weekOfMonth === 2 || weekOfMonth === 4) {
        statuses.push({
          type: "holiday",
          name: weekOfMonth === 2 ? "2nd Saturday" : "4th Saturday",
          id: `sat-${weekOfMonth}-${date.toISOString()}`, // Unique ID
        });
      }
    }

    return statuses;
  };

  useEffect(() => {
    if (selectedStatus) {
      if (
        approveFromDate != selectedStatus.startDate ||
        approveToDate != selectedStatus.endDate
      ) {
        setDontShowReject(true);
      } else {
        setDontShowReject(false);
      }
    }
  }, [approveFromDate, approveToDate, selectedStatus]);

  const handleClick = async (e: React.MouseEvent, status: any) => {
    e.preventDefault();

    if (status?.type === "attendance" && isAdmin) {
      setSelectedAttendanceDate(new Date(status.date));
      setSelectedAttendanceType(status.attendanceType);
      setShowUpdateAttendanceModal(true);
    } else if (status?.status === "pending") {
      setSelectedStatus(status);
      setApproveFromDate(status.startDate);
      setApproveToDate(status.endDate);
      // Get user's full name
      const userId = selectedUser || user?.uid;
      if (userId) {
        const fullName = await getUserFullName(userId);
        setRequestUserName(fullName);
      }

      if (selectedUser && selectedUser !== user?.uid) {
        setShowAdminDialog(true);
      } else {
        setShowDialog(true);
      }
    } else if (
      status?.type === "leave" ||
      status?.type === "workfrom" ||
      status?.type === "ooo"
    ) {
      const usr = await getUserFullName((selectedUser as string) ?? user?.uid);

      setSelectedStatus(status);
      setApproveFromDate(status.startDate);
      setApproveToDate(status.endDate);
      setRequestUserName(usr as string);
      setShowDialog(true);
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
          await updateDate(selectedStatus.id, approveFromDate, approveToDate);
        } else {
          await updateLeaveStatus(selectedStatus.id, "rejected");
          await updateDate(selectedStatus.id, approveFromDate, approveToDate);
        }
      } else if (selectedStatus.type === "workfrom") {
        if (action === "approve") {
          await updateWorkFromStatus(selectedStatus.id, "approved");
        } else {
          await updateWorkFromStatus(selectedStatus.id, "rejected");
        }
      } else if (selectedStatus.type === "ooo") {
        if (action === "approve") {
          await updateOOOStatus(selectedStatus.id, "approved");
        } else {
          await updateOOOStatus(selectedStatus.id, "rejected");
        }
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
      const leaveTypeText =
        status.leaveType === "half"
          ? ` (Half${status.session ? " - " + status.session : ""})`
          : "";
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
    if (status.type === "holiday") {
      return {
        bg: "bg-blue-400",
      };
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

  // Function to calculate attendance metrics - updated to handle custom date ranges
  const calculateMetrics = () => {
    if (!userData) return;

    const createdAt = new Date(userData.createdAt);
    const today = new Date();
    const totalDays = Math.floor(
      (today.getTime() - createdAt.getTime()) / (1000 * 3600 * 24)
    );

    let totalAttendanceDays = 0;
    let totalLeaves = 0;
    let totalWFH = 0;
    let totalOOO = 0;

    // Set date range based on active tab
    let startDate, endDate;

    if (activeTab === "custom") {
      startDate = new Date(customDateRange.startDate);
      endDate = new Date(customDateRange.endDate);
    } else if (activeTab === "lastYear") {
      // Set end date to current year and current month's last day
      endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      // Set start date to previous year same month's first date
      startDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1);
    } else {
      // Default to first day of current month for overall
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    }

    // Ensure dates are set to beginning of day for comparison
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Calculate total attendance days
    monthlyAttendance.forEach((month) => {
      month.records.forEach((record) => {
        const recordDate = new Date(record.date);
        recordDate.setHours(0, 0, 0, 0);
        if (recordDate >= startDate && recordDate <= endDate) {
          if (record.type === "full" || record.type === "half") {
            totalAttendanceDays++;
          }
        }
      });
    });

    // Calculate total leaves - approved only, accounting for date ranges
    leaves.filter((leave) => leave.status === "approved").forEach((leave) => {
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      leaveStart.setHours(0, 0, 0, 0);
      leaveEnd.setHours(23, 59, 59, 999);

      // Check if leave period overlaps with selected date range
      if (leaveStart <= endDate && leaveEnd >= startDate) {
        // Calculate the overlap period
        const overlapStart = leaveStart > startDate ? leaveStart : startDate;
        const overlapEnd = leaveEnd < endDate ? leaveEnd : endDate;

        // Calculate days in the overlap period
        const dayDiff = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 3600 * 24)) + 1;
        totalLeaves += dayDiff;
      }
    });

    // Calculate total work from home days - approved only, accounting for date ranges
    workFromRequests.filter((request) => request.status === "approved").forEach((request) => {
      const requestStart = new Date(request.startDate);
      const requestEnd = new Date(request.endDate);
      requestStart.setHours(0, 0, 0, 0);
      requestEnd.setHours(23, 59, 59, 999);

      // Check if WFH period overlaps with selected date range
      if (requestStart <= endDate && requestEnd >= startDate) {
        // Calculate the overlap period
        const overlapStart = requestStart > startDate ? requestStart : startDate;
        const overlapEnd = requestEnd < endDate ? requestEnd : endDate;

        // Calculate days in the overlap period
        const dayDiff = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 3600 * 24)) + 1;
        totalWFH += dayDiff;
      }
    });

    // Calculate total out-of-office days - approved only, accounting for date ranges
    oooRequests.filter((request) => request.status === "approved").forEach((request) => {
      const requestStart = new Date(request.startDate);
      const requestEnd = new Date(request.endDate);
      requestStart.setHours(0, 0, 0, 0);
      requestEnd.setHours(23, 59, 59, 999);

      // Check if OOO period overlaps with selected date range
      if (requestStart <= endDate && requestEnd >= startDate) {
        // Calculate the overlap period
        const overlapStart = requestStart > startDate ? requestStart : startDate;
        const overlapEnd = requestEnd < endDate ? requestEnd : endDate;

        // Calculate days in the overlap period
        const dayDiff = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 3600 * 24)) + 1;
        totalOOO += dayDiff;
      }
    });


    // Calculate total working days in the selected period (excluding Sundays, 2nd & 4th Saturdays, and holidays)
    const totalWorkingDays = (() => {
      let count = 0;
      const currentDate = new Date(startDate);
      // Create a map of holidays for faster lookup
      // holidays is an array of objects { startDate: string, endDate: string }
      // We need to check if a date falls within any holiday range
      // Important: holiday dates are strings "YYYY-MM-DD"

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay(); // 0 is Sunday, 6 is Saturday

        let isWorkingDay = true;

        // 1. Exclude Sundays
        if (dayOfWeek === 0) {
          isWorkingDay = false;
        }
        // 2. Handle Saturdays (Exclude 2nd and 4th)
        else if (dayOfWeek === 6) {
          const dayOfMonth = currentDate.getDate();
          const weekOfMonth = Math.ceil(dayOfMonth / 7);

          if (weekOfMonth === 2 || weekOfMonth === 4) {
            isWorkingDay = false;
          }
        }

        // 3. Exclude Holidays
        if (isWorkingDay) {
          const isHoliday = holidays.some(h => {
            const hStart = new Date(h.startDate);
            const hEnd = new Date(h.endDate);
            // Normalize times
            hStart.setHours(0, 0, 0, 0);
            hEnd.setHours(23, 59, 59, 999);

            // Check if current date falls within holiday range
            // We need a fresh copy of currentDate for comparison to avoid mutation issues if any (though loop variable is robust here)
            const checkDate = new Date(currentDate);
            checkDate.setHours(12, 0, 0, 0); // Midday to be safe

            return checkDate >= hStart && checkDate <= hEnd;
          });

          if (isHoliday) {
            isWorkingDay = false;
          }
        }

        if (isWorkingDay) {
          count++;
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return count;
    })();

    return {
      totalDays,
      totalAttendanceDays,
      totalLeaves,
      totalWFH,
      totalOOO,
      totalWorkingDays,
      dateRange: {
        start: startDate,
        end: endDate
      }
    };
  };

  const metrics = calculateMetrics();

  const dateRangeFormat: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  const startingDate = metrics?.dateRange
    ? metrics.dateRange.start.toLocaleDateString('en-US', dateRangeFormat)
    : "";
  const EndingDate = metrics?.dateRange
    ? metrics.dateRange.end.toLocaleDateString('en-US', dateRangeFormat)
    : "";

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
            const baseClasses = `min-h-[100px] p-2 ${day.isCurrentMonth ? "text-gray-900" : "text-gray-400"
              } ${isCurrentDay ? "bg-blue-100" : "bg-white"} cursor-pointer`;

            return (
              <div key={index} className={baseClasses}>
                <div
                  className={`font-medium text-sm mb-1 ${isCurrentDay ? "text-blue-600" : ""
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
                        {status.type === "holiday"
                          ? `holiday : ${status.name}`
                          : style.text}
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
                    <p className="text-sm text-gray-600 mb-2 capitalize">
                      <span className="font-medium">Leave Type:</span>{" "}
                      {selectedStatus.leaveType === "half"
                        ? `Half Day ${selectedStatus.session}`
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

              {/* Date Range Inputs for Admin */}
              {userData?.role == "admin" &&
                selectedStatus?.type === "leave" && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Approve Leave From:
                    </label>
                    <input
                      type="date"
                      value={approveFromDate}
                      onChange={(e) => setApproveFromDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <label className="block text-sm font-medium text-gray-700 mt-2 mb-1">
                      To:
                    </label>
                    <input
                      type="date"
                      value={approveToDate}
                      onChange={(e) => setApproveToDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

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
                {!dontShowReject && (
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Ok
                  </button>
                )}
                {userData?.role === "admin" &&
                  selectedStatus.status === "pending" && (
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
                        ? `Half Day ${selectedStatus.session}`
                        : "Full Day"}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Reason for Leave:</span>{" "}
                      {selectedStatus.reason}
                    </p>
                  </>
                )}

                {userData?.role === "admin" &&
                  selectedStatus?.type === "leave" && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Approve Leave From:
                      </label>
                      <input
                        type="date"
                        value={approveFromDate}
                        onChange={(e) => setApproveFromDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <label className="block text-sm font-medium text-gray-700 mt-2 mb-1">
                        To:
                      </label>
                      <input
                        type="date"
                        value={approveToDate}
                        onChange={(e) => setApproveToDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
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
                {!dontShowReject && (
                  <button
                    onClick={() => handleAdminAction("reject")}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    disabled={isApproving}
                  >
                    Reject
                  </button>
                )}
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
          <h3 className="text-lg font-semibold text-gray-900">
            Attendance Analytics
          </h3>
          <div className="flex space-x-4 mt-4">
            <button
              onClick={() => setActiveTab("overall")}
              className={`px-4 py-2 rounded ${activeTab === "overall"
                ? "bg-blue-500 text-white"
                : "bg-gray-200"
                }`}
            >
              Overall
            </button>
            <button
              onClick={() => setActiveTab("custom")}
              className={`px-4 py-2 rounded ${activeTab === "custom"
                ? "bg-blue-500 text-white"
                : "bg-gray-200"
                }`}
            >
              Custom Range
            </button>
            <button
              onClick={() => setActiveTab("lastYear")}
              className={`px-4 py-2 rounded ${activeTab === "lastYear"
                ? "bg-blue-500 text-white"
                : "bg-gray-200"
                }`}
            >
              Last Year
            </button>
          </div>

          {
            startingDate && EndingDate && (
              <div className="bg-gray-50 p-4 rounded-lg my-4 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600 font-medium">From:</span>
                    <span className="text-blue-600 font-semibold">{startingDate}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600 font-medium">To:</span>
                    <span className="text-blue-600 font-semibold">{EndingDate}</span>
                  </div>
                </div>
              </div>
            )
          }

          {activeTab === "custom" && (
            <div className="bg-gray-50 p-4 rounded-lg my-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customDateRange.startDate}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customDateRange.endDate}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {metrics && (
            <div className="grid grid-cols-2 gap-4 mt-4">
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
              <div className="bg-blue-100 p-4 rounded-lg">
                <h4 className="font-medium">Total Working Days</h4>
                <p className="text-2xl">{metrics.totalWorkingDays}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
