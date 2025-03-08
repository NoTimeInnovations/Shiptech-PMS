import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useOutsourceTeamStore, OutsourceTeam } from "@/store/outsourceTeamStore";
import { ArrowLeft } from "lucide-react";

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
          <div className="animate-spin rounded-full size-6 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!team) return <div>Team not found</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Link
          to={`/dashboard/outsource-teams/${id}`}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Details
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Edit Team</h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={team.name}
            onChange={(e) => setTeam({ ...team, name: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            GST Number
          </label>
          <input
            type="text"
            value={team.gst}
            onChange={(e) => setTeam({ ...team, gst: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Address
          </label>
          <textarea
            value={team.address}
            onChange={(e) => setTeam({ ...team, address: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            rows={3}
            required
          />
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={team.isBillingAddressSame}
              onChange={(e) =>
                setTeam({ ...team, isBillingAddressSame: e.target.checked })
              }
              className="rounded border-gray-300"
            />
            <span className="ml-2">Billing address same as address</span>
          </label>
        </div>

        {!team.isBillingAddressSame && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Billing Address
            </label>
            <textarea
              value={team.billingAddress}
              onChange={(e) =>
                setTeam({ ...team, billingAddress: e.target.value })
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              rows={3}
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contact Persons
          </label>
          {team.contactPersons.map((person, index) => (
            <div key={index} className="flex gap-4 mb-2">
              <input
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
                className="rounded-md border border-gray-300 px-3 py-2"
              />
              <input
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
                className="rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setTeam({
                ...team,
                contactPersons: [...team.contactPersons, { name: "", phone: "" }],
              })
            }
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            + Add Contact Person
          </button>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-black/80"
          >
            Update Team
          </button>
        </div>
      </form>
    </div>
  );
} 