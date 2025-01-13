import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { 
  Loader2, 
  Pencil, 
  FileDown, 
  ArrowLeft,
  Plus,
  Trash2,
  Calendar,
  User
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import html2pdf from 'html2pdf.js';
import toast from 'react-hot-toast';
import DeliverableModal from '../components/DeliverableModal';

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchProject, addDeliverable, updateDeliverable, deleteDeliverable } = useProjectStore();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<any>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    const loadProject = async () => {
      if (id) {
        const data = await fetchProject(id);
        if (data) {
          setProject(data);
        } else {
          toast.error('Project not found');
          navigate('/dashboard/projects');
        }
        setLoading(false);
      }
    };

    const checkUserRole = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        setIsAdmin(userData?.role === 'admin');
      }
    };

    loadProject();
    checkUserRole();
  }, [id, user, fetchProject, navigate]);

  const handleAddDeliverable = async (data: any) => {
    if (!id) return;
    try {
      await addDeliverable(id, data);
      const updatedProject = await fetchProject(id);
      if (updatedProject) {
        setProject(updatedProject);
        toast.success('Deliverable added successfully');
      }
    } catch (error) {
      toast.error('Failed to add deliverable');
    }
  };

  const handleEditDeliverable = async (data: any) => {
    if (!id || !editingDeliverable) return;
    try {
      await updateDeliverable(id, editingDeliverable.id, data);
      const updatedProject = await fetchProject(id);
      if (updatedProject) {
        setProject(updatedProject);
        toast.success('Deliverable updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update deliverable');
    }
  };

  const handleDeleteDeliverable = async (deliverableId: string) => {
    if (!id) return;
    if (window.confirm('Are you sure you want to delete this deliverable?')) {
      try {
        await deleteDeliverable(id, deliverableId);
        const updatedProject = await fetchProject(id);
        if (updatedProject) {
          setProject(updatedProject);
          toast.success('Deliverable deleted successfully');
        }
      } catch (error) {
        toast.error('Failed to delete deliverable');
      }
    }
  };

  const downloadInvoice = () => {
    if (!project) return;

    const totalAmount = project.deliverables.reduce((sum: number, d: any) => 
      sum + (d.hours || 0) * (d.costPerHour || 0), 0);

    const content = `
      <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #2563eb;">PROJECT INVOICE</h1>
          <p style="color: #666;">Project ID: ${project.__id}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2>ShipTech-ICON</h2>
          <p>Center for Innovation Technology Transfer & Industrial Collaboration</p>
          <p>CITTIC, CUSAT, Kochi, Kerala 682022</p>
        </div>

        <div style="margin-bottom: 30px;">
          <h3>Project Information</h3>
          <p><strong>Name:</strong> ${project.name}</p>
          <p><strong>Description:</strong> ${project.description}</p>
        </div>

        <div style="margin-bottom: 30px;">
          <h3>Customer Details:</h3>
          <p><strong>${project.customer.name}</strong></p>
          <p>${project.customer.address}</p>
          <p>Phone: ${project.customer.phone}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Deliverable</th>
              <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">Hours</th>
              <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">Rate/Hour</th>
              <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${project.deliverables.map((d: any) => `
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                  <strong>${d.name}</strong>
                  ${d.description ? `<br><span style="color: #666; font-size: 0.9em;">${d.description}</span>` : ''}
                </td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">${d.hours || 0}</td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">₹${d.costPerHour || 0}</td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">₹${(d.hours || 0) * (d.costPerHour || 0)}</td>
              </tr>
            `).join('')}
            <tr style="background-color: #f3f4f6;">
              <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">Total Amount:</td>
              <td style="padding: 12px; text-align: right; font-weight: bold;">₹${totalAmount}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    const opt = {
      margin: 1,
      filename: `project-invoice-${project.__id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    const element = document.createElement('div');
    element.innerHTML = content;
    document.body.appendChild(element);

    html2pdf().set(opt).from(element).save().then(() => {
      document.body.removeChild(element);
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-red-500">Project not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard/projects')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </button>
          <h2 className="text-2xl font-bold">Project Details</h2>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={downloadInvoice}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Download Invoice
          </button>
          {isAdmin && (
            <button
              onClick={() => navigate(`/dashboard/projects/${id}/edit`)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Project
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Project Information */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
            <h3 className="text-lg font-medium text-gray-900">Project Information</h3>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">ID</p>
                <p className="mt-1">{project.__id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Created At</p>
                <p className="mt-1">{new Date(project.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="mt-1">{project.name}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p className="mt-1">{project.description}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Customer Name</p>
                <p className="mt-1">{project.customer.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Phone</p>
                <p className="mt-1">{project.customer.phone}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500">Address</p>
                <p className="mt-1">{project.customer.address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Deliverables Section */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Deliverables</h3>
              {isAdmin && (
                <button
                  onClick={() => {
                    setEditingDeliverable(null);
                    setIsModalOpen(true);
                  }}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Deliverable
                </button>
              )}
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="space-y-4">
              {project.deliverables.map((deliverable: any) => (
                <div 
                  key={deliverable.id}
                  className="border rounded-lg hover:border-blue-500 transition-colors duration-200"
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => navigate(`/dashboard/projects/${id}/deliverable/deliverable:${deliverable.id}`)}
                      >
                        <h4 className="text-lg font-medium">{deliverable.name}</h4>
                        {deliverable.description && (
                          <p className="mt-1 text-gray-600">{deliverable.description}</p>
                        )}
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                          {deliverable.hours && (
                            <span>Hours: {deliverable.hours}</span>
                          )}
                          {deliverable.costPerHour && (
                            <span>Rate: ₹{deliverable.costPerHour}/hr</span>
                          )}
                          {deliverable.assignedTo && (
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-1" />
                              <span>{deliverable.assignedTo.fullName}</span>
                            </div>
                          )}
                          {deliverable.deadline && (
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              <span>{new Date(deliverable.deadline).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => {
                              setEditingDeliverable(deliverable);
                              setIsModalOpen(true);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-500"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDeliverable(deliverable.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DeliverableModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDeliverable(null);
        }}
        onSubmit={editingDeliverable ? handleEditDeliverable : handleAddDeliverable}
        initialData={editingDeliverable}
      />
    </div>
  );
}