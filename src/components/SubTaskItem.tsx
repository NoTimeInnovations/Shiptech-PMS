import { Pencil, Trash2, User, Calendar } from 'lucide-react';
import { Task } from '@/store/projectStore';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface SubTaskItemProps {
  task: Task;
  onEditClick: (task: Task) => void;
  onDeleteClick: (taskId: string) => void;
  onClick: () => void;
}

export default function SubTaskItem({
  task,
  onEditClick,
  onDeleteClick,
  onClick
}: SubTaskItemProps) {
  return (
    <Card
      size="sm"
      className="cursor-pointer transition-colors hover:ring-blue-500"
      onClick={onClick}
    >
      <div className="flex justify-between items-start px-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">{task.name}</h3>
            <Badge variant="secondary">{task.percentage}%</Badge>
          </div>
          {task.description && (
            <p className="mt-1 text-muted-foreground">{task.description}</p>
          )}
          <div className="mt-2 flex items-center space-x-4 text-sm text-muted-foreground">
            {task.assignedTo && (
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                <span>{task.assignedTo[0].fullName}</span>
              </div>
            )}
            {task.deadline && (
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{new Date(task.deadline).toLocaleDateString('en-GB')}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex space-x-2" onClick={e => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-blue-500"
            onClick={() => onEditClick(task)}
          >
            <Pencil className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onDeleteClick(task.id)}
          >
            <Trash2 className="size-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
