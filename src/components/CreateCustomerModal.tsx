import { useState, useEffect } from 'react';
import { Loader2, Copy } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

interface CustomerCredentials {
  email: string;
  fullName: string;
  password: string;
}

interface ExistingCustomer {
  id: string;
  email: string;
  fullName: string;
}

export default function CreateCustomerModal({ isOpen, onClose, projectId }: CreateCustomerModalProps) {
  const [loading, setLoading] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<CustomerCredentials | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<CustomerCredentials | null>(null);
  const [existingCustomer, setExistingCustomer] = useState<ExistingCustomer | null>(null);
  const [showConfirmNewCustomer, setShowConfirmNewCustomer] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);

  const generateRandomString = (length: number) => {
    const chars = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const generateCredentials = () => {
    const randomString = generateRandomString(4);
    setGeneratedCredentials({
      email: `shiptech-${randomString}@gmail.com`,
      fullName: `ShipTech ${randomString}`,
      password: '123456'
    });
  };

  const checkExistingCustomer = async () => {
    try {
      setCheckingExisting(true);
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('projectId', '==', projectId),
        where('role', '==', 'customer')
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const customerDoc = querySnapshot.docs[0];
        setExistingCustomer({
          id: customerDoc.id,
          email: customerDoc.data().email,
          fullName: customerDoc.data().fullName
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking existing customer:', error);
      toast.error('Failed to check existing customer');
      return false;
    } finally {
      setCheckingExisting(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!generatedCredentials) return;

    try {
      setLoading(true);
      // Create user in Firebase Auth
      const { user } = await createUserWithEmailAndPassword(
        auth,
        generatedCredentials.email,
        generatedCredentials.password
      );

      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        fullName: generatedCredentials.fullName,
        email: generatedCredentials.email,
        role: 'customer',
        createdAt: new Date().toISOString(),
        verified: true,
        projectId
      });

      setCreatedCredentials(generatedCredentials);
      setGeneratedCredentials(null);
      setShowConfirmNewCustomer(false);
      toast.success('Customer account created successfully');
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Failed to create customer account');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleClose = () => {
    setGeneratedCredentials(null);
    setCreatedCredentials(null);
    setExistingCustomer(null);
    setShowConfirmNewCustomer(false);
    onClose();
  };

  useEffect(() => {
    const initializeModal = async () => {
      if (isOpen) {
        const hasExisting = await checkExistingCustomer();
        if (!hasExisting) {
          generateCredentials();
        }
      }
    };

    initializeModal();
  }, [isOpen, projectId]);

  if (checkingExisting) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader className="sr-only">
            <DialogTitle>Create Customer Account</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Customer Account</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {existingCustomer && !showConfirmNewCustomer && !createdCredentials ? (
            // Show existing customer info
            <div className="space-y-4">
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
                <h3 className="mb-2 font-medium text-yellow-800">Existing Customer Found</h3>
                <p className="mb-4 text-sm text-yellow-700">
                  This project already has a customer account:
                </p>
                <div className="space-y-3">
                  <div className="rounded border border-yellow-200 bg-card p-3">
                    <p className="text-xs text-muted-foreground">Full Name</p>
                    <p className="font-medium">{existingCustomer.fullName}</p>
                  </div>
                  <div className="rounded border border-yellow-200 bg-card p-3">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{existingCustomer.email}</p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  className="bg-yellow-600 text-white hover:bg-yellow-700"
                  onClick={() => {
                    setShowConfirmNewCustomer(true);
                    generateCredentials();
                  }}
                >
                  Create Another Account
                </Button>
              </DialogFooter>
            </div>
          ) : createdCredentials ? (
            // Show created account details
            <div className="space-y-4">
              <div className="rounded-md border border-green-200 bg-green-50 p-4">
                <h3 className="mb-2 font-medium text-green-800">Account Created Successfully!</h3>
                <p className="mb-4 text-sm text-green-700">
                  Please save these credentials before closing:
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded border border-green-200 bg-card p-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Full Name</p>
                      <p className="font-medium">{createdCredentials.fullName}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-green-700 hover:bg-green-50"
                      onClick={() => copyToClipboard(createdCredentials.fullName)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between rounded border border-green-200 bg-card p-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium">{createdCredentials.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-green-700 hover:bg-green-50"
                      onClick={() => copyToClipboard(createdCredentials.email)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between rounded border border-green-200 bg-card p-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Password</p>
                      <p className="font-medium">{createdCredentials.password}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-green-700 hover:bg-green-50"
                      onClick={() => copyToClipboard(createdCredentials.password)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleClose}
              >
                Close
              </Button>
            </div>
          ) : generatedCredentials ? (
            // Show credentials for confirmation
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-medium text-foreground/70">Review Customer Account Details</h3>
                {showConfirmNewCustomer && (
                  <p className="mb-4 text-sm text-destructive">
                    Warning: You are creating an additional customer account for this project.
                  </p>
                )}
                <p className="mb-4 text-sm text-foreground/70">
                  Please review the following credentials before creating the account:
                </p>
                <div className="space-y-3">
                  <div className="rounded border border-blue-200 bg-card p-3">
                    <p className="text-xs text-muted-foreground">Full Name</p>
                    <p className="font-medium">{generatedCredentials.fullName}</p>
                  </div>
                  <div className="rounded border border-blue-200 bg-card p-3">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{generatedCredentials.email}</p>
                  </div>
                  <div className="rounded border border-blue-200 bg-card p-3">
                    <p className="text-xs text-muted-foreground">Password</p>
                    <p className="font-medium">{generatedCredentials.password}</p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setGeneratedCredentials(null);
                    generateCredentials();
                  }}
                >
                  Generate New
                </Button>
                <Button onClick={handleCreateCustomer} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Confirm & Create'
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
