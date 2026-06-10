import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Enquiry, useEnquiryStore, Deliverable } from "../store/enquiryStore";
import { Loader2, Pencil, ArrowRight, ArrowLeft } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import toast from "react-hot-toast";
import InvoiceDownloader from "@/components/InvoiceDocument";
import { useCustomerStore, Customer } from "../store/customerStore";
import { dropdownData } from "../const/enquiryDropdown";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function EnquiryDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchEnquiry, convertToProject, updateEnquiryStatus } =
    useEnquiryStore();
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [customerDetails, setCustomerDetails] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuthStore();
  const { fetchCustomer } = useCustomerStore();

  useEffect(() => {
    const loadEnquiry = async () => {
      if (id) {
        const data = await fetchEnquiry(id);
        // console.log("enquiry data",data)
        if (data) {
          setEnquiry(data);

          // Fetch customer details if customer_id exists
          if (data.customer_id) {
            const customerData = await fetchCustomer(data.customer_id);
            if (customerData) {
              setCustomerDetails(customerData);
            }
          }
        } else {
          toast.error("Enquiry not found");
          navigate("/dashboard/enquiries");
        }
        setLoading(false);
      }
    };

    const checkUserRole = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        setIsAdmin(userData?.role === "admin");
      }
    };

    loadEnquiry();
    checkUserRole();
  }, [id, user, fetchEnquiry, fetchCustomer, navigate]);

  const handleConvertToProject = async () => {
    try {
      if (!id) return;
      await convertToProject(id);
      navigate("/dashboard/projects");
    } catch (error) {
      console.error("Error converting to project:", error);
    }
  };

  const handleStatusChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    if (!id || !enquiry) return;

    const newStatus = e.target.value;

    try {
      // Update the state immediately for better UX
      setEnquiry({
        ...enquiry,
        status: newStatus,
      });

      // Then update Firebase
      await updateEnquiryStatus(id, newStatus);

      toast.success("Status updated successfully");
    } catch (error) {
      console.log(error)
      // Revert the state if Firebase update fails
      setEnquiry({
        ...enquiry,
        status: enquiry.status,
      });

      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!enquiry) {
    return (
      <div className="p-6">
        <p className="text-destructive">Enquiry not found</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/enquiries")}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-heading font-semibold">
              Enquiry Details
            </h2>
            <p className="text-sm text-muted-foreground">
              Review the scope, customer and commercial details of this enquiry
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <InvoiceDownloader enquiry={enquiry} />
          {isAdmin && (
            <>
              <Button
                variant="outline"
                onClick={() => navigate(`/dashboard/enquiries/${id}/edit`)}
              >
                <Pencil />
                Edit
              </Button>
              <Button variant="outline" onClick={handleConvertToProject}>
                <ArrowRight />
                Move to Projects
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6 px-[10%] mt-10">
        {/* Basic Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">ID</p>
                <p className="mt-1 text-sm">E-{enquiry.enquiryNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Created At
                </p>
                <p className="mt-1 text-sm">
                  {new Date(enquiry.createdAt).toLocaleDateString('en-GB')}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Deadline
                </p>
                <p className="mt-1 text-sm">
                  {new Date(enquiry.deadLine).toLocaleDateString('en-GB')}
                </p>
              </div>

              <div className="col-span-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Name
                </p>
                <p className="mt-1 text-sm">{enquiry.name}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Description
                </p>
                <p className="mt-1 text-sm">{enquiry.description}</p>
              </div>
              {isAdmin && (
                <div className="col-span-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Status
                  </p>
                  <Select
                    value={enquiry?.status || dropdownData[0]}
                    onValueChange={(value) =>
                      handleStatusChange({
                        target: { value },
                      } as React.ChangeEvent<HTMLSelectElement>)
                    }
                  >
                    <SelectTrigger
                      className={`mt-1 w-max border-transparent text-white *:data-[slot=select-value]:text-white [&_svg:not([class*='text-'])]:text-white ${
                        enquiry?.status === "cancelled"
                          ? "bg-red-500 hover:bg-red-500"
                          : enquiry?.status === "on hold"
                          ? "bg-yellow-500 hover:bg-yellow-500"
                          : enquiry?.status === "moved to projects"
                          ? "bg-green-500 hover:bg-green-500"
                          : "bg-blue-600 hover:bg-blue-600"
                      }`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dropdownData.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="col-span-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Currency Used
                </p>
                <p className="mt-1 text-sm">
                  {enquiry.currency?.name} ({enquiry.currency?.symbol})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Details Section */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent>
            {customerDetails ? (
              <div className="grid grid-cols-2 gap-4">
                {customerDetails.logoUrl && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Logo
                    </p>
                    <img
                      src={customerDetails.logoUrl}
                      alt="Customer Logo"
                      className="mt-1 max-h-20 object-contain"
                    />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Name
                  </p>
                  <p className="mt-1 text-sm">{customerDetails.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Email
                  </p>
                  <p className="mt-1 text-sm">{customerDetails.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    GST Number
                  </p>
                  <p className="mt-1 text-sm">{customerDetails.gstNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    End Client
                  </p>
                  <p className="mt-1 text-sm">{enquiry.endClient}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Address
                  </p>
                  <p className="mt-1 text-sm">{customerDetails.address}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Billing Address
                  </p>
                  <p className="mt-1 text-sm">
                    {customerDetails.billingAddress}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Contact Persons
                  </p>
                  <div className="mt-1 space-y-2">
                    {customerDetails.contactPersons.map((person, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <span className="text-sm text-foreground">
                          {person.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          -
                        </span>
                        <span className="text-sm text-foreground">
                          {person.phone}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No customer details found.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Deliverables Section */}
        <Card>
          <CardHeader>
            {/* scope of work ( deliverables name changed ) */}
            <CardTitle>Scope of Work</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Cost/Hour</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enquiry.deliverables.map((deliverable: Deliverable) => (
                  <TableRow key={deliverable.id}>
                    <TableCell>{deliverable.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {deliverable.hours}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {enquiry.currency?.symbol} {deliverable.costPerHour}
                    </TableCell>
                    <TableCell className="text-right">
                      {enquiry.currency?.symbol} {deliverable.total}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-medium">
                    Grand Total
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {enquiry.currency?.symbol}{" "}
                    {enquiry.deliverables.reduce(
                      (sum: number, d: Deliverable) => sum + d.total,
                      0
                    )}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        {/* Scope of Work Section */}
        <Card>
          <CardHeader>
            {/* Deliverables ( scope of work name changed ) */}
            <CardTitle>Deliverables</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-slate max-w-none prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground"
              dangerouslySetInnerHTML={{ __html: enquiry.scopeOfWork }}
            />
          </CardContent>
        </Card>

        {/* Exclusions Section */}
        <Card>
          <CardHeader>
            <CardTitle>Exclusions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1">
              {enquiry.exclusions.map((exclusion, index) => (
                <li key={index} className="text-sm text-foreground">
                  {exclusion}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Charges Section */}
        <Card>
          <CardHeader>
            <CardTitle>Charges Included</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1">
              {enquiry.charges.map((charge, index) => (
                <li key={index} className="text-sm text-foreground">
                  {charge}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Inputs Required Section */}
        <Card>
          <CardHeader>
            <CardTitle>Inputs Required</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1">
              {enquiry.inputsRequired.map((input, index) => (
                <li key={index} className="text-sm text-foreground">
                  {input}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
