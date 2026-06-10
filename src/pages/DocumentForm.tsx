import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocumentStore } from '../store/documentStore';
import toast from 'react-hot-toast';
import { uploadToGitHub } from '../lib/github';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

        await response.json();

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
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-6" />
          </Button>
          <h2 className="text-2xl font-heading font-semibold">
            {documentId ? "Edit Document" : "Add New Document"}
          </h2>
        </div>
        <div className="flex space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/dashboard/projects/${projectId}/documents`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                {documentId ? "Updating..." : "Creating..."}
              </>
            ) : documentId ? (
              "Update Document"
            ) : (
              "Create Document"
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 px-[10%]">
        <Card>
          <CardContent className="space-y-6 py-4">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label htmlFor="enquiryNumber">Enquiry Number</Label>
                <Input
                  id="enquiryNumber"
                  type="text"
                  value={formData.enquiryNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, enquiryNumber: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectNumber">Project Number</Label>
                <Input
                  id="projectNumber"
                  type="text"
                  value={formData.projectNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, projectNumber: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="documentNumber">Document Number</Label>
                <Input
                  id="documentNumber"
                  type="text"
                  value={formData.documentNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, documentNumber: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sentBy">Sent By</Label>
                <Input
                  id="sentBy"
                  type="text"
                  required
                  value={formData.sentBy}
                  onChange={(e) => setFormData(prev => ({ ...prev, sentBy: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="datetime-local"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Medium</Label>
                <Select
                  value={formData.medium}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, medium: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="physical">Physical</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="documentFile">Document File</Label>
                {formData.existingFileName ? (
                  <div className="mt-2 flex items-center space-x-4">
                    <span className="text-sm text-muted-foreground">{formData.existingFileName}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="text-destructive hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <Input
                    id="documentFile"
                    type="file"
                    onChange={handleFileChange}
                    required={!formData.existingFileName}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
