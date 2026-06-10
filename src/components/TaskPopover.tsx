import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TaskPopoverProps {
  tasks: { name: string; deadline: string; assignees: string[] }[];
  isOpen: boolean;
  onClose: () => void;
}

const TaskPopover: React.FC<TaskPopoverProps> = ({ tasks, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <Card size="sm" className="absolute z-10 shadow-lg">
      <CardHeader>
        <CardTitle>Tasks:</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          {tasks.map((task, index) => (
            <li key={index} className="text-sm">
              <strong>{task.name}</strong>{" "}
              <span className="text-muted-foreground">
                - Due: {task.deadline} - Assignees: {task.assignees.join(", ")}
              </span>
            </li>
          ))}
        </ul>
        <Button variant="link" size="sm" className="mt-2 px-0" onClick={onClose}>
          Close
        </Button>
      </CardContent>
    </Card>
  );
};

export default TaskPopover;
