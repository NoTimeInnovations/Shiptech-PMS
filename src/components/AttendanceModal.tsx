import { useAttendanceStore } from '../store/attendanceStore';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AttendanceModal({ isOpen, onClose }: AttendanceModalProps) {
  const { markAttendance, loading } = useAttendanceStore();

  const handleMarkAttendance = async () => {
    try {
      await markAttendance();
      onClose();
    } catch (error) {
      console.error('Failed to mark attendance:', error);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark Your Attendance</DialogTitle>
          <DialogDescription>
            Would you like to mark your attendance for today?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            No, Later
          </Button>
          <Button onClick={handleMarkAttendance} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                Marking...
              </>
            ) : (
              "Yes, I'm In"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
