import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  useOutsourceTeamStore,
  OutsourceTeam,
} from "@/store/outsourceTeamStore";
import { ArrowLeft } from "lucide-react";

export default function TeamDetails() {
  const { id } = useParams<{ id: string }>();
  const { fetchTeamById } = useOutsourceTeamStore();
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

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
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
    </div>
  );
}
