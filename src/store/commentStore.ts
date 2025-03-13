import { create } from "zustand";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  query,
  limit,
  QueryDocumentSnapshot,
  DocumentData,
  orderBy,
  startAfter,
  deleteDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";

interface Attachment {
  url: string;
  name: string;
  number: string; // Add number to attachment
}

interface Comment {
  id: string;
  text: string;
  user: {
    id: string;
    name: string;
    role?: string; // Add role to user info
  };
  attachments?: Attachment[]; // Array of attachment objects (URL + name + number)
  createdAt: Timestamp;
  project_id: string; // Add project_id to the comment
}

interface ProjectComments {
  projectId: string;
  comments: Comment[];
}

interface CommentState {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  commentsCount: number; // New state variable for tracking fetched pages
  lastVisible: QueryDocumentSnapshot<DocumentData> | null; // Allow lastVisible to be null
  fetchComments: (projectId: string) => Promise<void>; // Updated to only take projectId
  fetchMoreComments: (projectId: string) => Promise<void>; // Updated to only take projectId
  addComment: (projectId: string, text: string, userRole: string, attachments?: Attachment[]) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>; // Updated to only take commentId
}

export const useCommentStore = create<CommentState>((set, get) => ({
  comments: [],
  loading: false,
  error: null,
  commentsCount: 0,
  lastVisible: null,

  fetchComments: async (projectId: string) => {
    try {
      set({ loading: true, error: null });
      const commentsRef = collection(db, "project_comments");
      const commentsQuery = query(
        commentsRef,
        where("project_id", "==", projectId),
        orderBy("createdAt", "desc"),
        limit(5)
      );

      const commentsSnapshot = await getDocs(commentsQuery);
      let lastVisibleTemp: QueryDocumentSnapshot<DocumentData> | null = null;

      if (!commentsSnapshot.empty) {
        lastVisibleTemp = commentsSnapshot.docs[commentsSnapshot.docs.length - 1]; // Store last document
      }

      // Extract data to match Comment type
      const comments: Comment[] = commentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Comment[]; // Ensure the data is cast to Comment type

      // Set lastVisible to the last comment if it exists
      set({ lastVisible: lastVisibleTemp });

      set({
        comments,
        loading: false,
        commentsCount: comments.length, // Set commentsCount to the number of fetched comments
      });
    } catch (error) {
      console.error("Error fetching comments:", error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchMoreComments: async (projectId: string) => {
    try {
      const { lastVisible, comments } = get();
      if (!lastVisible) return; // If there's no lastVisible, do nothing

      const commentsRef = collection(db, "project_comments");
      const commentsQuery = query(
        commentsRef,
        where("project_id", "==", projectId),
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(5)
      );

      const commentsSnapshot = await getDocs(commentsQuery);
      let newLastVisible: QueryDocumentSnapshot<DocumentData> | null = null;

      if (!commentsSnapshot.empty) {
        newLastVisible = commentsSnapshot.docs[commentsSnapshot.docs.length - 1]; // Store new last document
      }

      // Extract new comments and ensure they are cast to Comment type
      const newComments: Comment[] = commentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Comment[];

      // Filter out duplicates before updating state
      const uniqueNewComments = newComments.filter(
        (newComment) => !comments.some((existingComment) => existingComment.id === newComment.id)
      );

      // Update state with unique new comments and lastVisible
      set((state) => ({
        comments: [...state.comments, ...uniqueNewComments],
        lastVisible: newLastVisible,
      }));
    } catch (error) {
      console.error("Error fetching more comments:", error);
      set({ error: (error as Error).message });
    }
  },

  addComment: async (projectId: string, text: string, userRole: string, attachments: Attachment[] = []) => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("User not authenticated");

      const newComment: Omit<Comment, 'id'> = { // Use Omit to exclude 'id' from the type
        text,
        user: {
          id: currentUser.uid,
          name: currentUser.email || "Anonymous",
          role: userRole, // Include user role in comment
        },
        attachments: attachments.length > 0 ? attachments : [], // Set to empty array if no attachments
        createdAt: Timestamp.now(), // Use Firestore's Timestamp
        project_id: projectId, // Set project_id for the comment
      };

      // Add the new comment as a document in the Firestore collection
      const docRef = await addDoc(collection(db, "project_comments"), newComment);

      // Update local state with the new comment including the generated id
      set((state) => ({
        comments: [{ id: docRef.id, ...newComment }, ...state.comments], // Include the generated id
        loading: false,
        error: null,
      }));
    } catch (error) {
      console.error("Error adding comment:", error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  deleteComment: async (commentId: string) => {
    try {
      const { comments } = get();
      const commentToDelete = comments.find(comment => comment.id === commentId);

      if (commentToDelete) {
        let attachmentsDeleted = true;

        // Delete attachments from GitHub if they exist
        if (commentToDelete.attachments) {
          for (const attachment of commentToDelete.attachments) {
            const projectDocPath = attachment.url.split("raw.githubusercontent.com/NoTimeInnovations/shiptech-data/main/")[1];
            try {
              const response = await fetch('https://ship-backend-black.vercel.app/api/delete-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: projectDocPath }),
              });

              if (!response.ok) {
                console.warn("Failed to delete attachment from GitHub:", attachment.url);
                attachmentsDeleted = false;
              }
            } catch (error) {
              console.warn("Attachment deletion failed:", error);
              attachmentsDeleted = false;
            }
          }
        }

        // Correct Firestore path for comment document
        const commentRef = doc(db, "project_comments", commentId);
        if (attachmentsDeleted) {
          await deleteDoc(commentRef);
          set((state) => ({
            comments: state.comments.filter(comment => comment.id !== commentId),
          }));
        } else {
          console.warn("Comment not deleted because attachments could not be deleted.");
        }
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      set({ error: (error as Error).message });
    }
  },
}));
