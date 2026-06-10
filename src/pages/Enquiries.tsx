import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Plus, Loader2, Trash2, ExternalLink } from 'lucide-react';
import { useEnquiryStore, Enquiry } from '../store/enquiryStore';
import { useCustomerStore } from '../store/customerStore';
import toast from 'react-hot-toast';
import EnquiryForm from './EnquiryForm';
import EnquiryDetails from './EnquiryDetails';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface EnquiryWithCustomer extends Omit<Enquiry, 'customer'> {
  customerName?: string;
}

const statusBadgeClass = (status?: string) => {
  switch (status) {
    case 'cancelled':
      return 'bg-red-500 text-white';
    case 'moved to projects':
      return 'bg-green-500 text-white';
    case 'on hold':
      return 'bg-yellow-500 text-white';
    case 'under processing':
      return 'bg-blue-500 text-white';
    default:
      return '';
  }
};

const EnquiriesList = () => {
  const navigate = useNavigate();
  const { enquiries, loading, fetchEnquiries, deleteEnquiry } = useEnquiryStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const [enquiriesWithCustomer, setEnquiriesWithCustomer] = useState<EnquiryWithCustomer[]>([]);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchEnquiries(), fetchCustomers()]);
    };
    loadData();
  }, [fetchEnquiries, fetchCustomers]);

  useEffect(() => {
    if (enquiries && customers) {
      const enrichedEnquiries = enquiries.map(enquiry => ({
        ...enquiry,
        customerName: customers.find(c => c.id === enquiry.customer_id)?.name || 'N/A'
      }));
      setEnquiriesWithCustomer(enrichedEnquiries);
    }
  }, [enquiries, customers]);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this enquiry?")) {
      try {
        await deleteEnquiry(id);
        toast.success("Enquiry deleted successfully");
      } catch (error) {
        toast.error("Failed to delete enquiry");
        console.log(error);

      }
    }
  };

  const filteredEnquiries = enquiriesWithCustomer.filter(e => e.type === 'enquiry');

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-heading font-semibold">Enquiries</h2>
          <p className="text-muted-foreground">Track and manage incoming enquiries</p>
        </div>
        <Button onClick={() => navigate("new")}>
          <Plus size={20} />
          New Enquiry
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredEnquiries.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No enquiries yet</EmptyTitle>
            <EmptyDescription>Create your first one!</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="py-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Enquiry Number</TableHead>
                <TableHead className="text-center">Name</TableHead>
                <TableHead className="text-center">Customer</TableHead>
                <TableHead className="text-center">Created At</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEnquiries.map((enquiry) => (
                <TableRow
                  key={enquiry.id}
                  className="hover:cursor-pointer"
                >
                  <TableCell onClick={() => navigate(`${enquiry.id}`)} className="text-center text-muted-foreground">
                    E-{enquiry.enquiryNumber}
                  </TableCell>
                  <TableCell onClick={() => navigate(`${enquiry.id}`)} className="text-center font-medium">
                    {enquiry.name}
                  </TableCell>
                  <TableCell onClick={() => navigate(`${enquiry.id}`)} className="text-center text-muted-foreground">
                    {enquiry.customerName}
                  </TableCell>
                  <TableCell onClick={() => navigate(`${enquiry.id}`)} className="text-center text-muted-foreground">
                    {new Date(enquiry.createdAt).toLocaleDateString('en-GB')}
                  </TableCell>
                  <TableCell onClick={() => navigate(`${enquiry.id}`)} className="text-center">
                    {enquiry.status ? (
                      <Badge className={statusBadgeClass(enquiry.status)}>
                        {enquiry.status}
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`${enquiry.id}`)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink size={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(enquiry.id!)}
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

export default function Enquiries() {
  return (
    <Routes>
      <Route path="/" element={<EnquiriesList />} />
      <Route path="/new" element={<EnquiryForm />} />
      <Route path="/:id" element={<EnquiryDetails />} />
      <Route path="/:id/edit" element={<EnquiryForm />} />
    </Routes>
  );
}
