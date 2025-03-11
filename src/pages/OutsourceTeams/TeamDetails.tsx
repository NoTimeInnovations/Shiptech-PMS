import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  useOutsourceTeamStore,
  OutsourceTeam,
} from "@/store/outsourceTeamStore";
import { ArrowLeft, Clock } from "lucide-react";
import { useTaskStore, Task } from "@/store/taskStore";
import { useSettlementStore, Settlement } from "@/store/settlementStore";
import toast from "react-hot-toast";

interface PaymentModalProps {
  settlement: Settlement;
  onClose: () => void;
  onSubmit: (payment: { amount: string; date: string; notes: string }) => void;
  onUndoPayment?: (paymentIndex: number) => void;
  viewOnly?: boolean;
}

const PaymentModal = ({ settlement, onClose, onSubmit, onUndoPayment, viewOnly }: PaymentModalProps) => {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  const totalPaid = settlement.amounts_paid.reduce(
    (sum, payment) => sum + parseFloat(payment.amount),
    0
  );
  const balance = parseFloat(settlement.total_amount) - totalPaid;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[500px]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">
            {viewOnly ? "Payment Details" : "Add Payment"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-lg font-medium">₹{settlement.total_amount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Balance</p>
              <p className="text-lg font-medium">₹{balance.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="font-medium mb-2">Payment History</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {settlement.amounts_paid.map((payment, index) => (
              <div key={index} className="p-2 bg-gray-50 rounded flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">₹{payment.amount}</p>
                  <p className="text-xs text-gray-600">{payment.notes}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-600">
                    {new Date(payment.date).toLocaleDateString()}
                  </p>
                  {onUndoPayment && index === settlement.amounts_paid.length - 1 && !viewOnly && (
                    <button
                      onClick={() => onUndoPayment(index)}
                      className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      Undo
                    </button>
                  )}
                </div>
              </div>
            ))}
            {settlement.amounts_paid.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-2">
                No payments made yet
              </p>
            )}
          </div>
        </div>

        {!viewOnly && (
          <>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (parseFloat(value) <= balance) {
                      setAmount(value);
                    }
                  }}
                  max={balance}
                  className="w-full p-2 border rounded-md"
                  placeholder={`Enter amount (max: ₹${balance.toFixed(2)})`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="Transaction ID or notes"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!amount || !date) {
                    toast.error("Please fill in all required fields");
                    return;
                  }
                  if (parseFloat(amount) > balance) {
                    toast.error("Amount cannot exceed balance");
                    return;
                  }
                  onSubmit({ amount, date, notes });
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Payment
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default function TeamDetails() {
  const { id } = useParams<{ id: string }>();
  const { fetchTeamById } = useOutsourceTeamStore();
  const { fetchTasksByOutsourceTeam } = useTaskStore();
  const { fetchTeamSettlements, addPayment, updateSettlement } = useSettlementStore();
  const [team, setTeam] = useState<OutsourceTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'settlements'>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (id) {
        try {
          setLoading(true);
          const [teamData, tasksData, settlementsData] = await Promise.all([
            fetchTeamById(id),
            fetchTasksByOutsourceTeam(id),
            fetchTeamSettlements(id)
          ]);

          if (!teamData) {
            throw new Error('Team not found');
          }

          setTeam(teamData);
          setTasks(tasksData || []);
          setSettlements(settlementsData || []);
        } catch (error) {
          console.error('Error loading team data:', error);
          toast.error('Failed to load team data');
        } finally {
          setLoading(false);
        }
      }
    };
    loadData();
  }, [id, fetchTeamById, fetchTasksByOutsourceTeam, fetchTeamSettlements]);

  const handlePaymentSubmit = async (payment: { amount: string; date: string; notes: string }) => {
    if (!selectedSettlement) return;

    try {
      await addPayment(selectedSettlement.id, {
        amount: payment.amount,
        date: payment.date,
        notes: payment.notes || ''
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

  const handleUndoPayment = async (paymentIndex: number) => {
    if (!selectedSettlement) return;

    try {
      const updatedPayments = [...selectedSettlement.amounts_paid];
      updatedPayments.pop(); // Remove the last payment

      const totalPaid = updatedPayments.reduce(
        (sum, payment) => sum + parseFloat(payment.amount),
        0
      );
      const status = totalPaid > 0 ? 'partial' : 'pending';

      // Update the settlement in the database
      await updateSettlement(selectedSettlement.id, {
        amounts_paid: updatedPayments,
        status
      });

      // Fetch fresh data from the server
      if (id) {
        const updatedSettlements = await fetchTeamSettlements(id);
        setSettlements(updatedSettlements);

        // Update the selected settlement with the latest data
        const updatedSelectedSettlement = updatedSettlements.find(
          s => s.id === selectedSettlement.id
        );
        if (updatedSelectedSettlement) {
          setSelectedSettlement(updatedSelectedSettlement);
        } else {
          setSelectedSettlement(null);
        }
      }

      toast.success("Payment undone successfully");
    } catch (error) {
      console.error("Error undoing payment:", error);
      toast.error("Failed to undo payment");
    }
  };

  if (loading)
    return (
      <div>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full size-6 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );

  if (!team) return <div>Team not found</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Link
          to="/dashboard/outsource-teams"
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Teams
        </Link>
        <Link
          to={`/dashboard/outsource-teams/${id}/edit`}
          className="bg-black text-white px-4 py-2 rounded-lg hover:bg-black/80"
        >
          Update Team
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">{team.name}</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-6 mb-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">GST Number</h2>
          <p>{team.gst}</p>
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
      </div>

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tasks'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('settlements')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settlements'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Settlements
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'tasks' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              Outsourced Tasks
            </h3>
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{task.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {task.description}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          task.completed
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {task.completed ? "Completed" : "In Progress"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No tasks have been outsourced to this team yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settlements' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              Settlements
            </h3>
            <div className="space-y-4">
              {settlements.map((settlement) => {
                const totalPaid = settlement.amounts_paid.reduce(
                  (sum, payment) => sum + parseFloat(payment.amount),
                  0
                );
                const balance = parseFloat(settlement.total_amount) - totalPaid;

                return (
                  <div
                    key={settlement.id}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">Settlement #{settlement.id.slice(-6)}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Total Amount: ₹{settlement.total_amount}
                        </p>
                        <p className="text-sm text-gray-600">
                          Balance: ₹{balance.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            settlement.status === 'completed'
                              ? "bg-green-100 text-green-800"
                              : settlement.status === 'partial'
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {settlement.status.charAt(0).toUpperCase() + settlement.status.slice(1)}
                        </span>
                        <button
                          onClick={() => setSelectedSettlement(settlement)}
                          className={`px-3 py-1 text-sm rounded hover:bg-opacity-80 ${
                            settlement.status === 'completed'
                              ? "bg-gray-100 text-gray-700"
                              : "bg-blue-600 text-white"
                          }`}
                        >
                          {settlement.status === 'completed' ? 'View Details' : 'Settle'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {settlements.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No settlements found for this team.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedSettlement && (
        <PaymentModal
          settlement={selectedSettlement}
          onClose={() => setSelectedSettlement(null)}
          onSubmit={handlePaymentSubmit}
          onUndoPayment={handleUndoPayment}
          viewOnly={selectedSettlement.status === 'completed'}
        />
      )}
    </div>
  );
}
