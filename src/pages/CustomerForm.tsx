

import React, { useState, useEffect} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, ArrowLeft, Plus, Trash2 } from "lucide-react";
import {
  useCustomerStore,
  Customer,
  ContactPerson,
} from "@/store/customerStore";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import { uploadToGitHub } from "@/lib/github";
import { Image } from "lucide-react";

import CountryCodeSelector from "@/components/CountryCode";

export default function CustomerForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { createCustomer, updateCustomer, fetchCustomer, loading } =
    useCustomerStore();
  const { signUpCustomer } = useAuthStore();

  const [formData, setFormData] = useState<
    Omit<Customer, "id" | "createdAt" | "updatedAt">
  >({
    name: "",
    nickname: "",
    address: "",
    billingAddress: "",
    shippingAddress:"",
    gstNumber: "",
    contactPersons: [{ name: "", phone: "", countryCode: "+91" ,email:""}],
    email: "",
    logoUrl: "",
  });
  
  // Store the original nickname to detect changes
  const [originalNickname, setOriginalNickname] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string>("");

  useEffect(() => {
    const loadCustomer = async () => {
      if (id) {
        const customer = await fetchCustomer(id);
        if (customer) {
          // Handle backward compatibility for customers without contactPersons array
          let contactPersons = customer.contactPersons || [];

          // If old format data exists, convert it to new format
          if (
            "contactPerson" in customer &&
            "phone" in customer &&
            contactPersons.length === 0
          ) {
            contactPersons = [
              {
                name: customer.contactPerson as string,
                phone: customer.phone as string,
                countryCode: "+91",
                email:customer.email as string,
              },
            ];
          }

          // If no contact persons exist, initialize with an empty one
          if (contactPersons.length === 0) {
            contactPersons = [{ name: "", phone: "", countryCode: "+91",email:""}];
          } else {
            // Add countryCode to existing contact persons if not present
            contactPersons = contactPersons.map((contact) => ({
              ...contact,
              countryCode: contact.countryCode || "+91", // Default if not available
            }));
          }

          setFormData({
            name: customer.name,
            nickname: customer.nickname,
            address: customer.address,
            billingAddress: customer.billingAddress,
            shippingAddress:customer.shippingAddress,
            gstNumber: customer.gstNumber,
            contactPersons,
            email: customer.email || "",
            logoUrl: customer.logoUrl || "",
          });
          
          // Store the original nickname and userId for comparison later
          setOriginalNickname(customer.nickname);
          setUserId(customer.email);
          
          // Set logo preview if exists
          if (customer.logoUrl) {
            setLogoPreview(customer.logoUrl);
          }
        }
      }
    };

    loadCustomer();
  }, [id, fetchCustomer]);

  // Function to generate password from customer name
  const generatePassword = (nickName: string) => {
    const formattedName = nickName.replace(/\s+/g, "_").toLowerCase();
    return `${formattedName}@123`;
  };

  // Update password when name changes
  useEffect(() => {
    if (formData.nickname) {
      setGeneratedPassword(generatePassword(formData.nickname));
    }
  }, [formData.nickname]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };
  
  const uploadLogo = async (customerId: string): Promise<string | null> => {
    if (!logoFile) return formData.logoUrl || null;

    const fileName = `logo-${Date.now()}.${logoFile.name.split(".").pop()}`;
    const path = `customers/${customerId}/${fileName}`;

    try {
      const response = await uploadToGitHub(logoFile, path);

      return response;
    } catch (error) {
      console.error("Error uploading logo:", error);
      return null;
    }
  };
  
  // Function to update user password in Firebase Auth
  const updateUserPassword = async (email: string, newPassword: string) => {
    try {
      const response = await fetch('http://localhost:3000/api/updateUserPassword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          newPassword
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password');
      }
      
      return data;
    } catch (error) {
      console.error('Failed to update user password:', error);
      throw error;
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that at least one contact person has both name and phone
    const hasValidContact = formData.contactPersons.some(
      (contact) => contact.name.trim() !== "" && contact.phone.trim() !== ""
    );

    if (!hasValidContact) {
      toast.error(
        "At least one contact person with name and phone is required"
      );
      return;
    }

    // Filter out empty contact persons
    const filteredData = {
      ...formData,
      contactPersons: formData.contactPersons.filter(
        (contact) => contact.name.trim() !== "" || contact.phone.trim() !== ""
      ),
    };

    try {
      if (id) {
        // Check if nickname has changed
        const nicknameChanged = originalNickname !== formData.nickname;
        
        // Upload logo if changed
        const logoUrl = await uploadLogo(id);
        
        // Update customer data
        await updateCustomer(id, {
          ...filteredData,
          logoUrl: logoUrl || filteredData.logoUrl,
        });
        
        // If nickname has changed, update the password in Firebase Auth
        if (nicknameChanged && userId) {
          try {
            await updateUserPassword(userId, generatedPassword);
            toast.success("Customer password updated successfully");
          } catch (error) {
            console.error("Failed to update customer password:", error);
            toast.error("Failed to update customer password");
          }
        }
        
        toast.success("Customer updated successfully");
      } else {
        const cus = await signUpCustomer(
          formData.email,
          generatedPassword,
          formData.name
        );

        if (!cus) {
          toast.error("Failed to create customer account");
          throw new Error("Failed to create customer account");
        }

        toast.success("Customer account created successfully");

        // For new customer, create first to get ID
        const newCustomer = await createCustomer({
          userId: cus?.uid,
          ...filteredData,
        });

        if (newCustomer && logoFile) {
          // Get the ID from the returned customer object
          const customerId = newCustomer.id;

          if (customerId) {
            // Upload logo with the new customer ID
            const logoUrl = await uploadLogo(customerId);

            if (logoUrl) {
              // Update the customer with the logo URL
              await updateCustomer(customerId, { logoUrl });
            }
          }
        }

        toast.success("Customer created successfully");

        // Store the new customer ID in localStorage
        if (newCustomer?.id) {
          localStorage.setItem("newCustomerId", newCustomer.id);
        }
      }

      // Check for last_visited path in localStorage
      const lastVisited = localStorage.getItem("last_visited");
      if (lastVisited) {
        // Remove the last_visited path from localStorage
        localStorage.removeItem("last_visited");
        // Navigate to the last visited path
        navigate(lastVisited);
      } else {
        // If no last_visited path, go to customers list
        navigate("/dashboard/customers");
      }
    } catch (error) {
      console.error("Customer submission error:", error);
      toast.error(
        id ? "Failed to update customer" : "Failed to create customer"
      );
    }
  };

  const addContactPerson = () => {
    setFormData((prev) => ({
      ...prev,
      contactPersons: [
        ...prev.contactPersons,
        { name: "", phone: "", countryCode: "+91",email:"" },
      ],
    }));
  };

  const removeContactPerson = (index: number) => {
    if (formData.contactPersons.length <= 1) {
      toast.error("At least one contact person is required");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      contactPersons: prev.contactPersons.filter((_, i) => i !== index),
    }));
  };

  const updateContactPerson = (
    index: number,
    field: keyof ContactPerson,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      contactPersons: prev.contactPersons.map((contact, i) =>
        i === index ? { ...contact, [field]: value } : contact
      ),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button type="button" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-7 w-7" />
          </button>
          <h2 className="text-2xl font-bold">
            {id ? "Edit Customer" : "Create New Customer"}
          </h2>
        </div>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black/90 hover:bg-black/80 focus:outline-none"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                {id ? "Updating..." : "Creating..."}
              </>
            ) : id ? (
              "Update Customer"
            ) : (
              "Create Customer"
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 justify-center px-[10%]">
        <div className="bg-white border-[1px] rounded-xl px-6 py-10">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block font-medium text-gray-700">
                Customer Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700">
                Nickname
              </label>
              <input
                type="text"
                value={formData.nickname}
                required
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nickname: e.target.value }))
                }
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700">
                {id && originalNickname !== formData.nickname 
                  ? "New Generated Password" 
                  : "Generated Password"}
              </label>
              <div className="mt-1 flex items-center space-x-2">
                <input
                  type="text"
                  value={generatedPassword}
                  readOnly
                  className="p-2 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPassword);
                    toast.success("Password copied to clipboard");
                  }}
                  className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
                >
                  Copy
                </button>
              </div>
              {id && originalNickname !== formData.nickname ? (
                <p className="mt-1 text-sm text-red-500">
                  Password will be updated when you save changes
                </p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  This password will be used for customer login
                </p>
              )}
            </div>

            {/* Logo Upload Section */}
            <div>
              <label className="block font-medium text-gray-700">
                Company Logo
              </label>
              <div className="mt-1 flex items-center space-x-4">
                <div className="flex-shrink-0 h-20 w-20 border border-gray-300 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Image className="h-10 w-10 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-medium
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </div>
              </div>
            </div>
            {/* Contact Persons Section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block font-medium text-gray-700">
                  Contact Persons
                </label>
                <button
                  type="button"
                  onClick={addContactPerson}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                >
                  <Plus size={16} className="mr-1" />
                  Add Contact
                </button>
              </div>

              <div className="space-y-3">
                {formData.contactPersons.map((contact, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-2 p-3 border border-gray-200 rounded-md bg-gray-50"
                  >
                    <div className="flex-grow flex flex-row items-start gap-3">
                      <div className="w-1/4">
                        <label className="block text-sm font-medium text-gray-700">
                          Name
                        </label>
                        <input
                          type="text"
                          required={index === 0}
                          value={contact.name}
                          onChange={(e) =>
                            updateContactPerson(index, "name", e.target.value)
                          }
                          className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      <div className="w-1/6">
                        <label className="block text-sm font-medium text-gray-700">
                          Country Code
                        </label>
                        <CountryCodeSelector
                          value={contact.countryCode || "+91"}
                          onChange={(value) =>
                            updateContactPerson(index, "countryCode", value)
                          }
                          className="mt-1 block w-full"
                        />
                      </div>

                      <div className="w-1/4">
                        <label className="block text-sm font-medium text-gray-700">
                          Phone
                        </label>
                        <input
                          type="tel"
                          required={index === 0}
                          value={contact.phone}
                          onChange={(e) =>
                            updateContactPerson(index, "phone", e.target.value)
                          }
                          className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Email
                        </label>
                        <input
                          type="email"
                          required={index === 0}
                          value={contact.email || ""}
                          onChange={(e) =>
                            updateContactPerson(index, "email", e.target.value)
                          }
                          className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeContactPerson(index)}
                      className="mt-7 p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                      aria-label="Remove contact"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <p className="mt-1 text-sm text-gray-500">
                At least one contact person is required
              </p>
            </div>

            <div>
              <label className="block font-medium text-gray-700">
                GST Number
              </label>
              <input
                type="text"
                value={formData.gstNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    gstNumber: e.target.value,
                  }))
                }
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700">Address</label>
              <textarea
                required
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address: e.target.value }))
                }
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700">
                Billing Address
              </label>
              <textarea
                value={formData.billingAddress}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    billingAddress: e.target.value,
                  }))
                }
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={3}
              />
              <p className="mt-1 text-sm text-gray-500">
                Leave empty if same as address
              </p>
            </div>

            <div>
              <label className="block font-medium text-gray-700">
                Shipping Address
              </label>
              <textarea
                value={formData.shippingAddress}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    shippingAddress: e.target.value,
                  }))
                }
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={3}
              />
              <p className="mt-1 text-sm text-gray-500">
                Leave empty if same as address
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}