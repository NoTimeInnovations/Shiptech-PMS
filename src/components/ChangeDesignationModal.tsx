import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
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

interface ChangeDesignationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail:string;
  currentDesignation: string;
  onDesignationChange: (newDesignation:
     string) => void;
}

const ChangeDesignationModal = ({
  isOpen,
  onClose,
  userId,
  userEmail,
  currentDesignation,
  onDesignationChange
}: ChangeDesignationModalProps) => {
  const [designation, setDesignation] = useState(currentDesignation || '');
  const [loading, setLoading] = useState(false);

  const {updateUserData}=useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();


    if (!designation.trim()) {
      toast.error('Please enter a designation');
      return;
    }

    try {
      setLoading(true);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        designation: designation.trim()

      });


      await  updateUserData(userEmail,designation)
      onDesignationChange(designation);
      toast.success('Designation updated successfully');



      onClose();
    } catch (error) {
      console.error('Error updating designation:', error);
      toast.error('Failed to update designation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Designation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="mb-4 space-y-2">
            <Label htmlFor="new-designation">New Designation</Label>
            <Input
              id="new-designation"
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="Enter new designation"
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

export default ChangeDesignationModal;
