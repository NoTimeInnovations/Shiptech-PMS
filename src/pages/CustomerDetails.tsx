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
  Loader2,
  TruckIcon,
  Phone,
} from "lucide-react";
import { useCustomerStore, Customer } from "@/store/customerStore";
import toast from "react-hot-toast";
import { Image } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { useEnquiryStore } from "@/store/enquiryStore";
import CustomerSettlementModal from "@/components/CustomerSettlementModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-heading font-semibold">
            Customer not found
          </h2>
          <Button
            className="mx-auto mt-4"
            onClick={() => navigate("/dashboard/customers")}
          >
            Back to Customers
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen">

      <CustomerSettlementModal isOpen={isSettlementModalOpen} setOpen={setSettlementModalOpen} projects={customerProjects} customer={customer} enquiries={customerEnquiries} />

      {/* Header with back button and actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/customers")}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-heading font-semibold">
              Customer Details
            </h1>
            <p className="text-sm text-muted-foreground">
              Profile, projects and enquiries for this customer
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setSettlementModalOpen(true)}>
            <Check />
            Settle
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/dashboard/customers/${id}/edit`)}
          >
            <Edit />
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 />
            Delete
          </Button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Projects Card */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Projects
                </p>
                <p className="mt-2 text-3xl font-semibold">{totalProjects}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Briefcase className="h-6 w-6 text-blue-700" />
              </div>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              Active projects with this customer
            </div>
          </CardContent>
        </Card>

        {/* Total Enquiries Card */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Enquiries
                </p>
                <p className="mt-2 text-3xl font-semibold">{totalEnquiries}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <FileQuestion className="h-6 w-6 text-yellow-700" />
              </div>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              All enquiries from this customer
            </div>
          </CardContent>
        </Card>

        {/* Converted Enquiries Card */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Converted to Projects
                </p>
                <p className="mt-2 text-3xl font-semibold">
                  {enquiriesMovedToProjects}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <ArrowRight className="h-6 w-6 text-green-700" />
              </div>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              Enquiries converted to projects
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer information card */}
      <Card className="mb-8 overflow-hidden">
        {/* Customer header */}
        <CardHeader className="border-b">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div className="flex items-center gap-4">
              {customer.logoUrl ? (
                <div className="h-16 w-16 rounded-full border border-border bg-muted flex items-center justify-center overflow-hidden">
                  <img
                    src={customer.logoUrl}
                    alt={`${customer.name} logo`}
                    className="h-14 w-14 object-contain"
                  />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-full border border-border bg-muted flex items-center justify-center">
                  <Image className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <CardTitle className="text-2xl">{customer.name}</CardTitle>
            </div>
            <Badge variant="outline" className="h-auto px-3 py-1.5 text-sm">
              GST: {customer.gstNumber || "Not provided"}
            </Badge>
          </div>
        </CardHeader>

        {/* Customer details */}
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-heading font-semibold">
                Contact Information
              </h3>
              <Separator />

              <div className="space-y-4">
                <div className="flex items-start">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5 mr-3" />
                  <div className="w-full">
                    <p className="font-medium">Contact Persons</p>
                    {customer.contactPersons &&
                    customer.contactPersons.length > 0 ? (
                      <div className="space-y-3 mt-1">
                        {customer.contactPersons.map((contact, index) => (
                          <div
                            key={index}
                            className="text-muted-foreground border-b border-border pb-2 last:border-0"
                          >
                            <div className="font-medium text-foreground mb-1">
                              {contact.name}
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-4 w-4" />
                              <span>
                                {contact.countryCode} {contact.phone}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-sm mt-1">
                              <Mail className="h-4 w-4" />
                              <span>
                                {contact.email || "Email not specified"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : customer.contactPersons &&
                      customer.contactPersons.length === 1 ? (
                      <div className="text-muted-foreground">
                        <div className="font-medium text-foreground">
                          {customer.contactPersons[0].name}
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-4 w-4" />
                          <span>
                            {customer.contactPersons[0].countryCode}{" "}
                            {customer.contactPersons[0].phone}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm mt-1">
                          <Mail className="h-4 w-4" />
                          <span>
                            {customer.contactPersons[0].email ||
                              "Email not specified"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Not specified</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-muted-foreground">{customer.email}</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Address Information - no changes needed */}

            <div className="space-y-4">
              <h3 className="text-lg font-heading font-semibold">
                Address Information
              </h3>
              <Separator />

              <div className="space-y-4">
                <div className="flex items-start">
                  <Building className="h-5 w-5 text-muted-foreground mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium">Company Name</p>
                    <p className="text-muted-foreground">{customer.name}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium">Address</p>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {customer.address}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium">Billing Address</p>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {customer.billingAddress || "Same as address"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <TruckIcon className="h-5 w-5 text-muted-foreground mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium">Shipping Address</p>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {customer.shippingAddress || "Same as address"}
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {customerProjects.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No projects found for this customer
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Total Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerProjects.map((project) => (
                    <TableRow
                      key={project.id}
                      onClick={() => navigate(`/dashboard/projects/${project.id}`)}
                      className="cursor-pointer"
                    >
                      <TableCell>p-{project.projectNumber}</TableCell>
                      <TableCell>{project.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            project.status === "completed"
                              ? "border-transparent bg-green-100 text-green-800"
                              : project.status === "ongoing"
                              ? "border-transparent bg-blue-100 text-blue-800"
                              : "border-transparent bg-muted text-muted-foreground"
                          }
                        >
                          {project.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {project.project_start_date
                          ? new Date(
                              project.project_start_date
                            ).toLocaleDateString("en-GB")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {project.project_due_date
                          ? new Date(
                              project.project_due_date
                            ).toLocaleDateString("en-GB")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {project.total_amount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enquiries Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Enquiries</CardTitle>
        </CardHeader>
        <CardContent>
          {customerEnquiries.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No enquiries found for this customer
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Enquiry Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerEnquiries.map((enquiry) => (
                    <TableRow
                      key={enquiry.id}
                      onClick={() => navigate(`/dashboard/enquiries/${enquiry.id}`)}
                      className="cursor-pointer"
                    >
                      <TableCell>E-{enquiry.enquiryNumber}</TableCell>
                      <TableCell>{enquiry.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {enquiry.description}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            enquiry.status === "moved to projects"
                              ? "border-transparent bg-green-100 text-green-800"
                              : enquiry.status === "on hold"
                              ? "border-transparent bg-yellow-100 text-yellow-800"
                              : enquiry.status === "cancelled"
                              ? "border-transparent bg-red-100 text-red-800"
                              : "border-transparent bg-blue-100 text-blue-800"
                          }
                        >
                          {enquiry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(enquiry.createdAt).toLocaleDateString("en-GB")}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{enquiry.deliverables.reduce((sum, d) => sum + d.total, 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
