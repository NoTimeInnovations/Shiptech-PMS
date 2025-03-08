import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Building,
  Mail,
  Phone,
  User,
  MapPin,
  FileText,
  Briefcase,
} from "lucide-react";
import { useCustomerStore, Customer } from "@/store/customerStore";
import toast from "react-hot-toast";
import { Image } from "lucide-react";

export default function CustomerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchCustomer, deleteCustomer, loading } =
    useCustomerStore();
  const [customer, setCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const loadCustomer = async () => {
      if (id) {
        const customerData = await fetchCustomer(id);

        setCustomer(customerData);
      }
    };

    loadCustomer();
  }, [id, fetchCustomer]);


  const handleDelete = async () => {
    if (!customer?.id) return;

    if (window.confirm("Are you sure you want to delete this customer?")) {
      try {
        await deleteCustomer(customer.id);
        toast.success("Customer deleted successfully");
        navigate("/dashboard/customers");
      } catch (error) {
        toast.error("Failed to delete customer");
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
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header with actions */}
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
                <p className="mt-1 text-blue-100">
                  {customer.endClient
                    ? `End Client: ${customer.endClient}`
                    : "No end client specified"}
                </p>
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
                <div className="flex items-start">
                  <User className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium text-gray-700">Contact Persons</p>
                    {customer.contactPersons &&
                    customer.contactPersons.length > 0 ? (
                      <div className="space-y-2">
                        {customer.contactPersons.map((contact, index) => (
                          <div key={index} className="text-gray-600">
                            <span className="font-medium">{contact.name}</span>{" "}
                            - {contact.phone}
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
                </div>

                <div className="flex items-start">
                  <Mail className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium text-gray-700">Email</p>
                    <p className="text-gray-600">{customer.email}</p>
                  </div>
                </div>

                {/* Remove the separate phone field since it's now part of contact persons */}

                <div className="flex items-start">
                  <Briefcase className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium text-gray-700">End Client</p>
                    <p className="text-gray-600">
                      {customer.endClient || "Not specified"}
                    </p>
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
              </div>
            </div>
          </div>
        </div>

        {/* Created/Updated info */}
        <div className="bg-gray-50 px-6 py-4 text-sm text-gray-500 border-t">
          <div className="flex flex-col sm:flex-row sm:justify-between">
            <p>Created: {customer.createdAt ? (
              typeof customer.createdAt.toDate === 'function' ? 
                new Date(customer.createdAt.toDate()).toLocaleString() : 
                new Date(customer.createdAt.toDate()).toLocaleString()
            ) : 'Unknown'}</p>
            <p>Last Updated: {customer.updatedAt ? (
              typeof customer.updatedAt.toDate === 'function' ? 
                new Date(customer.updatedAt.toDate()).toLocaleString() : 
                new Date(customer.updatedAt.toDate()).toLocaleString()
            ) : 'Unknown'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
