import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CustomerCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerEmail: string;
  customerName: string;
}

export default function CustomerCredentialsModal({
  isOpen,
  onClose,
  customerEmail,
  customerName,
}: CustomerCredentialsModalProps) {
  const generatedPassword = customerName.replace(/\s+/g, '_').toLowerCase() + '@123';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customer Credentials</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="customer-credentials-email">Email</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="customer-credentials-email"
                type="email"
                value={customerEmail}
                readOnly
                className="flex-1 bg-muted"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => copyToClipboard(customerEmail)}
              >
                Copy
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="customer-credentials-password">Password</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="customer-credentials-password"
                type="text"
                value={generatedPassword}
                readOnly
                className="flex-1 bg-muted"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => copyToClipboard(generatedPassword)}
              >
                Copy
              </Button>
            </div>
          </div>

          {/* url for customer login */}
          <div className="space-y-1.5">
            <Label htmlFor="customer-credentials-url">Login URL</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="customer-credentials-url"
                type="text"
                value={`${import.meta.env.VITE_MAIN_URL}/customer_login`}
                readOnly
                className="flex-1 bg-muted"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => copyToClipboard(`${import.meta.env.VITE_MAIN_URL}/customer_login`)}
              >
                Copy
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
