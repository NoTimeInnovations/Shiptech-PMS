import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useOutsourceTeamStore, OutsourceTeam } from "@/store/outsourceTeamStore";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export default function EditTeam() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchTeamById, updateTeam } = useOutsourceTeamStore();
  const [team, setTeam] = useState<OutsourceTeam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeam = async () => {
      if (id) {
        const teamData = await fetchTeamById(id);
        setTeam(teamData);
        setLoading(false);
      }
    };
    loadTeam();
  }, [id, fetchTeamById]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (team && id) {
      await updateTeam(id, team);
      navigate(`/dashboard/outsource-teams/${id}`);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!team) return <div className="p-6 text-muted-foreground">Team not found</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Button asChild variant="ghost">
          <Link to={`/dashboard/outsource-teams/${id}`}>
            <ArrowLeft size={20} />
            Back to Details
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-heading font-semibold mb-1">Edit Team</h1>
      <p className="text-muted-foreground mb-6">Update the team's details</p>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="space-y-2">
          <Label htmlFor="edit-team-name">Name</Label>
          <Input
            id="edit-team-name"
            type="text"
            value={team.name}
            onChange={(e) => setTeam({ ...team, name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-team-gst">GST Number</Label>
          <Input
            id="edit-team-gst"
            type="text"
            value={team.gst}
            onChange={(e) => setTeam({ ...team, gst: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-team-address">Address</Label>
          <Textarea
            id="edit-team-address"
            value={team.address}
            onChange={(e) => setTeam({ ...team, address: e.target.value })}
            rows={3}
            required
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="edit-billing-same"
            checked={team.isBillingAddressSame}
            onCheckedChange={(checked) =>
              setTeam({ ...team, isBillingAddressSame: checked === true })
            }
          />
          <Label htmlFor="edit-billing-same">Billing address same as address</Label>
        </div>

        {!team.isBillingAddressSame && (
          <div className="space-y-2">
            <Label htmlFor="edit-billing-address">Billing Address</Label>
            <Textarea
              id="edit-billing-address"
              value={team.billingAddress}
              onChange={(e) =>
                setTeam({ ...team, billingAddress: e.target.value })
              }
              rows={3}
              required
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Contact Persons</Label>
          {team.contactPersons.map((person, index) => (
            <div key={index} className="flex gap-4 mb-2">
              <Input
                type="text"
                value={person.name}
                onChange={(e) => {
                  const newContactPersons = [...team.contactPersons];
                  newContactPersons[index] = {
                    ...person,
                    name: e.target.value,
                  };
                  setTeam({ ...team, contactPersons: newContactPersons });
                }}
                placeholder="Name"
              />
              <Input
                type="text"
                value={person.phone}
                onChange={(e) => {
                  const newContactPersons = [...team.contactPersons];
                  newContactPersons[index] = {
                    ...person,
                    phone: e.target.value,
                  };
                  setTeam({ ...team, contactPersons: newContactPersons });
                }}
                placeholder="Phone"
              />
            </div>
          ))}
          <Button
            type="button"
            variant="link"
            className="px-0"
            onClick={() =>
              setTeam({
                ...team,
                contactPersons: [...team.contactPersons, { name: "", phone: "" }],
              })
            }
          >
            + Add Contact Person
          </Button>
        </div>

        <div className="flex justify-end">
          <Button type="submit">Update Team</Button>
        </div>
      </form>
    </div>
  );
}
