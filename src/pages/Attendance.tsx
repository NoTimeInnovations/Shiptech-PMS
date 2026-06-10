import React, { useEffect, useState } from "react";
import { useAttendanceStore, getLocalDateString } from "../store/attendanceStore";
import { useAuthStore } from "../store/authStore";
import { useLeaveStore } from "../store/leaveStore";
import { useWorkFromStore } from "../store/workfromhomestore";
import { useOOOStore } from "../store/oooStore";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import AttendanceCalendar from "@/components/AttendanceCalendar";
import { AdminAttendanceMarker } from "@/components/AdminAttendanceMarker";
import { useNotificationStore } from "../store/notificationStore";
import { Holiday, useHolidayStore } from "../store/holidayStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  fullName: string;
  email: string;
  verified?: boolean;
}

export interface MonthlyAttendance {
  month: string;
  records: {
    date: string;
    time: string;
    type: "full" | "half";
    session?: 'forenoon' | 'afternoon' | null;
  }[];
}

export default function Attendance() {
  const {
    records,
    loading,
    subscribeAttendance,
    markAttendance,
  } = useAttendanceStore();
  const { user, userData } = useAuthStore();
  const {
    requestLeave,
    fetchUserLeaveRequests,
    allLeaveRequests,
    subscribeLeaveRequests,
  } = useLeaveStore();
  const {
    requestWorkFrom,
    fetchUserWorkFromRequests,
    allWorkFromRequests,
    subscribeWorkFromRequests,
  } = useWorkFromStore();
  const {
    requestOOO,
    fetchUserOOORequests,
    allOOORequests,
    subscribeOOORequests,
  } = useOOOStore();
  const { addNotification } = useNotificationStore();
  // null = role not resolved yet; prevents fetching member-scoped data for admins
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const {
    holidays,
    subscribeHolidays,
    addHoliday,
    updateHoliday,
    removeHoliday,
  } = useHolidayStore();
  const [holidayName, setHolidayName] = useState("");
  const [holidayStartDate, setHolidayStartDate] = useState("");
  const [holidayEndDate, setHolidayEndDate] = useState("");
  const [selectedHolidayId, setSelectedHolidayId] = useState<string | null>(
    null
  );
  const [users, setUsers] = useState<Record<string, User>>({});
  const [selectedUser, setSelectedUser] = useState<string | null>(() => {
    // Initialize from localStorage if available
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedAttendanceUser");
    }
    return null;
  });

  // Persist selectedUser to localStorage
  useEffect(() => {
    if (selectedUser) {
      localStorage.setItem("selectedAttendanceUser", selectedUser);
    } else {
      localStorage.removeItem("selectedAttendanceUser");
    }
  }, [selectedUser]);

  // Security: Clear selectedUser if current user is not an admin
  useEffect(() => {
    if (userData && userData.role !== "admin" && selectedUser) {
      setSelectedUser(null);
    }
  }, [userData, selectedUser]);

  const [monthlyAttendance, setMonthlyAttendance] = useState<
    MonthlyAttendance[]
  >([]);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  // Modal states
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showWorkFromModal, setShowWorkFromModal] = useState(false);
  const [showOOOModal, setShowOOOModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    startDate: "",
    endDate: "",
    reason: "",
    leaveType: "full" as "full" | "half",
    session: "forenoon" as "forenoon" | "afternoon"
  });
  const [workFromForm, setWorkFromForm] = useState({
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [oooForm, setOOOForm] = useState({
    startDate: "",
    endDate: "",
    reason: "",
  });

  const [showEndDateInput, setShowEndDateInput] = useState(false);

  // Add state for the attendance marker modal
  const [showAttendanceMarker, setShowAttendanceMarker] = useState(false);
  const [showHolidayMarker, setShowHolidayMarker] = useState(false);

  const [attendanceType, setAttendanceType] = useState<"full" | "half">("full");

  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        setIsAdmin(userData?.role === "admin");
      }
    };

    checkUserRole();
  }, [user]);

  // Live employee list — newly verified/renamed employees appear without a reload
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const usersData: Record<string, User> = {};
        snapshot.docs.forEach((doc) => {
          const userData = doc.data();
          if (userData.verified && userData.role !== "customer") {
            usersData[doc.id] = { ...userData, id: doc.id } as User;
          }
        });
        setUsers(usersData);
      },
      (error) => {
        console.error("Error subscribing to users:", error);
      }
    );
    return unsubscribe;
  }, []);

  // Live Firestore subscriptions: every list the calendar renders from stays
  // in sync for the whole session (marks made by other users/devices included),
  // regardless of role — views filter by user themselves. Unsubscribed on unmount.
  useEffect(() => {
    const unsubscribers = [
      subscribeAttendance(),
      subscribeLeaveRequests(),
      subscribeWorkFromRequests(),
      subscribeOOORequests(),
      subscribeHolidays(),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [
    subscribeAttendance,
    subscribeLeaveRequests,
    subscribeWorkFromRequests,
    subscribeOOORequests,
    subscribeHolidays,
  ]);

  useEffect(() => {
    if (isAdmin === null) return;
    const userId = selectedUser || user?.uid;
    if (userId) {
      if (isAdmin && selectedUser) {
        fetchUserLeaveRequests(selectedUser);
        fetchUserWorkFromRequests(selectedUser);
        fetchUserOOORequests(selectedUser);
      } else if (!isAdmin) {
        fetchUserLeaveRequests();
        fetchUserWorkFromRequests();
        fetchUserOOORequests();
      }
    }
  }, [selectedUser, isAdmin]);

  // Drop a persisted employee selection that no longer resolves to a valid user
  useEffect(() => {
    if (selectedUser && Object.keys(users).length > 0 && !users[selectedUser]) {
      setSelectedUser(null);
    }
  }, [users, selectedUser]);

  useEffect(() => {
    const processRecords = () => {
      const userId = selectedUser || user?.uid;
      if (!userId) return;

      const monthlyData: Record<
        string,
        {
          name: string;
          records: { date: string; time: string; type: "full" | "half" }[];
        }
      > = {};

      records
        .filter((record) => record.attendance?.[userId])
        .forEach((record) => {
          // record.date is "YYYY-MM-DD"; parse the parts directly so the month
          // is not shifted by timezone (new Date("YYYY-MM-DD") is UTC midnight)
          const [year, month] = record.date.split("-").map(Number);
          const monthKey = record.date.slice(0, 7);
          const monthName = new Date(year, month - 1, 1).toLocaleString(
            "default",
            { month: "long", year: "numeric" }
          );

          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { name: monthName, records: [] };
          }

          monthlyData[monthKey].records.push({
            date: record.date,
            time: record.attendance[userId].time,
            type: record.attendance[userId].type || "full",
          });
        });

      const sortedMonthly = Object.entries(monthlyData)
        .sort(([keyA], [keyB]) => keyB.localeCompare(keyA))
        .map(([, data]) => ({
          month: data.name,
          records: data.records.sort((a, b) => b.date.localeCompare(a.date)),
        }));

      setMonthlyAttendance(sortedMonthly);
    };

    processRecords();
  }, [records, selectedUser, user?.uid]);

  const handleMarkAttendance = async () => {
    try {
      await markAttendance(attendanceType);
      toast.success("Attendance marked successfully");
    } catch (error) {
      console.error("Attendance marking error:", error);
      toast.error("Failed to mark attendance");
    }
  };

  const handleRequestLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requestLeave(
        leaveForm.startDate,
        leaveForm.endDate,
        leaveForm.reason,
        leaveForm.leaveType,
        leaveForm.leaveType === "half" ? leaveForm.session as "forenoon" | "afternoon" : undefined
      );
      setShowLeaveModal(false);
      setLeaveForm({
        startDate: "",
        endDate: "",
        reason: "",
        leaveType: "full",
        session: "forenoon"
      });
      toast.success("Leave request submitted successfully");

      // Calculate duration and send single notification
      if (userData?.role !== "admin") {
        const start = new Date(leaveForm.startDate);
        const end = new Date(leaveForm.endDate || leaveForm.startDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        await addNotification(
          `${userData?.fullName || "User"} requested ${leaveForm.leaveType} leave for ${days} day${days > 1 ? 's' : ''}`,
          `/dashboard/attendance`,
          user?.uid as string
        );
      }
    } catch (error) {
      console.error("Leave request error:", error);
      toast.error("Failed to submit leave request");
    }
  };

  const handleRequestWorkFromHome = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endDate = showEndDateInput ? workFromForm.endDate : workFromForm.startDate;

      if (!workFromForm.startDate) {
        throw new Error("Start date is required");
      }
      if (showEndDateInput && !endDate) {
        throw new Error("End date is required when setting a different end date");
      }
      if (!workFromForm.reason.trim()) {
        throw new Error("Reason is required");
      }

      await requestWorkFrom(workFromForm.startDate, endDate, workFromForm.reason);

      setShowWorkFromModal(false);
      setWorkFromForm({ startDate: "", endDate: "", reason: "" });
      setShowEndDateInput(false);
      toast.success("Work from home request submitted successfully");

      // Send single notification for WFH request
      if (userData?.role !== "admin") {
        const start = new Date(workFromForm.startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        await addNotification(
          `${userData?.fullName || "User"} requested work from home for ${days} day${days > 1 ? 's' : ''}`,
          `/dashboard/attendance`,
          user?.uid as string
        );
      }
    } catch (error) {
      console.error("Work from home request error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to submit work from home request"
      );
    }
  };

  const handleRequestOOO = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endDate = showEndDateInput ? oooForm.endDate : oooForm.startDate;

      if (!oooForm.startDate) {
        throw new Error("Start date is required");
      }
      if (showEndDateInput && !endDate) {
        throw new Error("End date is required when setting a different end date");
      }
      if (!oooForm.reason.trim()) {
        throw new Error("Reason is required");
      }

      await requestOOO(oooForm.startDate, endDate, oooForm.reason);

      setShowOOOModal(false);
      setOOOForm({ startDate: "", endDate: "", reason: "" });
      setShowEndDateInput(false);
      toast.success("Out-of-Office request submitted successfully");

      // Send single notification for OOO request
      if (userData?.role !== "admin") {
        const start = new Date(oooForm.startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        await addNotification(
          `${userData?.fullName || "User"} requested out-of-office for ${days} day${days > 1 ? 's' : ''}`,
          `/dashboard/attendance`,
          user?.uid as string
        );
      }
    } catch (error) {
      console.error("OOO request error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to submit Out-of-Office request"
      );
    }
  };

  const getTotalAttendance = (userId: string) => {
    return records.filter((record) => record.attendance?.[userId]).length;
  };

  const isTodayAttendanceMarked = () => {
    const today = getLocalDateString();
    return records.some(
      (record) => record.date === today && record.attendance?.[user?.uid || ""]
    );
  };

  const hasPendingRequests = (userId: string) => {
    const pendingLeave = allLeaveRequests.some(
      (req) => req.userId === userId && req.status === "pending"
    );
    const pendingWorkFrom = allWorkFromRequests.some(
      (req) => req.userId === userId && req.status === "pending"
    );
    const pendingOOO = allOOORequests.some(
      (req) => req.userId === userId && req.status === "pending"
    );

    return pendingLeave || pendingWorkFrom || pendingOOO;
  };

  const isAnyRequestPending = () => {
    return (
      allLeaveRequests.some((req) => req.status === "pending") ||
      allWorkFromRequests.some((req) => req.status === "pending") ||
      allOOORequests.some((req) => req.status === "pending")
    );
  };

  // Function to handle holiday submission
  const handleHolidaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If the end date input is not shown, set the end date to be the same as the start date
    const effectiveEndDate = showEndDateInput
      ? holidayEndDate
      : holidayStartDate;

    if (effectiveEndDate < holidayStartDate) {
      toast.error("End date cannot be before the start date");
      return;
    }

    try {
      if (selectedHolidayId) {
        await updateHoliday(
          selectedHolidayId,
          holidayName,
          holidayStartDate,
          effectiveEndDate
        );
        toast.success("Holiday updated successfully");
      } else {
        await addHoliday(holidayName, holidayStartDate, effectiveEndDate);
        toast.success("Holiday added successfully");
      }
    } catch (error) {
      console.error("Holiday save error:", error);
      toast.error("Failed to save holiday");
      return;
    }

    // Reset the form fields
    setShowHolidayMarker(false);
    setHolidayName("");
    setHolidayStartDate("");
    setHolidayEndDate("");
    setSelectedHolidayId(null);
    setShowEndDateInput(false); // Reset the checkbox state
  };

  // Function to handle holiday edit
  const handleEditHoliday = (holiday: Holiday) => {
    setHolidayName(holiday.name);
    setHolidayStartDate(holiday.startDate);
    setHolidayEndDate(holiday.endDate);
    setSelectedHolidayId(holiday.id);
    // Show the end-date input for multi-day holidays, otherwise saving the
    // edit would silently truncate the holiday to a single day
    setShowEndDateInput(holiday.endDate !== holiday.startDate);
  };

  // Function to handle holiday deletion
  const handleDeleteHoliday = async (id: string) => {
    try {
      await removeHoliday(id);
      toast.success("Holiday removed");
    } catch (error) {
      console.error("Holiday delete error:", error);
      toast.error("Failed to remove holiday");
    }
  };

  // Only block the page on the initial load. Every store action toggles
  // `loading`, and a full-page spinner mid-action unmounts open modals and
  // makes the view "disappear" while marking/updating attendance.
  if (loading && records.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex sm:flex-row flex-col gap-3 justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold">
            Attendance Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Total Days Present:{" "}
            {getTotalAttendance(selectedUser || user?.uid || "")}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!isTodayAttendanceMarked() && (
            <div className="flex gap-2">
              <Select
                value={attendanceType}
                onValueChange={(value) =>
                  setAttendanceType(value as "full" | "half")
                }
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Day</SelectItem>
                  <SelectItem value="half">Half Day</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleMarkAttendance}>
                Mark Today's Attendance
              </Button>
            </div>
          )}
          {isAdmin && (
            <Button
              variant="secondary"
              onClick={() => setShowAttendanceMarker(true)}
            >
              Member attendance marker
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="secondary"
              onClick={() => setShowHolidayMarker(true)}
            >
              Holiday Marker
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={() => setShowLeaveModal(true)}
          >
            Request Leave
          </Button>
          <Button variant="outline" onClick={() => setShowWorkFromModal(true)}>
            Work From Home
          </Button>
          <Button variant="outline" onClick={() => setShowOOOModal(true)}>
            Out-of-Office
          </Button>
        </div>
      </div>

      {/* Leave Request Modal */}
      <Dialog open={showLeaveModal} onOpenChange={setShowLeaveModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRequestLeave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="leave-start-date">Start Date</Label>
              <Input
                id="leave-start-date"
                type="date"
                required
                value={leaveForm.startDate}
                onChange={(e) =>
                  setLeaveForm({
                    ...leaveForm,
                    startDate: e.target.value,
                    endDate: showEndDateInput
                      ? leaveForm.endDate
                      : e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="leave-end-date-toggle"
                  checked={showEndDateInput}
                  onCheckedChange={(checked) => {
                    const isChecked = checked === true;
                    setShowEndDateInput(isChecked);
                    if (!isChecked) {
                      setLeaveForm({
                        ...leaveForm,
                        endDate: leaveForm.startDate,
                      });
                    }
                  }}
                />
                <Label htmlFor="leave-end-date-toggle">
                  Set different end date
                </Label>
              </div>
              {showEndDateInput && (
                <div className="space-y-2 pt-1">
                  <Label htmlFor="leave-end-date">End Date</Label>
                  <Input
                    id="leave-end-date"
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(e) =>
                      setLeaveForm({
                        ...leaveForm,
                        endDate: e.target.value,
                      })
                    }
                    min={leaveForm.startDate}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <RadioGroup
                value={leaveForm.leaveType}
                onValueChange={(value) =>
                  setLeaveForm({
                    ...leaveForm,
                    leaveType: value as "full" | "half",
                  })
                }
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="full" id="leave-type-full" />
                  <Label htmlFor="leave-type-full" className="font-normal">
                    Full Day
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="half" id="leave-type-half" />
                  <Label htmlFor="leave-type-half" className="font-normal">
                    Half Day
                  </Label>
                </div>
              </RadioGroup>
            </div>
            {leaveForm.leaveType === "half" && (
              <div className="space-y-2">
                <Label>Leave Session</Label>
                <RadioGroup
                  value={leaveForm.session}
                  onValueChange={(value) =>
                    setLeaveForm({
                      ...leaveForm,
                      session: value as "forenoon" | "afternoon",
                    })
                  }
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="forenoon" id="leave-session-forenoon" />
                    <Label
                      htmlFor="leave-session-forenoon"
                      className="font-normal"
                    >
                      Forenoon
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="afternoon" id="leave-session-afternoon" />
                    <Label
                      htmlFor="leave-session-afternoon"
                      className="font-normal"
                    >
                      Afternoon
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="leave-reason">Reason</Label>
              <Textarea
                id="leave-reason"
                required
                value={leaveForm.reason}
                onChange={(e) =>
                  setLeaveForm({
                    ...leaveForm,
                    reason: e.target.value,
                  })
                }
                placeholder="Please provide a reason for leave"
                className="resize-none h-24"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLeaveModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive">
                Submit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Work From Home Modal */}
      <Dialog open={showWorkFromModal} onOpenChange={setShowWorkFromModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Work From Home</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRequestWorkFromHome} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wfh-start-date">Start Date</Label>
              <Input
                id="wfh-start-date"
                type="date"
                required
                value={workFromForm.startDate}
                onChange={(e) =>
                  setWorkFromForm({
                    ...workFromForm,
                    startDate: e.target.value,
                    endDate: showEndDateInput
                      ? workFromForm.endDate
                      : e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="wfh-end-date-toggle"
                  checked={showEndDateInput}
                  onCheckedChange={(checked) => {
                    const isChecked = checked === true;
                    setShowEndDateInput(isChecked);
                    if (!isChecked) {
                      setWorkFromForm({
                        ...workFromForm,
                        endDate: workFromForm.startDate,
                      });
                    }
                  }}
                />
                <Label htmlFor="wfh-end-date-toggle">
                  Set different end date
                </Label>
              </div>
              {showEndDateInput && (
                <div className="space-y-2 pt-1">
                  <Label htmlFor="wfh-end-date">End Date</Label>
                  <Input
                    id="wfh-end-date"
                    type="date"
                    value={workFromForm.endDate}
                    onChange={(e) =>
                      setWorkFromForm({
                        ...workFromForm,
                        endDate: e.target.value,
                      })
                    }
                    min={workFromForm.startDate}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="wfh-reason">Reason</Label>
              <Textarea
                id="wfh-reason"
                required
                value={workFromForm.reason}
                onChange={(e) =>
                  setWorkFromForm({
                    ...workFromForm,
                    reason: e.target.value,
                  })
                }
                placeholder="Please provide a reason for working from home"
                className="resize-none h-24"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowWorkFromModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Submit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Out-of-Office Modal */}
      <Dialog open={showOOOModal} onOpenChange={setShowOOOModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Out-of-Office</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRequestOOO} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ooo-start-date">Start Date</Label>
              <Input
                id="ooo-start-date"
                type="date"
                required
                value={oooForm.startDate}
                onChange={(e) =>
                  setOOOForm({
                    ...oooForm,
                    startDate: e.target.value,
                    endDate: showEndDateInput
                      ? oooForm.endDate
                      : e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ooo-end-date-toggle"
                  checked={showEndDateInput}
                  onCheckedChange={(checked) => {
                    const isChecked = checked === true;
                    setShowEndDateInput(isChecked);
                    if (!isChecked) {
                      setOOOForm({
                        ...oooForm,
                        endDate: oooForm.startDate,
                      });
                    }
                  }}
                />
                <Label htmlFor="ooo-end-date-toggle">
                  Set different end date
                </Label>
              </div>
              {showEndDateInput && (
                <div className="space-y-2 pt-1">
                  <Label htmlFor="ooo-end-date">End Date</Label>
                  <Input
                    id="ooo-end-date"
                    type="date"
                    value={oooForm.endDate}
                    onChange={(e) =>
                      setOOOForm({
                        ...oooForm,
                        endDate: e.target.value,
                      })
                    }
                    min={oooForm.startDate}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ooo-reason">Reason</Label>
              <Textarea
                id="ooo-reason"
                required
                value={oooForm.reason}
                onChange={(e) =>
                  setOOOForm({
                    ...oooForm,
                    reason: e.target.value,
                  })
                }
                placeholder="Please provide a reason for Out-of-Office"
                className="resize-none h-24"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowOOOModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Submit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="px-1 sm:px-[10%] mt-10">
        {isAdmin && (
          <div className="mb-6 space-y-2">
            <Label>Select Employee</Label>
            <div className="relative">
              <Select
                value={selectedUser ?? "none"}
                onValueChange={(value) =>
                  setSelectedUser(value === "none" ? null : value)
                }
                open={showEmployeeDropdown}
                onOpenChange={setShowEmployeeDropdown}
              >
                <SelectTrigger className="w-full capitalize">
                  <SelectValue placeholder="Select employee...">
                    <span className="flex items-center gap-2">
                      <span>
                        {selectedUser
                          ? users[selectedUser]?.fullName
                          : "Select employee..."}
                      </span>
                      {selectedUser && hasPendingRequests(selectedUser) && (
                        <span className="h-2 w-2 bg-red-600 rounded-full animate-pulse" />
                      )}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select employee...</SelectItem>
                  {Object.values(users).map((employee) => (
                    <SelectItem
                      key={employee.id}
                      value={employee.id}
                      className="capitalize"
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{employee.fullName}</span>
                        <span className="text-muted-foreground">
                          - {getTotalAttendance(employee.id)} days present
                        </span>
                        {hasPendingRequests(employee.id) && (
                          <span className="h-2 w-2 bg-red-600 rounded-full animate-pulse" />
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isAnyRequestPending() ? (
                <span className="h-3 w-3 bg-red-600 rounded-full animate-pulse absolute top-0 right-0 translate-x-1 -translate-y-1 pointer-events-none" />
              ) : null}
            </div>
          </div>
        )}

        <AttendanceCalendar
          monthlyAttendance={monthlyAttendance}
          selectedUser={selectedUser}
          isAdmin={isAdmin === true}
        />
      </div>

      {/* Add the modal component */}
      {isAdmin && showAttendanceMarker && (
        <AdminAttendanceMarker
          users={users}
          setShowAttendanceMarker={setShowAttendanceMarker}
        />
      )}

      {/* Holiday Marker Modal */}
      <Dialog open={showHolidayMarker} onOpenChange={setShowHolidayMarker}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Holidays</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleHolidaySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="holiday-name">Holiday Name</Label>
              <Input
                id="holiday-name"
                type="text"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-start-date">Start Date</Label>
              <Input
                id="holiday-start-date"
                type="date"
                value={holidayStartDate}
                onChange={(e) => setHolidayStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="holiday-end-date-toggle"
                  checked={showEndDateInput}
                  onCheckedChange={(checked) =>
                    setShowEndDateInput(checked === true)
                  }
                />
                <Label htmlFor="holiday-end-date-toggle">
                  Set different end date
                </Label>
              </div>
              {showEndDateInput && (
                <div className="space-y-2 pt-1">
                  <Label htmlFor="holiday-end-date">End Date</Label>
                  <Input
                    id="holiday-end-date"
                    type="date"
                    value={holidayEndDate}
                    onChange={(e) => setHolidayEndDate(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowHolidayMarker(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {selectedHolidayId ? "Update Holiday" : "Add Holiday"}
              </Button>
            </DialogFooter>
          </form>

          <Separator />

          <h3 className="text-base font-semibold">Existing Holidays</h3>
          <ul className="space-y-2">
            {holidays.map((holiday) => (
              <li
                key={holiday.id}
                className="flex justify-between items-center"
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {holiday.name.length > 20
                      ? `${holiday.name.slice(0, 20)}...`
                      : holiday.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {holiday.startDate} to {holiday.endDate}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditHoliday(holiday)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteHoliday(holiday.id)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

    </div>
  );
}
