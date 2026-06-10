import React, { useState, useEffect, useRef } from "react";
import { useCommentStore } from "../store/commentStore";
import { Loader2, Send, Paperclip, X, Download, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/authStore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { uploadCommentFilesToGitHub } from "@/lib/githubComments";
import { useNotificationStore } from "../store/notificationStore";
import { Timestamp } from "firebase/firestore";
import { Project } from "@/store/projectStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

interface ProjectCommentsProps {
  projectId: string;
  projectData: Project;
}

export default function ProjectComments({ projectId,projectData }: ProjectCommentsProps) {
  const { comments, loading, fetchComments, addComment, fetchMoreComments, deleteComment } = useCommentStore();
  const { user, userData } = useAuthStore();
  const [newComment, setNewComment] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    if (projectId && userData?.role) {
      fetchComments(projectId);
    }
  }, [projectId, userData?.role, fetchComments]);

  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        setIsAdmin(userData?.role === "admin");
        setIsMember(userData?.role === "member");
      }
    };
    checkUserRole();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const attachments: { url: string; name: string; number: string }[] = [];

      // Upload files one by one
      if (selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          try {
            // Initialize progress for this file
            const newProgress = [...uploadProgress];
            newProgress[i] = 0;
            setUploadProgress(newProgress);

            // Upload single file
            const uploadedFiles = await uploadCommentFilesToGitHub([selectedFiles[i]], projectId, comments.length);

            // Update progress to 100%
            newProgress[i] = 100;
            setUploadProgress(newProgress);

            // Add to attachments
            if (uploadedFiles && uploadedFiles.length > 0) {
              const userRole = userData?.role as string;
              uploadedFiles.forEach((file) => {
                if (file && file.url && file.name) {
                  attachments.push({
                    url: file.url,
                    name: file.name,
                    number: userRole === 'admin' || userRole === 'member' ? `v${attachments.length + 1}` : `c${attachments.length + 1}`,
                  });
                }
              });
            }
          } catch (uploadError) {
            console.error("Failed to upload file:", uploadError);
            toast.error(`Failed to upload ${selectedFiles[i].name}`);
            return;
          }
        }
      }

      // Add the comment with attachment URLs and names
      await addComment(projectId, newComment, userData?.role as string, attachments);

      if(userData?.role !== "admin" && projectData){
        console.log("adding notification")
        await addNotification(
          `${userData?.fullName || 'User'} Commented on the project **${projectData.name}**`,
          `/dashboard/projects/${projectId}`,
          user?.uid as string
        );
      }

      setNewComment("");
      setSelectedFiles([]);
      setUploadProgress([]);
      toast.success("Comment added successfully");
    } catch (error) {
      console.error("Error in comment submission:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const validFiles = Array.from(files).filter((file) => {
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`File ${file.name} size should be less than 50MB`);
          return false;
        }

        const allowedTypes = [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/plain",
        ];

        if (!allowedTypes.includes(file.type)) {
          toast.error(
            `Invalid file type for ${file.name}. Please upload a PDF, image, or document.`
          );
          return false;
        }

        return true;
      });

      // Append new files to the existing selected files
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      setUploadProgress((prev) => [...prev, ...validFiles.map(() => 0)]);
    }
  };

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return date.toLocaleString();
  };

  const getRevisionNumber = (index: number) => {
    const commentsWithAttachments = comments.filter(
      (comment) => comment.attachments && comment.attachments.length > 0
    );
    const totalRevisions = commentsWithAttachments.length;

    // Find position of current comment in the filtered array
    const currentComment = comments[index];
    if (currentComment.attachments && currentComment.attachments.length > 0) {
      const position = commentsWithAttachments.findIndex(
        (comment) => comment.id === currentComment.id
      );
      return totalRevisions - position; // Reverse the order
    }
    return null;
  };

  const handleDownload = (url: string) => {
    window.open(url, "_blank");
  };

  const handleRemoveFile = (fileName: string) => {
    setSelectedFiles((prev) => prev.filter((file) => file.name !== fileName));
    setUploadProgress((prev) => {
      const index = selectedFiles.findIndex((file) => file.name === fileName);
      const newProgress = [...prev];
      newProgress.splice(index, 1);
      return newProgress;
    });
  };

  const handleShowMore = async () => {
    await fetchMoreComments(projectId); // Fetch next 5 comments
  };

  const handleDeleteComment = async (commentId: string) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      await deleteComment(commentId);
      toast.success('Comment deleted successfully');
    }
  };

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="border-b border-border bg-muted/50 px-6 py-3">
        <h3 className="text-lg font-medium text-foreground">Comments</h3>
      </div>

      <CardContent className="p-6">
        {/* Comment Form */}

        <form onSubmit={handleSubmit} className="mb-6">
          <div className="mb-4">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              rows={3}
            />
          </div>

          {selectedFiles.length > 0 && (
            <div className="mb-4 space-y-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={file.name}
                  className="flex items-center space-x-2 rounded bg-foreground p-2"
                >
                  <span className="text-sm text-background">{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleRemoveFile(file.name)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  {uploadProgress[index] > 0 && (
                    <div className="flex-1">
                      <Progress
                        value={uploadProgress[index]}
                        className="h-2.5 [&>div]:bg-green-600"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
            >
              <Paperclip className="h-4 w-4" />
              Attach Files
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              multiple
            />

            <Button
              type="submit"
              disabled={submitting || !newComment.trim()}
            >
              {submitting ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Post Comment
            </Button>
          </div>
        </form>

        {/* Comments List */}
        <div className="grid gap-3">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No comments yet</p>
          ) : (
            comments.map((comment, cmtIndex) => {

              const revisionNumber = getRevisionNumber(cmtIndex);

              return (
                <Card key={comment.id} size="sm" className="bg-muted/50">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-foreground font-medium text-background">
                            {comment.user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-3">
                          <CardTitle className="text-sm font-medium text-foreground">
                            {comment.user.name}
                            <span>
                              {(comment?.attachments?.length ?? 0) > 0 &&
                                ` - Revision ${revisionNumber}`}
                            </span>
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(comment.createdAt)}
                          </p>
                        </div>
                      </div>
                      {comment.user.id === user?.uid && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground whitespace-pre-wrap">
                      {comment.text}
                    </p>
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="mt-5 flex gap-3 flex-wrap">
                        {comment.attachments.map((attachment, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-foreground p-3 rounded-full w-fit gap-5"
                          >
                            <span className="text-sm text-background">
                              {attachment.name}
                            </span>
                            {(isAdmin || isMember || cmtIndex == 0) && (
                              <div className="flex space-x-3 flex-1">
                                <a
                                  target="_blank"
                                  href={
                                    !attachment.name
                                      .toLowerCase()
                                      .includes("png") &&
                                    !attachment.name
                                      .toLowerCase()
                                      .includes("jpg") &&
                                    !attachment.name
                                      .toLowerCase()
                                      .includes("jpeg")
                                      ? `https://docs.google.com/viewer?url=${encodeURIComponent(
                                          attachment.url
                                        )}&embedded=true`
                                      : attachment.url
                                  }
                                  className="text-background hover:text-background/80"
                                >
                                  <Eye className="h-4 w-4" />
                                </a>
                                <button
                                  onClick={() =>
                                    handleDownload(
                                      attachment.url,
                                    )
                                  }
                                  className="text-background hover:text-background/80"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Show More Button */}
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            onClick={() => handleShowMore()}
            disabled={loading}
          >
            Show More
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
