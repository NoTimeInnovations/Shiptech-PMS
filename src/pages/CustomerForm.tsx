

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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-heading font-semibold">
              {id ? "Edit Customer" : "Create New Customer"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {id
                ? "Update this customer's details and contacts"
                : "Add a new customer with contact and address details"}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                {id ? "Updating..." : "Creating..."}
              </>
            ) : id ? (
              "Update Customer"
            ) : (
              "Create Customer"
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-5 justify-center px-[10%]">
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
            <CardDescription>
              Basic identity and login details for this customer
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6">
            <div className="grid gap-2">
              <Label htmlFor="customer-name">Customer Name</Label>
              <Input
                id="customer-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="customer-nickname">Nickname</Label>
              <Input
                id="customer-nickname"
                type="text"
                value={formData.nickname}
                required
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nickname: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="customer-email">Email</Label>
              <Input
                id="customer-email"
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="customer-password">
                {id && originalNickname !== formData.nickname
                  ? "New Generated Password"
                  : "Generated Password"}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="customer-password"
                  type="text"
                  value={generatedPassword}
                  readOnly
                  className="bg-muted"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPassword);
                    toast.success("Password copied to clipboard");
                  }}
                >
                  Copy
                </Button>
              </div>
              {id && originalNickname !== formData.nickname ? (
                <p className="text-sm text-destructive">
                  Password will be updated when you save changes
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This password will be used for customer login
                </p>
              )}
            </div>

            {/* Logo Upload Section */}
            <div className="grid gap-2">
              <Label htmlFor="customer-logo">Company Logo</Label>
              <div className="flex items-center gap-4">
                <div className="shrink-0 h-20 w-20 border border-border rounded-md overflow-hidden bg-muted flex items-center justify-center">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Image className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    id="customer-logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="customer-gst">GST Number</Label>
              <Input
                id="customer-gst"
                type="text"
                value={formData.gstNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    gstNumber: e.target.value,
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Persons Section */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Persons</CardTitle>
            <CardDescription>
              At least one contact person is required
            </CardDescription>
            <CardAction>
              <Button type="button" variant="secondary" size="sm" onClick={addContactPerson}>
                <Plus />
                Add Contact
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {formData.contactPersons.map((contact, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 border border-border rounded-md bg-muted/50"
                >
                  <div className="grow flex flex-row items-start gap-3">
                    <div className="w-1/4 grid gap-2">
                      <Label htmlFor={`contact-name-${index}`}>Name</Label>
                      <Input
                        id={`contact-name-${index}`}
                        type="text"
                        required={index === 0}
                        value={contact.name}
                        onChange={(e) =>
                          updateContactPerson(index, "name", e.target.value)
                        }
                      />
                    </div>

                    <div className="w-1/6 grid gap-2">
                      <Label>Country Code</Label>
                      <CountryCodeSelector
                        value={contact.countryCode || "+91"}
                        onChange={(value) =>
                          updateContactPerson(index, "countryCode", value)
                        }
                        className="block w-full"
                      />
                    </div>

                    <div className="w-1/4 grid gap-2">
                      <Label htmlFor={`contact-phone-${index}`}>Phone</Label>
                      <Input
                        id={`contact-phone-${index}`}
                        type="tel"
                        required={index === 0}
                        value={contact.phone}
                        onChange={(e) =>
                          updateContactPerson(index, "phone", e.target.value)
                        }
                      />
                    </div>

                    <div className="flex-1 grid gap-2">
                      <Label htmlFor={`contact-email-${index}`}>Email</Label>
                      <Input
                        id={`contact-email-${index}`}
                        type="email"
                        required={index === 0}
                        value={contact.email || ""}
                        onChange={(e) =>
                          updateContactPerson(index, "email", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeContactPerson(index)}
                    className="mt-6 text-destructive hover:text-destructive"
                    aria-label="Remove contact"
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Addresses</CardTitle>
            <CardDescription>
              Registered, billing and shipping addresses
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6">
            <div className="grid gap-2">
              <Label htmlFor="customer-address">Address</Label>
              <Textarea
                id="customer-address"
                required
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address: e.target.value }))
                }
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="customer-billing-address">Billing Address</Label>
              <Textarea
                id="customer-billing-address"
                value={formData.billingAddress}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    billingAddress: e.target.value,
                  }))
                }
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                Leave empty if same as address
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="customer-shipping-address">
                Shipping Address
              </Label>
              <Textarea
                id="customer-shipping-address"
                value={formData.shippingAddress}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    shippingAddress: e.target.value,
                  }))
                }
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                Leave empty if same as address
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
