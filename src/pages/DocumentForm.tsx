import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocumentStore } from '../store/documentStore';
// import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';
// import { Loader2 } from 'lucide-react';
import { uploadToGitHub } from '../lib/github';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';

export default function DocumentForm() {
  const { projectId, documentId } = useParams<{ projectId: string; documentId: string }>();
  const navigate = useNavigate();
  const { createDocument, fetchDocument, updateDocument, loading } = useDocumentStore();
  const { project } = useProjectStore();

  const [formData, setFormData] = useState({
    enquiryNumber: '',
    projectNumber: '',
    documentNumber: '',
    sentBy: '',
    date: '',
    medium: 'email',
    file: null as File | null,
    existingFileName: '',
    existingFileUrl: '',
  });

  useEffect(() => {
    const loadDocument = async () => {
      if (documentId) {
        try {
          const doc = await fetchDocument(documentId);
          if (doc) {
            const updatedFormData = {
              enquiryNumber: doc.enquiryNumber || '',
              projectNumber: doc.projectNumber || '',
              documentNumber: doc.documentNumber || '',
              sentBy: doc.sentBy || '',
              date: doc.date || '',
              medium: doc.medium || 'email',
              file: null,
              existingFileName: doc.fileName || '',
              existingFileUrl: doc.fileUrl || '',
            };
            setFormData(updatedFormData);
          }
        } catch (error) {
          toast.error('Failed to load document');
          console.error('Error loading document:', error);
        }
      } else if (project) {
        // Set project number from project info instead of URL parameter
        setFormData(prev => ({ ...prev, projectNumber: project.projectNumber || '' }));
      }
    };

    loadDocument();
  }, [documentId, project, fetchDocument]);

  // Add a separate useEffect to monitor formData changes
  // useEffect(() => {
  //   console.log("Form data changed:", formData);
  // }, [formData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, file: e.target.files![0] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    try {
      if (documentId) {
        const updateData = {
          enquiryNumber: formData.enquiryNumber,
          projectNumber: formData.projectNumber,
          documentNumber: formData.documentNumber,
          sentBy: formData.sentBy,
          date: formData.date,
          medium: formData.medium as 'email' | 'physical' | 'other',
          fileName: formData.file ? formData.file.name : formData.existingFileName,
          fileUrl: formData.existingFileUrl,
        };
        
        if (formData.file) {
          const path = `documents/${projectId}/${formData.file.name}`;
          // console.log("Uploading new file to path:", path);
          const fileUrl = await uploadToGitHub(formData.file, path);
          if (!fileUrl) throw new Error('Failed to upload file');
          updateData.fileUrl = fileUrl;
        }

        await updateDocument(documentId, updateData);
        toast.success('Document updated successfully');
      } else {
        // Handle create
        if (!formData.file) return;
        
        const path = `documents/${projectId}/${formData.file.name}`;
        // console.log("Uploading new file to path:", path);
        const fileUrl = await uploadToGitHub(formData.file, path);
        if (!fileUrl) throw new Error('Failed to upload file');

        await createDocument({
          projectId,
          enquiryNumber: formData.enquiryNumber,
          projectNumber: formData.projectNumber,
          documentNumber: formData.documentNumber,
          sentBy: formData.sentBy,
          date: formData.date,
          medium: formData.medium as 'email' | 'physical' | 'other',
          fileUrl,
          fileName: formData.file.name
        });
        toast.success('Document added successfully');
      }

      navigate(`/dashboard/projects/${projectId}/documents`);
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error(documentId ? 'Failed to update document' : 'Failed to add document');
    }
  };

  const handleRemoveFile = async () => {
    try {
      if (formData.existingFileName && projectId) {
        const projectDocPath = `documents/${projectId}/${formData.existingFileName}`;
        // console.log("Attempting to delete file:", projectDocPath);
        
        const response = await fetch('https://ship-backend-black.vercel.app/api/delete-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            path: projectDocPath.replace(/\\/g, '/')
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to delete file: ${response.statusText}`);
        }

        const result = await response.json();
        // console.log("File deletion result:", result);

        // Only clear the form data after successful deletion
        setFormData(prev => ({ 
          ...prev, 
          existingFileName: '', 
          existingFileUrl: '' 
        }));
        
        toast.success('File removed successfully');
      }
    } catch (error) {
      console.error("Error removing file:", error);
      toast.error('Failed to remove file');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button type="button" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-7 w-7" />
          </button>
          <h2 className="text-2xl font-bold">
            {documentId ? "Edit Document" : "Add New Document"}
          </h2>
        </div>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => navigate(`/dashboard/projects/${projectId}/documents`)}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black/90 hover:bg-black/80 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                {documentId ? "Updating..." : "Creating..."}
              </>
            ) : documentId ? (
              "Update Document"
            ) : (
              "Create Document"
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-3 px-[10%]">
        <div className="space-y-6 bg-white border-[1px] rounded-xl px-6 py-10">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Enquiry Number
              </label>
              <input
                type="text"
                value={formData.enquiryNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, enquiryNumber: e.target.value }))}
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Project Number
              </label>
              <input
                type="text"
                value={formData.projectNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, projectNumber: e.target.value }))}
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Document Number
              </label>
              <input
                type="text"
                value={formData.documentNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, documentNumber: e.target.value }))}
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Sent By
              </label>
              <input
                type="text"
                required
                value={formData.sentBy}
                onChange={(e) => setFormData(prev => ({ ...prev, sentBy: e.target.value }))}
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                type="datetime-local"
                required
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Medium
              </label>
              <select
                value={formData.medium}
                onChange={(e) => setFormData(prev => ({ ...prev, medium: e.target.value }))}
                className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="email">Email</option>
                <option value="physical">Physical</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Document File
              </label>
              {formData.existingFileName ? (
                <div className="mt-2 flex items-center space-x-4">
                  <span className="text-sm text-gray-500">{formData.existingFileName}</span>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-black/90 file:text-white
                    hover:file:bg-black/80"
                  required={!formData.existingFileName}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
} 