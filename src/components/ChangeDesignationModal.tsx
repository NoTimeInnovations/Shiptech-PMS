import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

interface ChangeDesignationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail:string;
  currentDesignation: string;
  onDesignationChange: (newDesignation:
     string) => void;
}

const ChangeDesignationModal = ({
  isOpen,
  onClose,
  userId,
  userEmail,
  currentDesignation,
  onDesignationChange
}: ChangeDesignationModalProps) => {
  const [designation, setDesignation] = useState(currentDesignation || '');
  const [loading, setLoading] = useState(false);

  const {updateUserData}=useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    
    if (!designation.trim()) {
      toast.error('Please enter a designation');
      return;
    }

    try {
      setLoading(true);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        designation: designation.trim()

      });


      await  updateUserData(userEmail,designation)
      onDesignationChange(designation);
      toast.success('Designation updated successfully');
       
  
      
      onClose();
    } catch (error) {
      console.error('Error updating designation:', error);
      toast.error('Failed to update designation');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Change Designation</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Designation
            </label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter new designation"
              disabled={loading}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center min-w-[80px]"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Change'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangeDesignationModal;