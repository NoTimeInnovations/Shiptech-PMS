import React, { useState, useEffect } from 'react';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserData } from '@/store/authStore';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface User {
  id: string;
  fullName: string;
  email: string;
}

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    assignedTo?: User;
    deadline?: string;
  }) => void;
  initialData?: {
    name: string;
    description: string;
    assignedTo?: User;
    deadline?: string;
  };
}

export default function TaskDetailsModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: TaskDetailsModalProps) {
  // State for form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    assignedTo: undefined as User | undefined,
    deadline: '',
  });

  // State for list of users
  const [users, setUsers] = useState<User[]>([]);

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        assignedTo: initialData.assignedTo,
        deadline: initialData.deadline || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        assignedTo: undefined,
        deadline: '',
      });
    }
  }, [initialData, isOpen]);

  // Fetch users from Firestore when modal opens
  useEffect(() => {
    const fetchUsers = async () => {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const verifiedUsers = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as UserData))
        .filter((user) => user.verified) as User[];
      setUsers(verifiedUsers);
    };
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle user assignment change
  const handleAssignedToChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const user = users.find((u) => u.id === e.target.value);
    setFormData((prev) => ({ ...prev, assignedTo: user }));
  };

  // Handle deadline change
  const handleDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, deadline: e.target.value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Task' : 'Add Task'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div className="space-y-1.5">
            <Label htmlFor="task-details-name">Name</Label>
            <Input
              id="task-details-name"
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
            />
          </div>

          {/* Description Field */}
          <div className="space-y-1.5">
            <Label htmlFor="task-details-description">Description</Label>
            <Textarea
              id="task-details-description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
            />
          </div>

          {/* Assign To Field */}
          <div className="space-y-1.5">
            <Label htmlFor="task-details-assigned-to">Assign To</Label>
            <Select
              value={formData.assignedTo?.id || ''}
              onValueChange={(value) =>
                handleAssignedToChange({
                  target: { value },
                } as React.ChangeEvent<HTMLSelectElement>)
              }
            >
              <SelectTrigger id="task-details-assigned-to" className="w-full">
                <SelectValue placeholder="Select user..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Deadline Field */}
          <div className="space-y-1.5">
            <Label htmlFor="task-details-deadline">Deadline</Label>
            <Input
              id="task-details-deadline"
              type="datetime-local"
              value={formData.deadline}
              onChange={handleDeadlineChange}
            />
          </div>

          {/* Form Actions */}
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {initialData ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
