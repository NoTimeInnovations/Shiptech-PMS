import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { doc, getDocs, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
        .map((doc) => ({ id: doc.id, ...doc.data() }))
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

  // Don't render the modal if it's not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {initialData ? 'Edit Task' : 'Add Task'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {/* Assign To Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Assign To</label>
            <select
              value={formData.assignedTo?.id || ''}
              onChange={handleAssignedToChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select user...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Deadline Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Deadline</label>
            <input
              type="datetime-local"
              value={formData.deadline}
              onChange={handleDeadlineChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Form Actions */}
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