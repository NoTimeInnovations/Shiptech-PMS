import { create } from 'zustand';
import { doc, getDoc, setDoc, collection, addDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

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
    role?: string;  // Add role to user info
  };
  attachments?: Attachment[]; // Array of attachment objects (URL + name + number)
  createdAt: string;
}

interface ProjectComments {
  projectId: string;
  comments: Comment[];
}

interface CommentState {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  fetchComments: (projectId: string, userRole?: string) => Promise<void>;
  addComment: (projectId: string, text: string, userRole: string, attachments?: Attachment[]) => Promise<void>;
}

export const useCommentStore = create<CommentState>((set, get) => ({
  comments: [],
  loading: false,
  error: null,

  fetchComments: async (projectId: string, userRole?: string) => {
    try {
      set({ loading: true, error: null });
      const commentsRef = collection(db, 'project_comments', projectId, 'comments');
      const commentsSnapshot = await getDocs(commentsRef);

      const comments: Comment[] = commentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Comment[];

      // Order comments by createdAt in descending order
      comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // If user is a member, filter out customer comments
      if (userRole === 'member') {
        set({
          comments: comments.filter(comment => comment.user.role !== 'customer'),
          loading: false,
        });
      } else {
        set({
          comments,
          loading: false,
        });
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  addComment: async (projectId: string, text: string, userRole: string, attachments: Attachment[] = []) => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      // Determine the latest attachment number for admin/member and customer
      const commentsRef = collection(db, 'project_comments', projectId, 'comments');
      const commentsSnapshot = await getDocs(commentsRef);
      const existingComments = commentsSnapshot.docs.map(doc => doc.data() as Comment);

      let adminMemberAttachmentCount = 0;
      let customerAttachmentCount = 0;

      existingComments.forEach(comment => {
        if (comment.attachments) {
          comment.attachments.forEach(attachment => {
            if (comment.user.role === 'admin' || comment.user.role === 'member') {
              if (attachment.number.startsWith('v')) {
                const number = parseInt(attachment.number.slice(1), 10);
                if (number > adminMemberAttachmentCount) {
                  adminMemberAttachmentCount = number;
                }
              }
            } else if (comment.user.role === 'customer') {
              if (attachment.number.startsWith('c')) {
                const number = parseInt(attachment.number.slice(1), 10);
                if (number > customerAttachmentCount) {
                  customerAttachmentCount = number;
                }
              }
            }
          });
        }
      });

      // Create new comment object
      const newComment: Comment = {
        id: crypto.randomUUID(),
        text,
        user: {
          id: currentUser.uid,
          name: currentUser.email || 'Anonymous',
          role: userRole,  // Include user role in comment
        },
        attachments: attachments.map((attachment, index) => ({
          ...attachment,
          number: userRole === 'admin' || userRole === 'member' ? `v${adminMemberAttachmentCount + index + 1}` : `c${customerAttachmentCount + index + 1}`,
        })),
        createdAt: new Date().toISOString(),
      };

      // Add the new comment as a document in the Firestore collection
      await addDoc(collection(db, 'project_comments', projectId, 'comments'), newComment);

      // Update local state
      set(state => ({
        comments: [newComment, ...state.comments],
        loading: false,
        error: null,
      }));
    } catch (error) {
      console.error('Error adding comment:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },
}));