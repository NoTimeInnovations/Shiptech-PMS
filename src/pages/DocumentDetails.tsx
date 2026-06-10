import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocumentStore, Document } from '../store/documentStore';
import { Download, ArrowLeft, Edit, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-heading font-semibold">Document not found</h2>
          <Button
            variant="link"
            className="mt-4"
            onClick={() => navigate(`/project/${projectId}/documents`)}
          >
            Back to Documents
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate(`/dashboard/projects/${projectId}/documents`)}
        >
          <ArrowLeft size={20} />
          Back to Documents
        </Button>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate(`/dashboard/projects/${projectId}/documents/${documentId}/edit`)}
          >
            <Edit size={20} />
            Edit
          </Button>
          <Button asChild>
            <a href={document.fileUrl} download={document.fileName}>
              <Download size={20} />
              Download
            </a>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-heading font-semibold">Document Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Document Number</h3>
              <p className="mt-1 text-lg">{document.documentNumber}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Enquiry Number</h3>
              <p className="mt-1 text-lg">{document.enquiryNumber}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Project Number</h3>
              <p className="mt-1 text-lg">{document.projectNumber}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Sent By</h3>
              <p className="mt-1 text-lg">{document.sentBy}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Date</h3>
              <p className="mt-1 text-lg">{new Date(document.date).toLocaleString()}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Medium</h3>
              <p className="mt-1 text-lg capitalize">{document.medium}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">File Name</h3>
              <p className="mt-1 text-lg">{document.fileName}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Created At</h3>
              <p className="mt-1 text-lg">{new Date(document.createdAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Preview</h3>
            {document.fileUrl.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={document.fileUrl}
                className="w-full h-[600px] border border-border rounded-lg"
                title="Document Preview"
              />
            ) : (
              <div className="text-center p-4 bg-muted rounded-lg">
                <p>Preview not available for this file type</p>
                <a
                  href={document.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline mt-2 inline-block"
                >
                  Open file in new tab
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
