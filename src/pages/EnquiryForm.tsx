import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Loader2, Trash2, ArrowLeft, UserPlus } from "lucide-react";
import { useEnquiryStore, CurrencyDetails } from "../store/enquiryStore";
import { useCustomerStore, Customer } from "@/store/customerStore";
import toast from "react-hot-toast";
import RichTextEditor, { ToolbarConfig } from "react-rte";
import Currency from "../components/Currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Deliverable {
  id: string;
  name: string;
  hours: number;
  costPerHour: number;
  total: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  description: any;
}

interface EnquiryFormData {
  enquiryNumber: string;
  name: string;
  description: string;
  customer_id: string;
  deliverables: Deliverable[];
  exclusions: string[];
  charges: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scopeOfWork: any;
  inputsRequired: string[];
  status: string;
  currency?: CurrencyDetails;
  endClient: string;
  deadLine: string;
}

const toolbarConfig: ToolbarConfig = {
  display: [
    "INLINE_STYLE_BUTTONS",
    "BLOCK_TYPE_BUTTONS",
    "BLOCK_TYPE_DROPDOWN",
    "HISTORY_BUTTONS",
    "BLOCK_ALIGNMENT_BUTTONS",
    "LINK_BUTTONS",
  ],
  INLINE_STYLE_BUTTONS: [
    { label: "Bold", style: "BOLD" },
    { label: "Italic", style: "ITALIC" },
    { label: "Underline", style: "UNDERLINE" },
  ],
  BLOCK_TYPE_DROPDOWN: [
    { label: "Normal", style: "unstyled" },
    { label: "Heading 1", style: "header-one" },
    { label: "Heading 2", style: "header-two" },
    { label: "Heading 3", style: "header-three" },
  ],
  BLOCK_TYPE_BUTTONS: [
    { label: "UL", style: "unordered-list-item" },
    { label: "OL", style: "ordered-list-item" },
  ],
  BLOCK_ALIGNMENT_BUTTONS: [
    { label: "Align Left", style: "ALIGN_LEFT" },
    { label: "Align Center", style: "ALIGN_CENTER" },
    { label: "Align Right", style: "ALIGN_RIGHT" },
  ],
};

const editorStyle = {
  editor: {
    border: "1px solid #ccc",
    padding: "10px",
    minHeight: "200px",
    borderRadius: "6px",
    fontSize: "14px",
  },
};

