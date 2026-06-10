import { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Plus, Loader2, Trash2, ExternalLink, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCustomerStore } from '@/store/customerStore';
import CustomerForm from './CustomerForm';
import CustomerDetails from './CustomerDetails';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
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

// Customer list component
const CustomersList = () => {
  const navigate = useNavigate();
  const { customers, loading, fetchCustomers, deleteCustomer } = useCustomerStore();

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleDelete = async (email: string, id: string) => {

    // find the curresponding user based on this id from users collection and pass that id
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userId = querySnapshot.docs[0].id;
      // Now you can use the userId for deletion
      if (window.confirm('Are you sure you want to delete this customer?')) {
        try {

          // post request to backend to delete customer
          const response = await fetch(`https://ship-backend-black.vercel.app/api/deleteUser`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              uid: userId
             }),
          });
          if (response.status === 200) {
            await deleteCustomer(id);
            toast.success('Customer deleted successfully');
          } else {
            toast.error('Failed to delete customer');
          }

        } catch (error) {
          toast.error('Failed to delete customer');
          console.error(error);
        }
      }
    } else {
      // console.log('No user found with email:', email);
      deleteCustomer(id);
    }

  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-heading font-semibold">All Customers</h2>
          <p className="text-muted-foreground">Manage your customer accounts</p>
        </div>
        <Button onClick={() => navigate('new')}>
          <Plus size={20} />
          New Customer
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : customers.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No customers yet</EmptyTitle>
            <EmptyDescription>Create your first one!</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="py-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Name</TableHead>
                <TableHead className="text-center">Email</TableHead>
                <TableHead className="text-center">Phone</TableHead>
                <TableHead className="text-center">Contact Person</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map(customer => (
                <TableRow key={customer.id}>
                  <TableCell className="text-center font-medium">
                    {customer.name}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {customer.email}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {customer.contactPersons && customer.contactPersons.length > 0
                      ? customer.contactPersons[0].countryCode +" "+customer.contactPersons[0].phone
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {customer.contactPersons && customer.contactPersons.length > 0
                      ? customer.contactPersons[0].name
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`${customer.id}`)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink size={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`${customer.id}/edit`)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Edit size={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(customer.email, customer.id!)}
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

export default function Customers() {
  return (
    <Routes>
      <Route path="/" element={<CustomersList />} />
      <Route path="/new" element={<CustomerForm />} />
      <Route path="/:id" element={<CustomerDetails />} />
      <Route path="/:id/edit" element={<CustomerForm />} />
    </Routes>
  );
}
