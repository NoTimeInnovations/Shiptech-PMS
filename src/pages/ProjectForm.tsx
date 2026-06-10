import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useProjectStore } from "../store/projectStore";
import { useCustomerStore, Customer } from "@/store/customerStore";
import toast from "react-hot-toast";
import { useTaskStore , Task } from "@/store/taskStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";


interface FormData {
  name: string;
  description: string;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  tasks: Task[];
  projectNumber: string;
  status: "completed" | "ongoing" | "not-started";
  type: "project";
  project_due_date?: string | null;
  project_start_date?: string | null;
  endClient: string;
}

export default function ProjectForm() {
  const { id } = useParams<{ id: string }>();
  const { fetchAllTasksWithChildren } = useTaskStore();
  const navigate = useNavigate();
  const { createProject, updateProject, fetchProject } = useProjectStore();
  const { fetchCustomers, customers } = useCustomerStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>(() => {
    // Try to load saved form data from localStorage
    const savedData = localStorage.getItem('projectFormData');
    if (savedData) {
      return JSON.parse(savedData);
    }
    return {
      name: "",
      description: "",
      customer: {
        name: "",
        phone: "",
        address: "",
      },
      tasks: [],
      projectNumber: "",
      status: "not-started",
      type: "project",
      endClient: "",
    };
  });

  useEffect(() => {
    const loadProject = async () => {
      if (id) {
        try {
          const project = await fetchProject(id);
          if (project) {
            // Clear any existing form data from localStorage first
            localStorage.removeItem('projectFormData');

            const tasks = await fetchAllTasksWithChildren(project.__id);

            // Set the form data
            setFormData({
              name: project.name || "",
              description: project.description || "",
              projectNumber: project.projectNumber || "",
              status: project.status || "not-started",
              customer: {
                name: project.customer?.name || "",
                phone: project.customer?.phone || "",
                address: project.customer?.address || "",
              },
              tasks: tasks,
              project_due_date: project.project_due_date || null,
              project_start_date: project.project_start_date || null,
              type: "project" as const,
              endClient: project.endClient || "",
            });

            // Find and set the selected customer
            const customer = customers.find(c =>
              c.name === project.customer?.name &&
              c.contactPersons[0]?.phone === project.customer?.phone
            );
            if (customer) {
              setSelectedCustomer(customer);
            }
          }
        } catch (error) {
          console.error("Error loading project:", error);
          toast.error("Failed to load project");
        }
      }
    };

    // Only fetch customers once when component mounts
    if (customers.length === 0) {
      fetchCustomers();
    }

    // Only load project data once when id is available
    if (id) {
      loadProject();
    }

    // Check for newly created customer
    const newCustomerId = localStorage.getItem('newCustomerId');
    if (newCustomerId) {
      const newCustomer = customers.find(c => c.id === newCustomerId);
      if (newCustomer) {
        handleCustomerSelect(newCustomer);
      }
      localStorage.removeItem('newCustomerId');
    }
  }, [id]); // Remove unnecessary dependencies

  // Separate useEffect for handling new customers
  useEffect(() => {
    const newCustomerId = localStorage.getItem('newCustomerId');
    if (newCustomerId) {
      const newCustomer = customers.find(c => c.id === newCustomerId);
      if (newCustomer) {
        handleCustomerSelect(newCustomer);
        localStorage.removeItem('newCustomerId');
      }
    }
  }, [customers]);

  // Modify the useEffect for localStorage
  useEffect(() => {
    // Only save to localStorage if we're not editing an existing project
    if (!id) {
      localStorage.setItem('projectFormData', JSON.stringify(formData));
    }
  }, [formData, id]);

  // Filter customers based on search term
  const filteredCustomers = customers.filter((customer: Customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prevData => ({
      ...prevData,
      customer: {
        name: customer.name,
        phone: customer.contactPersons[0]?.phone || "",
        address: customer.address,
      }
    }));
    setShowCustomerDropdown(false);
    setSearchTerm("");
  };

  const handleAddNewCustomer = () => {
    localStorage.setItem('last_visited', window.location.pathname);
    navigate('/dashboard/customers/new');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (!selectedCustomer) {
        toast.error("Please select a customer");
        setIsSubmitting(false);
        return;
      }

      // Create form data using the latest selectedCustomer data
      const currentFormData = {
        ...formData,
        customer: {
          name: selectedCustomer.name,
          phone: selectedCustomer.contactPersons[0]?.phone || "",
          address: selectedCustomer.address,
        },
        customer_id:selectedCustomer.id || "",
        settlement: "not-defined",
        total_amount: 0,
      };

      if (id) {
        await updateProject(id, currentFormData);
        toast.success("Project updated successfully");
        localStorage.removeItem('projectFormData');
        navigate(`/dashboard/projects/${id}`, { replace: true });
      } else {
        await createProject(currentFormData);
        toast.success("Project created successfully");
        localStorage.removeItem('projectFormData');
        navigate("/dashboard/projects");
      }
    } catch (error) {
      console.error("Error submitting project:", error);
      toast.error("Failed to save project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
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
              {id ? "Edit Project" : "Create New Project"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {id
                ? "Update the details of this project"
                : "Set up a new project and link it to a customer"}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit">
            {id ? "Update Project" : "Create Project"}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 px-[10%]">
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
            <CardDescription>
              Basic details that identify this project
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6">
            <div className="grid gap-2">
              <Label htmlFor="project-number">Project Number</Label>
              <Input
                id="project-number"
                type="text"
                name="projectNumber"
                required
                value={formData.projectNumber}
                onChange={handleInputChange}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                name="description"
                required
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
            <CardDescription>
              Search for an existing customer or add a new one
            </CardDescription>
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
                  aria-label="Add new customer"
                >
                  <UserPlus className="size-5" />
                </Button>
              </div>

              {showCustomerDropdown && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-md">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer first:rounded-t-md last:rounded-b-md"
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
                <div className="grid gap-2">
                  <Label htmlFor="selected-customer-name">Name</Label>
                  <Input
                    id="selected-customer-name"
                    type="text"
                    readOnly
                    value={selectedCustomer.name}
                    className="bg-muted"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="selected-customer-phone">Phone</Label>
                  <Input
                    id="selected-customer-phone"
                    type="text"
                    readOnly
                    value={selectedCustomer.contactPersons[0]?.phone || ""}
                    className="bg-muted"
                  />
                </div>
                <div className="sm:col-span-2 grid gap-2">
                  <Label htmlFor="selected-customer-address">Address</Label>
                  <Textarea
                    id="selected-customer-address"
                    readOnly
                    value={selectedCustomer.address}
                    className="bg-muted"
                    rows={2}
                  />
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-2">
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
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
