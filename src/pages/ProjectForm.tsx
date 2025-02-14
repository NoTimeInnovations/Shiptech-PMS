import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Loader2, Trash2, ArrowLeft } from "lucide-react";
import { useProjectStore } from "../store/projectStore";
import toast from "react-hot-toast";

interface User {
  id: string;
  fullName: string;
  email: string;
}

interface Task {
  id: string;
  name: string;
  description: string;
  hours?: number;
  costPerHour?: number;
  assignedTo?: User[];
  deadline?: string;
  completed: boolean;
  children: Task[];
}

interface FormData {
  name: string;
  description: string;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  tasks: Task[];
  status: "completed" | "ongoing" | "not-started"; // Add status property
}

export default function ProjectForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { createProject, updateProject, fetchProject, loading } =
    useProjectStore();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    customer: {
      name: "",
      phone: "",
      address: "",
    },
    status: "not-started", // Initialize status property
    tasks: [],
  });

  useEffect(() => {
    const loadProject = async () => {
      if (id) {
        const project = await fetchProject(id);
        if (project) {
          setFormData({
            name: project.name,
            status: project.status || "",
            description: project.description,
            customer: project.customer,
            tasks: project.tasks || [],
          });
        }
      }
    };

    loadProject();
  }, [id, fetchProject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (id) {
        await updateProject(id, formData);
        toast.success("Project updated successfully");
      } else {
        await createProject(formData);
        toast.success("Project created successfully");
      }
      navigate("/dashboard/projects");
    } catch (error) {
      toast.error(id ? "Failed to update project" : "Failed to create project");
    }
  };

  return (
    <form onSubmit={handleSubmit} className=" p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button type="button" onClick={() => navigate(-1)}>
            <ArrowLeft className=" h-7 w-7" />
          </button>
          <h2 className="text-2xl font-bold">
            {id ? "Edit Project" : "Create New Project"}
          </h2>
        </div>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black/90 hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                {id ? "Updating..." : "Creating..."}
              </>
            ) : id ? (
              "Update Project"
            ) : (
              "Create Project"
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-3 px-[10%]">
        <div className="space-y-6 bg-white border-[1px] rounded-xl px-6 py-10">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Project Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="bg-white px-6 py-10 border-[1px] rounded-xl">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Customer Details
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                required
                value={formData.customer.name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    customer: { ...prev.customer, name: e.target.value },
                  }))
                }
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                type="tel"
                required
                value={formData.customer.phone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    customer: { ...prev.customer, phone: e.target.value },
                  }))
                }
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <textarea
                required
                value={formData.customer.address}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    customer: { ...prev.customer, address: e.target.value },
                  }))
                }
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={2}
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
