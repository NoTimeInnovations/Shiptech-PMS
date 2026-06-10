import React, { useState, useEffect } from 'react';
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

interface DeliverableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    hours?: number;
    costPerHour?: number;
  }) => void;
  initialData?: {
    name: string;
    description: string;
    hours?: number;
    costPerHour?: number;
  };
}

export default function DeliverableModal({
  isOpen,
  onClose,
  onSubmit,
  initialData
}: DeliverableModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hours: undefined as number | undefined,
    costPerHour: undefined as number | undefined
  });

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        hours: initialData.hours,
        costPerHour: initialData.costPerHour
      });
    } else {
      setFormData({
        name: '',
        description: '',
        hours: undefined,
        costPerHour: undefined
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Deliverable' : 'Add Deliverable'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="deliverable-name">Name</Label>
            <Input
              id="deliverable-name"
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deliverable-description">Description</Label>
            <Textarea
              id="deliverable-description"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="deliverable-hours">Hours</Label>
              <Input
                id="deliverable-hours"
                type="number"
                min="0"
                step="0.5"
                value={formData.hours || ''}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  hours: e.target.value ? Number(e.target.value) : undefined
                }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deliverable-cost-per-hour">Cost/Hour</Label>
              <Input
                id="deliverable-cost-per-hour"
                type="number"
                min="0"
                step="0.01"
                value={formData.costPerHour || ''}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  costPerHour: e.target.value ? Number(e.target.value) : undefined
                }))}
              />
            </div>
          </div>

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
