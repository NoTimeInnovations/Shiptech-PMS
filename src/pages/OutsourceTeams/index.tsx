import { useEffect } from "react";
import { Link, Routes, Route } from "react-router-dom";
import { useOutsourceTeamStore } from "@/store/outsourceTeamStore";
import NewTeam from "./NewTeam";
import TeamDetails from "./TeamDetails";
import EditTeam from "./EditTeam";

function TeamsList() {
  const { teams, loading, fetchTeams } = useOutsourceTeamStore();

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  if (loading)
    return (
      <div>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full size-6 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Outsource Teams</h1>
        <Link
          to="new"
          className="bg-black text-white px-4 py-2 rounded-lg hover:bg-black/80"
        >
          Add New Team
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead>
            <tr className="border-b">
              <th className="px-6 py-3 text-left">Name</th>
              <th className="px-6 py-3 text-left">GST</th>
              <th className="px-6 py-3 text-left">Contact Persons</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id} className="border-b">
                <td className="px-6 py-4">{team.name}</td>
                <td className="px-6 py-4">{team.gst}</td>
                <td className="px-6 py-4">
                  {team.contactPersons.map((person, index) => (
                    <div key={index}>
                      {person.name} - {person.phone}
                    </div>
                  ))}
                </td>
                <td className="px-6 py-4">
                  <Link
                    to={`${team.id}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
