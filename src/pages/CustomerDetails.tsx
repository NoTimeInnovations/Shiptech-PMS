import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Building,
  Mail,
  User,
  MapPin,
  FileText,
  Briefcase,
  FileQuestion,
  ArrowRight,
  Check,

  TruckIcon,
  Phone,
} from "lucide-react";
import { useCustomerStore, Customer } from "@/store/customerStore";
import toast from "react-hot-toast";
import { Image } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { useEnquiryStore } from "@/store/enquiryStore";
import CustomerSettlementModal from "@/components/CustomerSettlementModal";

export default function CustomerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchCustomer, deleteCustomer, loading } =
    useCustomerStore();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const { projects, fetchProjects } = useProjectStore();
  const { enquiries, fetchEnquiries } = useEnquiryStore();
  const [isSettlementModalOpen, setSettlementModalOpen] = useState(false);

  useEffect(() => {
    const loadCustomerData = async () => {
      if (id) {
        const customerData = await fetchCustomer(id);
        setCustomer(customerData);
        
        // Fetch all projects and enquiries
        await fetchProjects();
        await fetchEnquiries();
      }
    };

    loadCustomerData();
  }, [id, fetchCustomer, fetchProjects, fetchEnquiries]);

  // Filter projects and enquiries for this customer
  const customerProjects = projects.filter(
    project => project.customer_id === id
  );

  const customerEnquiries = enquiries.filter(
    enquiry => enquiry.customer_id === id
  );

  // Calculate statistics
  const totalProjects = customerProjects.length;
  const totalEnquiries = customerEnquiries.length;
  const enquiriesMovedToProjects = customerEnquiries.filter(
    enquiry => enquiry.status === 'moved to projects'
  ).length;

  const handleDelete = async () => {
    if (!customer?.id) return;

    if (window.confirm("Are you sure you want to delete this customer?")) {
      try {
        await deleteCustomer(customer.id);
        toast.success("Customer deleted successfully");
        navigate("/dashboard/customers");
      } catch (error) {
        toast.error("Failed to delete customer");
        console.error("Error deleting customer:", error);
      }
    }
  };

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
          <h2 className="text-xl font-semibold text-gray-700">
            Customer not found
          </h2>
          <button
            onClick={() => navigate("/dashboard/customers")}
            className="mt-4 px-4 py-2 bg-black/90 text-white rounded-md hover:bg-black/80"
          >
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen">

      <CustomerSettlementModal isOpen={isSettlementModalOpen} setOpen={setSettlementModalOpen} projects={customerProjects} customer={customer} enquiries={customerEnquiries} />

      {/* Header with back button and actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/dashboard/customers")}
            className="p-2 rounded-full hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Customer Details</h1>
        </div>
        <div className="flex space-x-3">
        <button
            onClick={() => setSettlementModalOpen(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <Check size={18} className="mr-2" />
            Settle
          </button>
          <button
            onClick={() => navigate(`/dashboard/customers/${id}/edit`)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Edit size={18} className="mr-2" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            <Trash2 size={18} className="mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Projects Card */}
        <div className="bg-gradient-to-br from-blue-300 to-blue-400 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-black">Total Projects</p>
              <p className="mt-2 text-3xl font-semibold text-black">{totalProjects}</p>
            </div>
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
              <Briefcase className="h-6 w-6 text-black" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-black">
              Active projects with this customer
            </div>
          </div>
        </div>

        {/* Total Enquiries Card */}
        <div className="bg-yellow-300 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-black">Total Enquiries</p>
              <p className="mt-2 text-3xl font-semibold text-black">{totalEnquiries}</p>
            </div>
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
              <FileQuestion className="h-6 w-6 text-black" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-black">
              All enquiries from this customer
            </div>
          </div>
        </div>

        {/* Converted Enquiries Card */}
        <div className="bg-gradient-to-br from-green-300 to-green-400 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-black">Converted to Projects</p>
              <p className="mt-2 text-3xl font-semibold text-black">{enquiriesMovedToProjects}</p>
            </div>
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
              <ArrowRight className="h-6 w-6 text-black" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-black">
              Enquiries converted to projects
            </div>
          </div>
        </div>
      </div>

      {/* Customer information card */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        {/* Customer header */}
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
              </div>
            </div>
            <div className="mt-4 md:mt-0 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg">
              <p className="font-medium">
                GST: {customer.gstNumber || "Not provided"}
              </p>
            </div>
          </div>
        </div>

        {/* Customer details */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Contact Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                Contact Information
              </h3>

              <div className="space-y-4">
                {/* <div className="flex items-start">
                  <User className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium text-gray-700">Contact Persons</p>
                    {customer.contactPersons &&
                    customer.contactPersons.length > 0 ? (
                      <div className="space-y-2">
                        {customer.contactPersons.map((contact, index) => (
                          <div key={index} className="text-gray-600">
                            <span className="font-medium">{contact.name}</span>{":  "}
                             {contact.countryCode+" "+contact.phone}
                          </div>
                        ))}
                      </div>
                    ) : customer.contactPersons &&
                      customer.contactPersons.length === 1 ? (
                      <p className="text-gray-600">
                        {customer.contactPersons[0].name}
                      </p>
                    ) : (
                      <p className="text-gray-600">Not specified</p>
                    )}
                  </div>
                </div> */}

<div className="flex items-start">
      <User className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
      <div className="w-full">
        <p className="font-medium text-gray-700">Contact Persons</p>
        {customer.contactPersons &&
        customer.contactPersons.length > 0 ? (
          <div className="space-y-3 mt-1">
            {customer.contactPersons.map((contact, index) => (
              <div key={index} className="text-gray-600 border-b border-gray-200 pb-2 last:border-0">
                <div className="font-medium text-gray-700 mb-1">{contact.name}</div>
                <div className="flex items-center space-x-1 text-sm">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{contact.countryCode} {contact.phone}</span>
                </div>
                <div className="flex items-center space-x-1 text-sm mt-1">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{contact.email || "Email not specified"}</span>
                </div>
              </div>
            ))}
          </div>
        ) : customer.contactPersons &&
          customer.contactPersons.length === 1 ? (
          <div className="text-gray-600">
            <div className="font-medium">{customer.contactPersons[0].name}</div>
            <div className="flex items-center space-x-1 text-sm">
              <Phone className="h-4 w-4 text-gray-500" />
              <span>{customer.contactPersons[0].countryCode} {customer.contactPersons[0].phone}</span>
            </div>
            <div className="flex items-center space-x-1 text-sm mt-1">
              <Mail className="h-4 w-4 text-gray-500" />
              <span>{customer.contactPersons[0].email || "Email not specified"}</span>
            </div>
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
              </div>
            </div>
            {/* Address Information - no changes needed */}

            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                Address Information
              </h3>

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
                    <p className="text-gray-600 whitespace-pre-line">
                      {customer.address}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <FileText className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium text-gray-700">Billing Address</p>
                    <p className="text-gray-600 whitespace-pre-line">
                      {customer.billingAddress || "Same as address"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <TruckIcon className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium text-gray-700">Shipping Address</p>
                    <p className="text-gray-600 whitespace-pre-line">
                      {customer.shippingAddress || "Same as address"}
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div className="mt-8 px-[3%]">
          <div className="bg-white rounded-xl border-[1px] overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-3">
              <h3 className="text-lg font-medium text-gray-900">Projects</h3>
            </div>
            <div className="px-6 py-4">
              {customerProjects.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No projects found for this customer
                </div>
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Payment</th>
                        {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th> */}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {customerProjects.map((project) => (
                        <tr 
                          key={project.id}
                          onClick={() => navigate(`/dashboard/projects/${project.id}`)}
                          className="hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            p-{project.projectNumber}
                          </td>
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
                            {project.project_start_date ? new Date(project.project_start_date).toLocaleDateString("en-GB") : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {project.project_due_date ? new Date(project.project_due_date).toLocaleDateString("en-GB") : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {project.total_amount}
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

        {/* Enquiries Section */}
        <div className="mt-8 mb-6 px-[3%]">
          <div className="bg-white rounded-xl border-[1px] overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-3">
              <h3 className="text-lg font-medium text-gray-900">Enquiries</h3>
            </div>
            <div className="px-6 py-4">
              {customerEnquiries.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No enquiries found for this customer
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enquiry Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {customerEnquiries.map((enquiry) => (
                        <tr 
                          key={enquiry.id}
                          onClick={() => navigate(`/dashboard/enquiries/${enquiry.id}`)}
                          className="hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            E-{enquiry.enquiryNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{enquiry.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{enquiry.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${enquiry.status === 'moved to projects' ? 'bg-green-100 text-green-800' : 
                              enquiry.status === 'on hold' ? 'bg-yellow-100 text-yellow-800' : 
                              enquiry.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                              'bg-blue-100 text-blue-800'}`}>
                              {enquiry.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(enquiry.createdAt).toLocaleDateString("en-GB")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            ₹{enquiry.deliverables.reduce((sum, d) => sum + d.total, 0)}
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
    </div>
  );
}
