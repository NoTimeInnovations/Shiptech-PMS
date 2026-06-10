import { useCustomerSettlementStore } from "@/store/customerSettlementStore";
import { Customer } from "@/store/customerStore";
import { Enquiry } from "@/store/enquiryStore";
import { Project } from "@/store/projectStore";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CustomerSettlementModal = ({
  customer,
  enquiries,
  isOpen,
  setOpen,
  projects,
}: {
  customer: Customer;
  enquiries: Enquiry[];
  projects: Project[];
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}) => {
  const {
    settlement,
    fetchSettlement,
    addPayment,
    createSettlement,
    editPayment,
    deletePayment,
  } = useCustomerSettlementStore();

  const [paymentInfo, setPaymentInfo] = useState({
    amount: 0,
    paymentRef: "",
    date: new Date().toISOString().split("T")[0], // Default to today's date
  });
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [balanceAmount, setBalanceAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [showCreateSettlementModal, setShowCreateSettlementModal] =
    useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(
    null
  );

  // Calculate the total amount from enquiries
  const calculateSum = () => {
    return projects.reduce((sum, project) => {
      return sum + (project.total_amount ?? 0);
    }, 0);
  };

  // Handle creating a new settlement or adding a payment
  const handleCreateSettlement = async () => {
    try {
      if (paymentInfo.date === "" || paymentInfo.paymentRef === "") {
        toast.error("All fields are required");
        return;
      }

      if (paymentInfo.amount <= 0) {
        toast.error("Amount must be greater than 0");
        return;
      }

      const totalAmount = calculateSum();

      if (paymentInfo.amount > balanceAmount) {
        toast.error(
          "Total amount after payment must be less than or equal to balance"
        );
        return;
      }

      if (settlement?.id) {
        await addPayment(
          settlement.id,
          paymentInfo.amount,
          totalAmount,
          paymentInfo.paymentRef
        );
      } else {
        await createSettlement({
          ...settlement,
          customer_id: customer.id as string,
          project_id: projects[0].id as string,
          amounts_paid: [
            {
              id: Math.random().toString(36).substring(7),
              date: paymentInfo.date,
              amount: paymentInfo.amount,
              paymentRef: paymentInfo.paymentRef,
            },
          ],
        });
      }
      toast.success("Settlement created successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create settlement");
    } finally {
      setPaymentInfo({
        amount: 0,
        paymentRef: "",
        date: new Date().toISOString().split("T")[0],
      });
      setShowCreateSettlementModal(false);
    }
  };

  const handleEditPayment = async () => {
    try {
      if (editIndex === null || !settlement?.id) {
        toast.error("Cannot edit payment: Settlement not found");
        return;
      }

      console.log("paymentInfo", paymentInfo);

      console.log("this is value : ", settlement.amounts_paid[editIndex]);

      if (
        !paymentInfo.date ||
        !paymentInfo.paymentRef ||
        paymentInfo.amount <= 0
      ) {
        toast.error("Invalid payment information");
        return;
      }

      const totalAmount = calculateSum();

      if (
        paymentInfo.amount >
        balanceAmount + settlement.amounts_paid[editIndex].amount
      ) {
        toast.error("Amount is greater than balance amount");
        return;
      }

      await editPayment(
        settlement.id,
        editIndex,
        {
          amount: paymentInfo.amount,
          date: paymentInfo.date,
          paymentRef: paymentInfo.paymentRef,
        },
        totalAmount
      );

      toast.success("Payment updated successfully");
      setShowEditModal(false);
      setEditIndex(null);
      resetPaymentInfo();
    } catch (error) {
      console.error("Error updating payment:", error);
      toast.error("Failed to update payment");
    }
  };

  const handleDeletePayment = async (index: number) => {
    try {
      if (!settlement?.id) {
        toast.error("Settlement not found");
        return;
      }

      const totalAmount = calculateSum();
      await deletePayment(settlement.id, index, totalAmount);

      toast.success("Payment deleted successfully");
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete payment");
    }
  };

  // Reset payment info state
  const resetPaymentInfo = () => {
    setPaymentInfo({
      amount: 0,
      paymentRef: "",
      date: new Date().toISOString().split("T")[0],
    });
  };

  // Open edit modal with selected payment data
  const openEditModal = (index: number) => {
    if (settlement?.amounts_paid && index < settlement.amounts_paid.length) {
      const payment = settlement.amounts_paid[index];
      setPaymentInfo({
        amount: payment.amount,
        paymentRef: payment.paymentRef,
        date: new Date(payment.date).toISOString().split("T")[0],
      });
      setEditIndex(index);
      setShowEditModal(true);
    }
  };

  // Fetch settlement data when the modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSettlement(customer.id as string);
      setTotalAmount(calculateSum());
    }

    return () => {
      resetPaymentInfo();
      setBalanceAmount(0);
      setTotalAmount(0);
      setEditIndex(null);
      setShowEditModal(false);
      setShowDeleteConfirm(null);
    };
  }, [isOpen, fetchSettlement, customer]);

  // Calculate the balance amount
  useEffect(() => {
    const totalAmount = calculateSum();
    const totalPaid =
      settlement?.amounts_paid?.reduce(
        (sum, payment) => sum + payment.amount,
        0
      ) || 0;
    setBalanceAmount(totalAmount - totalPaid);
  }, [settlement, enquiries]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Settlements</DialogTitle>
          </DialogHeader>
          {balanceAmount > 0 && (
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateSettlementModal(true)}>
                Create Settlement
              </Button>
            </div>
          )}
          <div className="mb-4">
            <p>
              <strong>Total Amount:</strong> {totalAmount}
            </p>
            <p>
              <strong>Balance:</strong> {balanceAmount}
            </p>
          </div>
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment Reference</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlement?.amounts_paid?.map((payment, index) => (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.amount}</TableCell>
                    <TableCell>
                      {new Date(payment.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{payment.paymentRef}</TableCell>
                    <TableCell>
                      <div className="flex justify-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(index)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setShowDeleteConfirm(index)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!settlement ||
                  !settlement.amounts_paid ||
                  settlement.amounts_paid.length === 0) && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="p-4 text-center text-muted-foreground"
                    >
                      No settlements made yet!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Settlement Modal */}
      <Dialog
        open={isOpen && showCreateSettlementModal}
        onOpenChange={(open) => !open && setShowCreateSettlementModal(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="create-payment-date">Date</Label>
              <Input
                id="create-payment-date"
                type="date"
                value={paymentInfo.date}
                onChange={(e) =>
                  setPaymentInfo({ ...paymentInfo, date: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-payment-ref">Payment Reference</Label>
              <Input
                id="create-payment-ref"
                type="text"
                value={paymentInfo.paymentRef}
                onChange={(e) =>
                  setPaymentInfo({
                    ...paymentInfo,
                    paymentRef: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-payment-amount">Amount</Label>
              <Input
                id="create-payment-amount"
                type="number"
                value={paymentInfo.amount}
                onChange={(e) =>
                  setPaymentInfo({
                    ...paymentInfo,
                    amount: parseFloat(e.target.value),
                  })
                }
              />
            </div>
            <Button onClick={handleCreateSettlement}>Submit Payment</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Modal */}
      <Dialog
        open={isOpen && showEditModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowEditModal(false);
            setEditIndex(null);
            resetPaymentInfo();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-payment-date">Date</Label>
              <Input
                id="edit-payment-date"
                type="date"
                value={paymentInfo.date}
                onChange={(e) =>
                  setPaymentInfo({ ...paymentInfo, date: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-payment-ref">Payment Reference</Label>
              <Input
                id="edit-payment-ref"
                type="text"
                value={paymentInfo.paymentRef}
                onChange={(e) =>
                  setPaymentInfo({
                    ...paymentInfo,
                    paymentRef: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-payment-amount">Amount</Label>
              <Input
                id="edit-payment-amount"
                type="number"
                value={paymentInfo.amount}
                onChange={(e) =>
                  setPaymentInfo({
                    ...paymentInfo,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <Button onClick={handleEditPayment}>Update Payment</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog
        open={isOpen && showDeleteConfirm !== null}
        onOpenChange={(open) => !open && setShowDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (showDeleteConfirm !== null) {
                  handleDeletePayment(showDeleteConfirm);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CustomerSettlementModal;
