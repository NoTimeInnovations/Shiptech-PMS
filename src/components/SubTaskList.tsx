import { Plus } from 'lucide-react';
import SubTaskItem from './SubTaskItem';
import { Task } from '@/store/projectStore';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SubTask {
  id: string;
  name: string;
  description?: string;
  assignedTo?: {
    fullName: string;
  };
  deadline?: string;
}

interface SubTaskListProps {
  tasks?: Task[];
  onAddClick: () => void;
  onEditClick: (task: SubTask) => void;
  onDeleteClick: (taskId: string) => void;
  onTaskClick: () => void;
}

export default function SubTaskList({
  tasks = [], // Provide default empty array
  onAddClick,
  onEditClick,
  onDeleteClick,
  onTaskClick
}: SubTaskListProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">Subtasks</CardTitle>
          <Button onClick={onAddClick} size="sm">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No subtasks yet. Add your first task!
            </p>
          ) : (
            tasks.map(task => (
              <SubTaskItem
                key={task.id}
                task={task}
                onEditClick={() => onEditClick(task as SubTask)}
                onDeleteClick={() => onDeleteClick(task.id)}
                onClick={() => onTaskClick()}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
