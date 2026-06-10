import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Image,
  Building,
  MapPin,
  FileText,
  User,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { useCustomerStore, Customer } from "@/store/customerStore";
import toast from "react-hot-toast";
import { useProjectStore } from "@/store/projectStore";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CustomerViewingDetails() {
  const navigate = useNavigate();
  const { fetchCustomerByUserId, loading } = useCustomerStore();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const { projects, fetchCustomerProjects } = useProjectStore();
  const { userData } = useAuthStore();

  useEffect(() => {
    const loadCustomerData = async () => {
      const user = auth.currentUser;
      if (user) {
        const customerData = await fetchCustomerByUserId(user.uid);
        if (customerData) {
          setCustomer(customerData);
          await fetchCustomerProjects(customerData.id as string);
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
  }, [fetchCustomerByUserId, fetchCustomerProjects, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (userData && !userData.verified) {
    return (
      <div className="flex items-center justify-center h-screen p-6 bg-gradient-to-r from-red-200 to-red-400">
        <Alert variant="destructive" className="max-w-md w-full bg-card shadow-lg">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Warning!</AlertTitle>
          <AlertDescription>
            Your account is not verified. Please contact ShipTech-ICON team.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold text-muted-foreground">Customer not found</h2>
            <Button className="mt-4" onClick={() => navigate("/customer")}>
              Back to Customers
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 bg-background min-h-screen" style={{ width: '70%', margin: '0 auto' }}>
      {/* Customer Information Card */}
      <Card className="overflow-hidden py-0 gap-0">
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
                <h2 className="text-3xl font-heading font-semibold">{customer.name}</h2>
              </div>
            </div>
            <div className="mt-4 md:mt-0 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg">
              <p className="font-medium">GST: {customer.gstNumber || "Not provided"}</p>
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Contact Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold border-b border-border pb-2">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium">Contact Persons</p>
                    {customer.contactPersons && customer.contactPersons.length > 0 ? (
                      <div className="space-y-2">
                        {customer.contactPersons.map((contact, index) => (
                          <div key={index} className="text-muted-foreground">
                            <span className="font-medium">{contact.name}</span> - {contact.phone}
                          </div>
                        ))}
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

            {/* Address Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold border-b border-border pb-2">Address Information</h3>
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
                    <p className="text-muted-foreground whitespace-pre-line">{customer.address}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium">Billing Address</p>
                    <p className="text-muted-foreground whitespace-pre-line">{customer.billingAddress || "Same as address"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Section */}
      <div className="mt-8">
        <Card className="overflow-hidden py-0 gap-0">
          <div className="border-b border-border px-6 py-3">
            <h3 className="text-lg font-medium">Projects</h3>
          </div>
          <div className="px-6 py-4">
            {projects.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No projects found for this customer</div>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => (
                      <TableRow
                        key={project.id}
                        onClick={() => navigate(`/customer/projects/${project.id}`)}
                        className="cursor-pointer"
                      >
                        <TableCell>p-{project.projectNumber}</TableCell>
                        <TableCell>{project.name}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              project.status === 'completed' ? 'bg-green-100 text-green-800' :
                              project.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }
                          >
                            {project.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {project.project_start_date ? new Date(project.project_start_date).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {project.project_due_date ? new Date(project.project_due_date).toLocaleDateString() : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
