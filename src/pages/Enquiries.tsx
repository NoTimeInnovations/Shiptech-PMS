import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Plus, Loader2, Trash2, ExternalLink } from 'lucide-react';
import { useEnquiryStore, Enquiry } from '../store/enquiryStore';
import { useCustomerStore } from '../store/customerStore';
import toast from 'react-hot-toast';
import EnquiryForm from './EnquiryForm';
import EnquiryDetails from './EnquiryDetails';

interface EnquiryWithCustomer extends Omit<Enquiry, 'customer'> {
  customerName?: string;
}

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
        <h2 className="text-2xl font-bold">Enquiries</h2>
        <button
          onClick={() => navigate("new")}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black/90 hover:bg-black/80"
        >
          <Plus size={20} className="mr-2" />
          New Enquiry
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : filteredEnquiries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            No enquiries yet. Create your first one!
          </p>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 overflow-x-auto">
            <thead className="bg-gray-50 text-center">
              <tr>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enquiry Number
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>

                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEnquiries.map((enquiry) => (
                <tr
                  key={enquiry.id}
                  className="hover:bg-gray-50 hover:cursor-pointer"
                >
                  <td onClick={() => navigate(`${enquiry.id}`)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    E-{enquiry.enquiryNumber}
                  </td>
                  <td onClick={() => navigate(`${enquiry.id}`)} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                    {enquiry.name}
                  </td>
                  <td onClick={() => navigate(`${enquiry.id}`)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {enquiry.customerName}
                  </td>
                  <td onClick={() => navigate(`${enquiry.id}`)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {new Date(enquiry.createdAt).toLocaleDateString('en-GB')}
                  </td>
                  <td onClick={() => navigate(`${enquiry.id}`)}
                    className={`px-6 py-4 whitespace-nowrap text-sm text-white text-center flex justify-center`}
                  >
                    <div
                      className={`px-3 py-2 whitespace-nowrap text-sm text-white w-max rounded-sm ${
                        enquiry.status === "cancelled"
                          ? "bg-red-500"
                          : enquiry.status === "moved to projects"
                          ? "bg-green-500"
                          : enquiry.status === "on hold"
                          ? "bg-yellow-500"
                          : enquiry.status==="under processing"
                          ? "bg-blue-500"
                          : ""
                      }`}
                    >
                      {enquiry.status || ""}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                    <div className="flex items-center justify-center space-x-3">
                      <button
                        onClick={() => navigate(`${enquiry.id}`)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <ExternalLink size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(enquiry.id!)}
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
