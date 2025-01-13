import React from 'react';
import { User, Calendar } from 'lucide-react';
import ItemStatusBadge from './ItemStatusBadge';

interface ItemDetailsProps {
  item: {
    description?: string;
    assignedTo?: {
      fullName: string;
    };
    deadline?: string;
    completed: boolean;
  };
}

export default function ItemDetails({ item }: ItemDetailsProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm mb-6">
      <div className="p-6">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
            <p className="text-gray-700">{item.description || 'No description provided'}</p>
          </div>
          
          {item.assignedTo && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Assigned To</h3>
              <div className="flex items-center">
                <User className="h-4 w-4 text-gray-400 mr-2" />
                <p>{item.assignedTo.fullName}</p>
              </div>
            </div>
          )}
          
          {item.deadline && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Deadline</h3>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                <p>{new Date(item.deadline).toLocaleString()}</p>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
            <ItemStatusBadge completed={item.completed} />
          </div>
        </div>
      </div>
    </div>
  );
}