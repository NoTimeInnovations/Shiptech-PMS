import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Image,
  Building,
  MapPin,
  FileText,
  User,
  Mail,
} from "lucide-react";
import { useCustomerStore, Customer } from "@/store/customerStore";
import toast from "react-hot-toast";
import { useProjectStore } from "@/store/projectStore";
import { auth } from "@/lib/firebase";

export default function CustomerViewingDetails() {
  const navigate = useNavigate();
  const { fetchCustomerByUserId, loading } = useCustomerStore();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const { projects, fetchProjects } = useProjectStore();

  useEffect(() => {
    const loadCustomerData = async () => {
      const user = auth.currentUser;
      if (user) {
        const customerData = await fetchCustomerByUserId(user.uid);
        if (customerData) {
          setCustomer(customerData);
          await fetchProjects();
        } else {
          toast.error("Customer not found");
          navigate("/customer");
        }
      } else {
        toast.error("User not authenticated");
        navigate("/customer_login");
      }
    };

    loadCustomerData();
  }, [fetchCustomerByUserId, fetchProjects, navigate]);

  // Filter projects for this customer
  const customerProjects = projects.filter(
    project => project.customer?.id === customer?.id
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <div className="bg-white shadow-md rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-700">Customer not found</h2>
          <button
            onClick={() => navigate("/customer")}
            className="mt-4 px-4 py-2 bg-black/90 text-white rounded-md hover:bg-black/80"
          >
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen" style={{ width: '70%', margin: '0 auto' }}>
      {/* Customer Information Card */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <div className="flex items-center space-x-4">
              {customer.logoUrl ? (
                <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                  <img
                    src={customer.logoUrl}
                    alt={`${customer.name} logo`}
                    className="h-14 w-14 object-contain"
                  />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Image className="h-8 w-8 text-white" />
                </div>
              )}
              <div>
                <h2 className="text-3xl font-bold">{customer.name}</h2>
                <p className="mt-1 text-blue-100">
                  {customer.endClient ? `End Client: ${customer.endClient}` : "No end client specified"}
                </p>
              </div>
            </div>
            <div className="mt-4 md:mt-0 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg">
              <p className="font-medium">GST: {customer.gstNumber || "Not provided"}</p>
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Contact Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <User className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium text-gray-700">Contact Persons</p>
                    {customer.contactPersons && customer.contactPersons.length > 0 ? (
                      <div className="space-y-2">
                        {customer.contactPersons.map((contact, index) => (
                          <div key={index} className="text-gray-600">
                            <span className="font-medium">{contact.name}</span> - {contact.phone}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">Not specified</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start">
                  <Mail className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium text-gray-700">Email</p>
                    <p className="text-gray-600">{customer.email}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Briefcase className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium text-gray-700">End Client</p>
                    <p className="text-gray-600">{customer.endClient || "Not specified"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Address Information</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <Building className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium text-gray-700">Company Name</p>
                    <p className="text-gray-600">{customer.name}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium text-gray-700">Address</p>
                    <p className="text-gray-600 whitespace-pre-line">{customer.address}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <FileText className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium text-gray-700">Billing Address</p>
                    <p className="text-gray-600 whitespace-pre-line">{customer.billingAddress || "Same as address"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="mt-8">
        <div className="bg-white rounded-xl border-[1px] overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-3">
            <h3 className="text-lg font-medium text-gray-900">Projects</h3>
          </div>
          <div className="px-6 py-4">
            {customerProjects.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No projects found for this customer</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customerProjects.map((project) => (
                      <tr 
                        key={project.id}
                        onClick={() => navigate(`/customer/projects/${project.id}`)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">p-{project.projectNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{project.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${project.status === 'completed' ? 'bg-green-100 text-green-800' : 
                            project.status === 'ongoing' ? 'bg-blue-100 text-blue-800' : 
                            'bg-gray-100 text-gray-800'}`}>
                            {project.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {project.project_start_date ? new Date(project.project_start_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {project.project_due_date ? new Date(project.project_due_date).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 