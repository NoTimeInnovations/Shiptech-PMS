import React, { useState, useEffect } from 'react';
import { Task } from '../store/taskStore';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface ManagePercentagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onSubmit: (updatedTasks: Task[]) => void;
}

export default function ManagePercentagesModal({
  isOpen,
  onClose,
  tasks,
  onSubmit
}: ManagePercentagesModalProps) {
  const [percentages, setPercentages] = useState<{ [key: string]: number }>({});
  const [remainingPercentage, setRemainingPercentage] = useState(100);
  const [totalPercentage, setTotalPercentage] = useState(0);

  useEffect(() => {
    const initialPercentages = tasks.reduce((acc, task) => {
      acc[task.id] = task.percentage || 0;
      return acc;
    }, {} as { [key: string]: number });
    setPercentages(initialPercentages);

    const total = tasks.reduce((acc, task) => acc + (task.percentage || 0), 0);
    setTotalPercentage(total);
    setRemainingPercentage(100 - total);
  }, [tasks]);

  const handlePercentageChange = (taskId: string, value: number) => {
    const otherTasksTotal = Object.entries(percentages)
      .reduce((acc, [id, val]) => id !== taskId ? acc + val : acc, 0);

    // Ensure we don't exceed 100%
    const maxAllowed = 100 - otherTasksTotal;
    const newValue = Math.min(value, maxAllowed);

    const newPercentages = {
      ...percentages,
      [taskId]: newValue
    };

    setPercentages(newPercentages);

    // Calculate new totals
    const newTotal = Object.values(newPercentages).reduce((acc, val) => acc + val, 0);
    setTotalPercentage(newTotal);
    setRemainingPercentage(100 - newTotal);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedTasks = tasks.map(task => ({
      ...task,
      percentage: percentages[task.id] || 0
    }));
    onSubmit(updatedTasks);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-md">
        <DialogHeader className="border-b p-6">
          <DialogTitle>Manage Task Percentages</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="percentages-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Percentage Summary */}
            <div className="space-y-2 rounded-lg bg-muted/50 p-4">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-muted-foreground">Total Allocated</span>
                <span className={totalPercentage > 100 ? 'text-red-600' : 'text-green-600'}>
                  {totalPercentage}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining</span>
                <span className={remainingPercentage < 0 ? 'text-red-600' : 'text-muted-foreground'}>
                  {remainingPercentage}%
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-2.5 w-full rounded-full bg-muted">
                <div
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    totalPercentage > 100 ? 'bg-destructive' : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(totalPercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Task Percentage Inputs */}
            <div className="space-y-4">
              {tasks.map(task => (
                <div key={task.id} className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor={`percentage-${task.id}`}>{task.name}</Label>
                    <span className="text-sm text-muted-foreground">{percentages[task.id]}%</span>
                  </div>
                  <input
                    id={`percentage-${task.id}`}
                    type="range"
                    min="0"
                    max="100"
                    value={percentages[task.id] || 0}
                    onChange={(e) => handlePercentageChange(task.id, Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          </form>
        </div>

        <DialogFooter className="border-t p-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="percentages-form"
            disabled={totalPercentage > 100}
          >
            Update Percentages
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
