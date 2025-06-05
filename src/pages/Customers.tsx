import { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Plus, Loader2, Trash2, ExternalLink, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCustomerStore } from '@/store/customerStore';
import CustomerForm from './CustomerForm';
import CustomerDetails from './CustomerDetails';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

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
        <h2 className="text-2xl font-bold">All Customers</h2>
        <button
          onClick={() => navigate('new')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black/90 hover:bg-black/80"
        >
          <Plus size={20} className="mr-2" />
          New Customer
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No customers yet. Create your first one!</p>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
        
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Person
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map(customer => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                    {customer.name}
                  </td>
                 

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {customer.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {customer.contactPersons && customer.contactPersons.length > 0 
                      ? customer.contactPersons[0].countryCode +" "+customer.contactPersons[0].phone 
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {customer.contactPersons && customer.contactPersons.length > 0 
                      ? customer.contactPersons[0].name 
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-center space-x-3">
                      <button
                        onClick={() => navigate(`${customer.id}`)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <ExternalLink size={18} />
                      </button>
                      <button
                        onClick={() => navigate(`${customer.id}/edit`)}
                        className="text-green-600 hover:text-green-900"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(customer.email, customer.id!)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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