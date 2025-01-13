import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface ItemStatusBadgeProps {
  completed: boolean;
}

export default function ItemStatusBadge({ completed }: ItemStatusBadgeProps) {
  return completed ? (
    <div className="flex items-center">
      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
      <p className="text-green-600">Completed</p>
    </div>
  ) : (
    <div className="flex items-center">
      <XCircle className="h-4 w-4 text-yellow-500 mr-2" />
      <p className="text-yellow-600">In Progress</p>
    </div>
  );
}