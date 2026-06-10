import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ChangeJoinDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentJoinDate: string;
  onJoinDateChange: (newJoinDate: string) => void;
}

const ChangeJoinDateModal = ({
  isOpen,
  onClose,
  userId,
  currentJoinDate,
  onJoinDateChange
}: ChangeJoinDateModalProps) => {
  const [joinDate, setJoinDate] = useState(
    currentJoinDate ? new Date(currentJoinDate).toISOString().split('T')[0] : ''
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!joinDate.trim()) {
      toast.error('Please select a join date');
      return;
    }

    try {
      setLoading(true);
      const userRef = doc(db, 'users', userId);
      const newJoinDate = new Date(joinDate).toISOString();

      await updateDoc(userRef, {
        createdAt: newJoinDate
      });

      onJoinDateChange(newJoinDate);
      toast.success('Join date updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating join date:', error);
      toast.error('Failed to update join date');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Join Date</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="mb-4 space-y-2">
            <Label htmlFor="new-join-date">New Join Date</Label>
            <Input
              id="new-join-date"
              type="date"
              value={joinDate}
              onChange={(e) => setJoinDate(e.target.value)}
              disabled={loading}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="min-w-[80px]"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Change'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeJoinDateModal;
