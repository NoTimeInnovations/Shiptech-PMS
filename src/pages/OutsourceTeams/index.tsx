import { useEffect, useState } from "react";
import { Link, Routes, Route } from "react-router-dom";
import {
  OutsourceTeam,
  useOutsourceTeamStore,
} from "@/store/outsourceTeamStore";
import { Settlement, useSettlementStore } from "@/store/settlementStore";
import NewTeam from "./NewTeam";
import TeamDetails from "./TeamDetails";
import EditTeam from "./EditTeam";
import { Edit, ExternalLink, Loader2, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function TeamsList() {
  const { teams, loading, fetchTeams, deleteTeam } = useOutsourceTeamStore();
  const { fetchTeamSettlements } = useSettlementStore();
  const [paymentStatuses, setPaymentStatuses] = useState<{
    [teamId: string]: string;
  }>({});

  useEffect(() => {
    fetchTeams().then(() => {
      teams.forEach(async (team: OutsourceTeam) => {
        if (team.id) {
          const settlements = await fetchTeamSettlements(team.id);
          const status = determinePaymentStatus(settlements);
          setPaymentStatuses((prev) => ({
            ...prev,
            [team.id as string]: status,
          }));
        }
      });
    });
  }, [teams]);


  const determinePaymentStatus = (settlements: Settlement[]): string => {
    if (settlements.length === 0) return "No payments";
    if (settlements.some((s) => s.status === "pending"))
      return "Pending payment";
    if (settlements.some((s) => s.status === "partial"))
      return "Partially paid";
    return "Completed payment";
  };

  if (loading)
    return (
      <div>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Outsource Teams</h1>
          <p className="text-muted-foreground">Manage external teams and their payments</p>
        </div>
        <Button asChild>
          <Link to="new">Add New Team</Link>
        </Button>
      </div>

      <Card className="py-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Name</TableHead>
              <TableHead className="text-center">GST</TableHead>
              <TableHead className="text-center">Contact Persons</TableHead>
              <TableHead className="text-center">Payment Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team) => (
              <TableRow key={team.id} className="text-center">
                <TableCell>{team.name}</TableCell>
                <TableCell>{team.gst ? team.gst : "Not provided"}</TableCell>
                <TableCell>
                  {team.contactPersons.map((person, index) => (
                    <div key={index}>
                      {person.name} - {person.phone}
                    </div>
                  ))}
                </TableCell>
                <TableCell>
                  <Badge
                    className={`${
                      paymentStatuses[team.id as string] === "Pending payment"
                        ? "bg-yellow-500"
                        : paymentStatuses[team.id as string] ===
                          "Partially paid"
                        ? "bg-orange-500"
                        : paymentStatuses[team.id as string] ===
                          "Completed payment"
                        ? "bg-green-500"
                        : "bg-gray-300"
                    } text-white`}
                  >
                    {paymentStatuses[team.id as string] || "Loading..."}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center gap-1">
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Link to={`${team.id}`}>
                        <ExternalLink size={18} />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="text-green-600 hover:text-green-700"
                    >
                      <Link to={`${team.id}/edit`}>
                        <Edit size={18} />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTeam(team.id as string)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash size={18} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export default function OutsourceTeams() {
  return (
    <Routes>
      <Route path="/" element={<TeamsList />} />
      <Route path="/new" element={<NewTeam />} />
      <Route path="/:id" element={<TeamDetails />} />
      <Route path="/:id/edit" element={<EditTeam />} />
    </Routes>
  );
}
