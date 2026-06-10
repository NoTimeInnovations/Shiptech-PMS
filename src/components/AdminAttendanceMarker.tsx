import { useState } from "react";
import { useAttendanceStore, getLocalDateString } from "../store/attendanceStore";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) setShowAttendanceMarker(false);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Attendance for Employee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-attendance-employee">Select Employee</Label>
            <Select
              value={selectedUser}
              onValueChange={(value) => setSelectedUser(value)}
              required
            >
              <SelectTrigger id="admin-attendance-employee" className="w-full">
                <SelectValue placeholder="Select Employee" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(users).map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-attendance-date">Select Date</Label>
            <Input
              id="admin-attendance-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
              max={getLocalDateString()}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-attendance-type">Attendance Type</Label>
            <Select
              value={attendanceType}
              onValueChange={(value) => setAttendanceType(value as 'full' | 'half')}
              required
            >
              <SelectTrigger id="admin-attendance-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Day</SelectItem>
                <SelectItem value="half">Half Day</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAttendanceMarker(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Mark Attendance</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
