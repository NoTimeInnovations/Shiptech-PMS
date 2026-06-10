import { Fragment, useState } from 'react';
import { Task } from '@/store/taskStore';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TimeData {
  taskId: string;
  taskName: string;
  estimatedHours: number;
  actualHours: number;
  isParent: boolean;
  hasSubtasks: boolean;
  children?: TimeData[];
  subtasksActualHours?: number;
}

interface CompletionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  tasks: Task[];
}

export default function CompletionSummaryModal({
  isOpen,
  onClose,
  onComplete,
  tasks
}: CompletionSummaryModalProps) {
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTaskIds(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const calculateTimeData = (tasks: Task[], isChild = false): TimeData[] => {
    return tasks.map(task => {
      // Calculate actual hours from time entries (only for this task)
      const taskActualHours = task.timeEntries?.reduce((total, entry) => {
        return total + (entry.duration || 0);
      }, 0) || 0;

      const hasSubtasks = !!task.children?.length;

      // Process children first to get their data
      let childrenData: TimeData[] = [];
      let subtasksActualHours = 0;

      if (task.children) {
        childrenData = calculateTimeData(task.children, true);
        subtasksActualHours = childrenData.reduce(
          (sum, child) => sum + child.actualHours + (child.subtasksActualHours || 0),
          0
        );
      }

      // Calculate total actual hours for this task
      // If it has subtasks, include subtask hours in the parent's actual hours
      const totalActualHours = hasSubtasks && !isChild
        ? (taskActualHours / 60) + subtasksActualHours
        : taskActualHours / 60;

      const timeData: TimeData = {
        taskId: task.id,
        taskName: task.name,
        estimatedHours: task.hours || 0,
        actualHours: totalActualHours, // This now includes subtask hours for parent tasks
        isParent: hasSubtasks && !isChild,
        hasSubtasks,
        children: childrenData,
        subtasksActualHours
      };

      return timeData;
    });
  };

  const timeData = calculateTimeData(tasks);

  // Calculate totals
  const totalEstimated = timeData.reduce(
    (sum, data) => sum + data.estimatedHours, 0
  );

  const totalActual = timeData.reduce(
    (sum, data) => sum + data.actualHours , 0
  );

  const totalDifference = totalEstimated - totalActual ;

  const renderTimeDifference = (difference: number) => {
    const absoluteDiff = Math.abs(difference);
    if (difference === 0) {
      return <span className="text-muted-foreground">On time</span>;
    }
    return (
      <span className={difference < 0 ? 'text-red-500' : 'text-green-500'}>
        {absoluteDiff.toFixed(2)} hours {difference < 0 ? 'loss' : 'gain'}
      </span>
    );
  };

  const calculateTaskDifference = (task: TimeData) => {
    if (!task.hasSubtasks) {
      // For tasks without subtasks: estimated - actual
      return task.estimatedHours - task.actualHours;
    } else {
      // For tasks with subtasks: estimated - (actual + subtasks actual)
      return task.estimatedHours - (task.actualHours);
    }
  };

  const renderTaskRow = (data: TimeData, _index: number, level = 0) => {
    const difference = calculateTaskDifference(data);
    const hasChildren = data.children && data.children.length > 0;
    const isExpanded = expandedTaskIds[data.taskId];

    return (
      <Fragment key={`${data.taskId}-${level}`}>
        <TableRow className={level > 0 ? 'bg-muted/50' : undefined}>
          <TableCell className="text-sm">
            <div style={{ paddingLeft: `${level * 20}px` }} className="flex items-center">
              {hasChildren && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mr-1 h-6 w-6 text-muted-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTaskExpand(data.taskId);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </Button>
              )}
              {data.taskName}
            </div>
          </TableCell>
          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
            {data.estimatedHours.toFixed(2)}
          </TableCell>
          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
            {data.actualHours.toFixed(2)}
          </TableCell>
          <TableCell className="whitespace-nowrap text-sm">
            {data.estimatedHours > 0 ? renderTimeDifference(difference) : '-'}
          </TableCell>
        </TableRow>
        {isExpanded && hasChildren && data.children?.map(
          (child, childIndex) => renderTaskRow(child, childIndex, level + 1)
        )}
      </Fragment>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Project Time Summary</DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Estimated Hours</TableHead>
                <TableHead>Actual Hours</TableHead>
                <TableHead>Time Difference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeData.map((data, index) => renderTaskRow(data, index))}
              <TableRow className="bg-muted font-medium">
                <TableCell className="whitespace-nowrap text-sm">
                  Project Total
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {totalEstimated.toFixed(2)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {totalActual.toFixed(2)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {renderTimeDifference(totalDifference)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onComplete}>
            Complete Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
