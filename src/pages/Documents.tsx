import { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Plus, Download, Trash2, ArrowLeft } from 'lucide-react';
import { useDocumentStore } from '../store/documentStore';
import DocumentForm from './DocumentForm';
import DocumentDetails from './DocumentDetails';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

const DocumentsList = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { documents, loading, fetchDocuments, deleteDocument, fetchDocument } = useDocumentStore();

  useEffect(() => {
    if (projectId) {
      fetchDocuments(projectId);
    }
  }, [projectId, fetchDocuments]);

  const handleDelete = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (!projectId) return;

    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        // First get the document to get the file name
        const doc = await fetchDocument(docId);
        if (doc && doc.fileName) {
          // Delete file from GitHub
          const projectDocPath = `documents/${projectId}/${doc.fileName}`;
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
            throw new Error('Failed to delete file from GitHub');
          }
        }
        
        // Then delete the document from the database
        await deleteDocument(docId);
        toast.success('Document deleted successfully');
      } catch (error) {
        console.error('Error deleting document:', error);
        toast.error('Failed to delete document');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate(`/dashboard/projects/${projectId}`)}
            className="hover:text-gray-600"
          >
            <ArrowLeft className="h-7 w-7" />
          </button>
          <h2 className="text-2xl font-bold">Documents</h2>
        </div>
        <button
          onClick={() => navigate("new")}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-black/90"
        >
          <Plus size={20} className="mr-2" />
          New Document
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No documents yet. Add your first one!</p>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enquiry Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medium</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  onClick={() => navigate(`${doc.id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">{doc.documentNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{doc.projectNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{doc.enquiryNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{doc.sentBy}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{new Date(doc.date).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize">{doc.medium}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-3">
                      <a
                        href={doc.fileUrl}
                        download={doc.fileName}
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Download size={18} />
                      </a>
                      <button
                        onClick={(e) => handleDelete(e, doc.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default function Documents() {
  return (
    <Routes>
      <Route path="/" element={<DocumentsList />} />
      <Route path="/new" element={<DocumentForm />} />
      <Route path="/:documentId" element={<DocumentDetails />} />
      <Route path="/:documentId/edit" element={<DocumentForm />} />
    </Routes>
  );
} 