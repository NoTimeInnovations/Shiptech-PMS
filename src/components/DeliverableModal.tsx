import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {initialData ? 'Edit Deliverable' : 'Add Deliverable'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Hours</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.hours || ''}
                onChange={e => setFormData(prev => ({ 
                  ...prev, 
                  hours: e.target.value ? Number(e.target.value) : undefined 
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Cost/Hour</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.costPerHour || ''}
                onChange={e => setFormData(prev => ({ 
                  ...prev, 
                  costPerHour: e.target.value ? Number(e.target.value) : undefined 
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              {initialData ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}