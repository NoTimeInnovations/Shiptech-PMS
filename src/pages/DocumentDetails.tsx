import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocumentStore, Document } from '../store/documentStore';
import { Download, ArrowLeft, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DocumentDetails() {
  const { projectId, documentId } = useParams<{ projectId: string; documentId: string }>();
  const navigate = useNavigate();
  const { fetchDocument } = useDocumentStore();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDocument = async () => {
      if (documentId) {
        try {
          const doc = await fetchDocument(documentId);
          setDocument(doc);
        } catch (error) {
          toast.error('Failed to load document');
          console.error(error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadDocument();
  }, [documentId, fetchDocument]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Document not found</h2>
          <button
            onClick={() => navigate(`/project/${projectId}/documents`)}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Back to Documents
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(`/dashboard/projects/${projectId}/documents`)}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="mr-2" size={20} />
          Back to Documents
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/dashboard/projects/${projectId}/documents/${documentId}/edit`)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            <Edit size={20} />
            Edit
          </button>
          <a
            href={document.fileUrl}
            download={document.fileName}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-black/90"
          >
            <Download size={20} />
            Download
          </a>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Document Details</h1>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Document Number</h3>
            <p className="mt-1 text-lg">{document.documentNumber}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Enquiry Number</h3>
            <p className="mt-1 text-lg">{document.enquiryNumber}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Project Number</h3>
            <p className="mt-1 text-lg">{document.projectNumber}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Sent By</h3>
            <p className="mt-1 text-lg">{document.sentBy}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Date</h3>
            <p className="mt-1 text-lg">{new Date(document.date).toLocaleString()}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Medium</h3>
            <p className="mt-1 text-lg capitalize">{document.medium}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">File Name</h3>
            <p className="mt-1 text-lg">{document.fileName}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Created At</h3>
            <p className="mt-1 text-lg">{new Date(document.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Preview</h3>
          {document.fileUrl.toLowerCase().endsWith('.pdf') ? (
            <iframe
              src={document.fileUrl}
              className="w-full h-[600px] border border-gray-200 rounded-lg"
              title="Document Preview"
            />
          ) : (
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p>Preview not available for this file type</p>
              <a
                href={document.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 mt-2 inline-block"
              >
                Open file in new tab
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 