import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  useOutsourceTeamStore,
  OutsourceTeam,
} from "@/store/outsourceTeamStore";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useTaskStore, Task } from "@/store/taskStore";
import { useSettlementStore, Settlement } from "@/store/settlementStore";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PaymentModalProps {
  settlement: Settlement;
  onClose: () => void;
  onSubmit: (payment: { amount: string; date: string; notes: string }) => void;
  onEditPayment: (
    paymentIndex: number,
    payment: { amount: string; date: string; notes: string }
  ) => void;
  onDeletePayment: (paymentIndex: number) => void;
  viewOnly?: boolean;
}

const PaymentModal = ({
  settlement,
  onClose,
  onSubmit,
  onEditPayment,
  onDeletePayment,
  viewOnly,
}: PaymentModalProps) => {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [editingPaymentIndex, setEditingPaymentIndex] = useState<number | null>(
    null
  );


  const totalPaid = settlement.amounts_paid.reduce(
    (sum, payment) => sum + parseFloat(payment.amount),
    0
  );
  const balance = parseFloat(settlement.total_amount) - totalPaid;

  const handleEditPayment = (index: number) => {
    const payment = settlement.amounts_paid[index];
    setAmount(payment.amount);
    setDate(payment.date);
    setNotes(payment.notes || "");
    setEditingPaymentIndex(index);
  };

  const handleDeletePayment = (index: number) => {
    onDeletePayment(index);
    setEditingPaymentIndex(null);
  };

  const handleSubmit = () => {
    if (!amount || !date) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (parseFloat(amount) > balance) {
      toast.error("Amount cannot exceed balance");
      return;
    }
    if (editingPaymentIndex !== null) {
      onEditPayment(editingPaymentIndex, { amount, date, notes });
    } else {
      onSubmit({ amount, date, notes });
    }
    setAmount("");
    setDate("");
    setNotes("");
    setEditingPaymentIndex(null);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {viewOnly ? "Payment Details" : "Add Payment"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 bg-muted rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-lg font-medium">₹{settlement.total_amount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className="text-lg font-medium">₹{balance.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Payment History</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {settlement.amounts_paid.map((payment, index) => (
              <div
                key={index}
                className="p-2 bg-muted rounded flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-medium">₹{payment.amount}</p>
                  <p className="text-xs text-muted-foreground">{payment.notes}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    {new Date(payment.date).toLocaleDateString()}
                  </p>
                  {!viewOnly && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditPayment(index)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePayment(index)}
                        className="text-xs text-destructive hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {settlement.amounts_paid.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                No payments made yet
              </p>
            )}
          </div>
        </div>

        {!viewOnly && (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Amount</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (Number(value) <= balance) {
                      setAmount(value);
                    }else{
                      toast.error("Amount cannot exceed balance");
                    }
                  }}
                  max={balance}
                  placeholder={`Enter amount (max: ₹${balance.toFixed(2)})`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-date">Date</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-notes">Notes</Label>
                <Input
                  id="payment-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Transaction ID or notes"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingPaymentIndex !== null
                  ? "Update Payment"
                  : "Add Payment"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default function TeamDetails() {
  const { id } = useParams<{ id: string }>();
  const { fetchTeamById } = useOutsourceTeamStore();
  const { fetchTasksByOutsourceTeam } = useTaskStore();
  const { fetchTeamSettlements, addPayment, deletePayment,editPayment } =
    useSettlementStore();
  const [team, setTeam] = useState<OutsourceTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [selectedSettlement, setSelectedSettlement] =
    useState<Settlement | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (id) {
        try {
          setLoading(true);
          const [teamData, tasksData, settlementsData] = await Promise.all([
            fetchTeamById(id),
            fetchTasksByOutsourceTeam(id),
            fetchTeamSettlements(id),
          ]);

          if (!teamData) {
            throw new Error("Team not found");
          }

          setTeam(teamData);
          setTasks(tasksData || []);
          setSettlements(settlementsData || []);
        } catch (error) {
          console.error("Error loading team data:", error);
          toast.error("Failed to load team data");
        } finally {
          setLoading(false);
        }
      }
    };
    loadData();
  }, [id, fetchTeamById, fetchTasksByOutsourceTeam, fetchTeamSettlements]);

  const handlePaymentSubmit = async (payment: {
    amount: string;
    date: string;
    notes: string;
  }) => {
    if (!selectedSettlement) return;

    try {
      await addPayment(selectedSettlement.id, {
        amount: payment.amount,
        date: payment.date,
        notes: payment.notes || "",
      });

      // Fetch updated settlements after adding payment
      if (id) {
        const updatedSettlements = await fetchTeamSettlements(id);
        setSettlements(updatedSettlements);
      }

      setSelectedSettlement(null);
      toast.success("Payment added successfully");
    } catch (error) {
      console.error("Error adding payment:", error);
      toast.error("Failed to add payment");
    }
  };

  const handleEditPayment = async (
    paymentIndex: number,
    payment: { amount: string; date: string; notes: string }
  ) => {
    if (!selectedSettlement) return;

    try {
      await editPayment(selectedSettlement.id, paymentIndex, payment);

      // Fetch updated settlements after editing payment
      if (id) {
        const updatedSettlements = await fetchTeamSettlements(id);
        setSettlements(updatedSettlements);
      }

      setSelectedSettlement(null);
      toast.success("Payment updated successfully");
    } catch (error) {
      console.error("Error updating payment:", error);
      toast.error("Failed to update payment");
    }
  };

  const handleDeletePayment = async (paymentIndex: number) => {
    if (!selectedSettlement) return;

    try {
      await deletePayment(selectedSettlement.id, paymentIndex);

      // Fetch updated settlements after deleting payment
      if (id) {
        const updatedSettlements = await fetchTeamSettlements(id);
        setSettlements(updatedSettlements);
      }

      setSelectedSettlement(null);
      toast.success("Payment deleted successfully");
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast.error("Failed to delete payment");
    }
  };

  // Combine tasks with their corresponding settlements
  const combinedData = tasks.map((task) => {
    const taskSettlement = settlements.find(
      (settlement) => settlement.task_id === task.id
    );
    return {
      task,
      settlement: taskSettlement || null,
    };
  });

  if (loading)
    return (
      <div>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );

  if (!team) return <div className="p-6 text-muted-foreground">Team not found</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Button asChild variant="ghost">
          <Link to="/dashboard/outsource-teams">
            <ArrowLeft size={20} />
            Back to Teams
          </Link>
        </Button>
        <Button asChild>
          <Link to={`/dashboard/outsource-teams/${id}/edit`}>
            Update Team
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-heading font-semibold mb-6">{team.name}</h1>

      <Card className="mb-6">
        <CardContent className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">GST Number</h2>
            <p>{team.gst ? team.gst : "Not provided"}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Address</h2>
            <p className="whitespace-pre-wrap">{team.address}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Billing Address</h2>
            <p className="whitespace-pre-wrap">
              {team.isBillingAddressSame ? team.address : team.billingAddress}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Contact Persons</h2>
            <div className="space-y-2">
              {team.contactPersons.map((person, index) => (
                <div key={index} className="flex gap-4">
                  <span>{person.name}</span>
                  <span>{person.phone}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">
              Outsourced Tasks and Settlement Status
            </h2>
            <div className="space-y-4">
              {combinedData.map(({ task, settlement }) => (
                <div key={task.id} className="border border-border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{task.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.description}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <Badge
                        className={
                          task.completed
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        Task is : {task.completed ? "Completed" : "In Progress"}
                      </Badge>
                    </div>
                  </div>
                  {settlement && (
                    <div className="mt-2">
                      <h5 className="font-medium">Settlement Details</h5>
                      <p className="text-sm text-muted-foreground">
                        Total Amount: ₹{settlement.total_amount}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Balance: ₹
                        {(
                          parseFloat(settlement.total_amount) -
                          settlement.amounts_paid.reduce(
                            (sum, payment) => sum + parseFloat(payment.amount),
                            0
                          )
                        ).toFixed(2)}
                      </p>
                      <Badge
                        className={
                          settlement.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : settlement.status === "partial"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }
                        onClick={() => setSelectedSettlement(settlement)}
                      >
                        {settlement.status.charAt(0).toUpperCase() +
                          settlement.status.slice(1)}
                      </Badge>
                      <Button
                        size="sm"
                        variant={settlement.status === "completed" ? "secondary" : "default"}
                        onClick={() => setSelectedSettlement(settlement)}
                        className="mt-2 ml-2"
                      >
                        {settlement.status === "completed"
                          ? "View Details"
                          : "Settle"}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {combinedData.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No tasks or settlements found for this team.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedSettlement && (
        <PaymentModal
          settlement={selectedSettlement}
          onClose={() => setSelectedSettlement(null)}
          onSubmit={handlePaymentSubmit}
          onEditPayment={handleEditPayment}
          onDeletePayment={handleDeletePayment}
          viewOnly={selectedSettlement.status === "completed"}
        />
      )}
    </div>
  );
}
