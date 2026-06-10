import { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Plus, Download, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { useDocumentStore } from '../store/documentStore';
import DocumentForm from './DocumentForm';
import DocumentDetails from './DocumentDetails';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';

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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/dashboard/projects/${projectId}`)}
          >
            <ArrowLeft className="h-7 w-7" />
          </Button>
          <div>
            <h2 className="text-2xl font-heading font-semibold">Documents</h2>
            <p className="text-muted-foreground">Project documents and files</p>
          </div>
        </div>
        <Button onClick={() => navigate("new")}>
          <Plus size={20} />
          New Document
        </Button>
      </div>

      {documents.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No documents yet</EmptyTitle>
            <EmptyDescription>Add your first one!</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="py-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Number</TableHead>
                <TableHead>Project Number</TableHead>
                <TableHead>Enquiry Number</TableHead>
                <TableHead>Sent By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Medium</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow
                  key={doc.id}
                  onClick={() => navigate(`${doc.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell>{doc.documentNumber}</TableCell>
                  <TableCell>{doc.projectNumber}</TableCell>
                  <TableCell>{doc.enquiryNumber}</TableCell>
                  <TableCell>{doc.sentBy}</TableCell>
                  <TableCell>{new Date(doc.date).toLocaleString()}</TableCell>
                  <TableCell className="capitalize">{doc.medium}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <a
                          href={doc.fileUrl}
                          download={doc.fileName}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download size={18} />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDelete(e, doc.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
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