export default function EnquiryForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    createEnquiry,
    updateEnquiry,
    fetchEnquiry,
    loading: storeLoading,
  } = useEnquiryStore();
  const { customers, fetchCustomer, fetchCustomers } = useCustomerStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [ShouldWork, setShouldWork] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<EnquiryFormData>({
    enquiryNumber: "",
    name: "",
    description: "",
    customer_id: "",
    deliverables: [] as Deliverable[],
    exclusions: [] as string[],
    charges: [] as string[],
    scopeOfWork: RichTextEditor.createEmptyValue(),
    inputsRequired: [] as string[],
    status: "draft",
    currency: undefined,
    endClient: "",
    deadLine: "",
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (id) {
        const enquiry = await fetchEnquiry(id);
        if (enquiry) {
          setFormData({
            ...enquiry,
            scopeOfWork: RichTextEditor.createValueFromString(
              enquiry.scopeOfWork,
              "html"
            ),
            deliverables: enquiry.deliverables.map((d) => ({
              ...d,
              hours: d.hours ?? 0,
              costPerHour: d.costPerHour ?? 0,
              description: d.description
                ? RichTextEditor.createValueFromString(d.description, "html")
                : RichTextEditor.createEmptyValue(),
            })),
            exclusions: enquiry.exclusions ?? [],
            inputsRequired: enquiry.inputsRequired ?? [],
            charges: enquiry.charges ?? [],
            status: enquiry.status ?? "draft",
            currency: enquiry.currency,
            endClient: enquiry.endClient ?? "",
          });

          if (enquiry.customer_id) {
            const customer = await fetchCustomer(enquiry.customer_id);
            if (customer) {
              setSelectedCustomer(customer);
            }
          }
        }
      }
    };

    loadData();
  }, [id, fetchEnquiry, fetchCustomer]);

  useEffect(() => {
    // Load data from localStorage on component mount
    const savedData = localStorage.getItem("enquiryFormData");
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        // Ensure the parsed data matches the expected structure
        if (parsedData && typeof parsedData === "object") {
          // Process deliverables and scopeOfWork to convert HTML strings to RichTextEditor values
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const processedDeliverables = parsedData.deliverables.map(
            (d: any) => ({
              ...d,
              description: d.description
                ? RichTextEditor.createValueFromString(d.description, "html")
                : RichTextEditor.createEmptyValue(),
              hours: d.hours ?? 0,
              costPerHour: d.costPerHour ?? 0,
            })
          );

          const processedScopeOfWork = parsedData.scopeOfWork
            ? RichTextEditor.createValueFromString(
                parsedData.scopeOfWork,
                "html"
              )
            : RichTextEditor.createEmptyValue();

          setFormData((prev) => ({
            ...prev,
            ...parsedData,
            deliverables: processedDeliverables,
            scopeOfWork: processedScopeOfWork,
          }));
        }
      } catch (error) {
        console.error(
          "Failed to parse enquiry form data from localStorage:",
          error
        );
        // Optionally, you can reset the formData to default values if parsing fails
        setFormData((prev) => ({
          ...prev,
          enquiryNumber: "",
          name: "",
          description: "",
          customer_id: "",
          deliverables: [] as Deliverable[],
          exclusions: [] as string[],
          charges: [] as string[],
          scopeOfWork: RichTextEditor.createEmptyValue(),
          inputsRequired: [] as string[],
          status: "draft",
          currency: undefined,
          endClient: "",
        }));
      }
    }
    setShouldWork(true);
  }, []);

  useEffect(() => {
    // Prepare formData for localStorage similar to how it's prepared for Firestore
    if (ShouldWork) {
      const dataToStore = {
        ...formData,
        scopeOfWork: formData.scopeOfWork.toString("html"),
        deliverables: formData.deliverables.map((d) => ({
          ...d,
          description: d.description.toString("html"),
        })),
      };
      localStorage.setItem("enquiryFormData", JSON.stringify(dataToStore));
    }
  }, [formData]);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData((prev) => ({
      ...prev,
      customer_id: customer.id || "",
    }));
    setShowCustomerDropdown(false);
    setSearchTerm("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      if (!selectedCustomer?.id) {
        toast.error("Please select a customer");
        return;
      }

      const submitData = {
        ...formData,
        customer_id: selectedCustomer.id,
        scopeOfWork: formData.scopeOfWork.toString("html"),
        deliverables: formData.deliverables.map((d) => ({
          ...d,
          description: d.description.toString("html"),
        })),
      };

      if (id) {
        await updateEnquiry(id, submitData);
        toast.success("Enquiry updated successfully");
        
      } else {
        await createEnquiry(submitData);
        toast.success("Enquiry created successfully");
      }
      clearDraft();
      navigate("/dashboard/enquiries");
    } catch (error) {
      console.error("Error submitting enquiry:", error);
      toast.error(id ? "Failed to update enquiry" : "Failed to create enquiry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCurrencyChange = (currency: CurrencyDetails | undefined) => {
    setFormData((prev) => ({
      ...prev,
      currency,
    }));
  };

  // Filter customers based on search term
  const filteredCustomers = customers.filter((customer: Customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddNewCustomer = () => {
    // Save current path to localStorage
    localStorage.setItem("last_visited", window.location.pathname);
    navigate("/dashboard/customers/new");
  };

  const addDeliverable = () => {
    setFormData((prev) => ({
      ...prev,
      deliverables: [
        ...prev.deliverables,
        {
          id: crypto.randomUUID(),
          name: "",
          hours: 0,
          costPerHour: 0,
          total: 0,
          description: RichTextEditor.createEmptyValue(),
        },
      ],
    }));
  };

  const removeDeliverable = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      deliverables: prev.deliverables.filter((d) => d.id !== id),
    }));
  };

  const updateDeliverable = (
    id: string,
    field: keyof Deliverable,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      deliverables: prev.deliverables.map((d) => {
        if (d.id === id) {
          const updatedDeliverable = { ...d, [field]: value };
          updatedDeliverable.total =
            updatedDeliverable.hours * updatedDeliverable.costPerHour;
          return updatedDeliverable;
        }
        return d;
      }),
    }));
  };

  const addInputRequired = () => {
    setFormData((prev) => ({
      ...prev,
      inputsRequired: [...prev.inputsRequired, ""],
    }));
  };

  const updateInputRequired = (index: number, value: string) => {
    setFormData((prev) => {
      const newInputs = [...prev.inputsRequired];
      newInputs[index] = value;
      return { ...prev, inputsRequired: newInputs };
    });
  };

  const removeInputRequired = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      inputsRequired: prev.inputsRequired.filter((_, i) => i !== index),
    }));
  };

  const addExclusion = () => {
    setFormData((prev) => ({
      ...prev,
      exclusions: [...prev.exclusions, ""],
    }));
  };

  const removeExclusion = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      exclusions: prev.exclusions.filter((_, i) => i !== index),
    }));
  };

  const updateExclusion = (index: number, value: string) => {
    setFormData((prev) => {
      const newExclusions = [...prev.exclusions];
      newExclusions[index] = value;
      return { ...prev, exclusions: newExclusions };
    });
  };

  const addCharge = () => {
    setFormData((prev) => ({
      ...prev,
      charges: [...prev.charges, ""],
    }));
  };

  const removeCharge = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      charges: prev.charges.filter((_, i) => i !== index),
    }));
  };

  const updateCharge = (index: number, value: string) => {
    setFormData((prev) => {
      const newCharges = [...prev.charges];
      newCharges[index] = value;
      return { ...prev, charges: newCharges };
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDeliverableDescriptionChange = (id: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      deliverables: prev.deliverables.map((d) => {
        if (d.id === id) {
          return { ...d, description: value };
        }
        return d;
      }),
    }));
  };

  const clearDraft = () => {
    setFormData({
      enquiryNumber: "",
      name: "",
      description: "",
      customer_id: "",
      deliverables: [] as Deliverable[],
      exclusions: [] as string[],
      charges: [] as string[],
      scopeOfWork: RichTextEditor.createEmptyValue(),
      inputsRequired: [] as string[],
      status: "draft",
      currency: undefined,
      endClient: "",
      deadLine: "",
    });
    localStorage.removeItem("enquiryFormData"); // Clear from localStorage
  };

  return (
    <form onSubmit={handleSubmit} className=" p-6 space-y-8 ">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <h2 className="text-2xl font-heading font-semibold">
            {id ? "Edit Enquiry" : "Create New Enquiry"}
          </h2>
        </div>
        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || storeLoading}>
            {isSubmitting || storeLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                {id ? "Updating..." : "Creating..."}
              </>
            ) : id ? (
              "Update Enquiry"
            ) : (
              "Create Enquiry"
            )}
          </Button>
          <Button type="button" variant="outline" onClick={clearDraft}>
            Clear Draft
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 justify-center px-[10%]">
        <Card>
          <CardHeader>
            <CardTitle>Enquiry Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-1">
                <Label htmlFor="enquiry-number">Enquiry Number</Label>
                <Input
                  id="enquiry-number"
                  type="text"
                  required
                  value={formData.enquiryNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      enquiryNumber: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="enquiry-name">Enquiry Name</Label>
                <Input
                  id="enquiry-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="enquiry-description">Description</Label>
                <Textarea
                  id="enquiry-description"
                  required
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="enquiry-deadline">Deadline</Label>
                <Input
                  id="enquiry-deadline"
                  type="date"
                  value={formData.deadLine}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      deadLine: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                {/* changed scope of work label to deliverables */}
                <Label>Deliverables</Label>
                <RichTextEditor
                  value={formData.scopeOfWork}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, scopeOfWork: value }))
                  }
                  toolbarConfig={toolbarConfig}
                  editorStyle={editorStyle}
                  className="prose prose-slate max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setShowCustomerDropdown(true)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleAddNewCustomer}
                >
                  <UserPlus size={20} />
                </Button>
              </div>

              {showCustomerDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-popover text-popover-foreground shadow-lg rounded-md border border-border">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                      onClick={() => handleCustomerSelect(customer)}
                    >
                      {customer.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedCustomer && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="customer-name">Name</Label>
                  <Input
                    id="customer-name"
                    type="text"
                    readOnly
                    value={selectedCustomer.name}
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="customer-email">Email</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    readOnly
                    value={selectedCustomer.email}
                    className="bg-muted"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label htmlFor="customer-address">Address</Label>
                  <Textarea
                    id="customer-address"
                    readOnly
                    value={selectedCustomer.address}
                    className="bg-muted"
                    rows={2}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="space-y-1">
          <Label htmlFor="end-client">End Client</Label>
          <Input
            id="end-client"
            type="text"
            value={formData.endClient}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                endClient: e.target.value,
              }))
            }
          />
        </div>

        <Card>
          <CardContent>
            <Currency
              addCurrency={handleCurrencyChange}
              initialCurrency={formData.currency}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              {/* changed deliverables title to scope of work  */}
              <CardTitle>Scope of Work</CardTitle>
              <Button type="button" size="sm" onClick={addDeliverable}>
                <Plus size={16} className="mr-1" />
                Add Scope of Work
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formData.deliverables.map((deliverable) => (
                <div
                  key={deliverable.id}
                  className="grid grid-cols-1 gap-4 border-b border-border pb-4"
                >
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input
                      type="text"
                      required
                      value={deliverable.name}
                      onChange={(e) =>
                        updateDeliverable(
                          deliverable.id,
                          "name",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label>Hours</Label>
                      <Input
                        type="number"
                        required
                        min="0"
                        value={deliverable.hours}
                        onChange={(e) =>
                          updateDeliverable(
                            deliverable.id,
                            "hours",
                            parseFloat(e.target.value)
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Cost/Hour</Label>
                      <Input
                        type="number"
                        required
                        min="0"
                        value={deliverable.costPerHour}
                        onChange={(e) =>
                          updateDeliverable(
                            deliverable.id,
                            "costPerHour",
                            parseFloat(e.target.value)
                          )
                        }
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <Label>Total</Label>
                        <Input
                          type="number"
                          readOnly
                          value={deliverable.total}
                          className="bg-muted"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mb-1 text-destructive hover:text-destructive"
                        onClick={() => removeDeliverable(deliverable.id)}
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Description</Label>
                    <RichTextEditor
                      value={deliverable.description}
                      onChange={(value) =>
                        handleDeliverableDescriptionChange(
                          deliverable.id,
                          value
                        )
                      }
                      toolbarConfig={toolbarConfig}
                      className="min-h-[100px] w-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Exclusions</CardTitle>
              <Button type="button" size="sm" onClick={addExclusion}>
                <Plus size={16} className="mr-1" />
                Add Exclusion
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formData.exclusions.map((exclusion, index) => (
                <div key={index} className="flex items-end gap-2">
                  <Input
                    type="text"
                    required
                    value={exclusion}
                    onChange={(e) => updateExclusion(index, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeExclusion(index)}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* New Inputs Required Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Inputs Required</CardTitle>
              <Button type="button" size="sm" onClick={addInputRequired}>
                <Plus size={16} className="mr-1" />
                Add Input
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formData.inputsRequired.map((input, index) => (
                <div key={index} className="flex items-end gap-2">
                  <Input
                    type="text"
                    required
                    value={input}
                    onChange={(e) => updateInputRequired(index, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeInputRequired(index)}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Charges Included</CardTitle>
              <Button type="button" size="sm" onClick={addCharge}>
                <Plus size={16} className="mr-1" />
                Add Charge
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formData.charges.map((charge, index) => (
                <div key={index} className="flex items-end gap-2">
                  <Input
                    type="text"
                    required
                    value={charge}
                    onChange={(e) => updateCharge(index, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeCharge(index)}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Buttons container with same width as white div above */}
        <div className="mt-4">
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || storeLoading}
            >
              {isSubmitting || storeLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  {id ? "Updating..." : "Creating..."}
                </>
              ) : id ? (
                "Update Enquiry"
              ) : (
                "Create Enquiry"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={clearDraft}
            >
              Clear Draft
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
