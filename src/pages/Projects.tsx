import { useEffect, useState } from "react";
import { Project, useProjectStore } from "../store/projectStore";
import { useCustomerSettlementStore } from "@/store/customerSettlementStore";
import { Loader2, ExternalLink, Plus, Trash2, LayoutGrid, List } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import ProjectStatusSelect from "@/components/ProjectStatusSelect";
import toast from "react-hot-toast";
import ProjectKanban from "@/components/ProjectKanban";
import { DropResult } from "@hello-pangea/dnd";
import { useTaskStore } from "@/store/taskStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Projects() {
  const { projects, loading, deleteProject, fetchProjects, updateProjectStatus } = useProjectStore();
  const {
    fetchAllSettlements,
    settlements,
    loading: settlementsLoading
  } = useCustomerSettlementStore();
  const { hasIncompleteTasks } = useTaskStore();
  const navigate = useNavigate();

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'board'>(() => {
    const saved = localStorage.getItem('project_view_mode');
    return (saved as 'list' | 'board') || 'list';
  });

  useEffect(() => {
    localStorage.setItem('project_view_mode', viewMode);
  }, [viewMode]);

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteProject(projectId);
      toast.success('Project deleted successfully');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  // Get settlement status for a project's customer
  const getSettlementStatus = (customerId: string) => {
    if (settlementsLoading) return "Loading...";

    const settlement = settlements.find(s => s.customer_id === customerId);
    if (!settlement) return "No settlement";

    // Customize this based on your status display preferences
    switch (settlement.status) {
      case "completed":
        return "Paid";
      case "partial":
        return "Partial";
      case "pending":
        return "Pending";
      default:
        return settlement.status;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (projects.length === 0) {
        await fetchProjects();
      }
      await fetchAllSettlements();
      setIsInitialLoad(false);
    };

    fetchData();
  }, []);

  const isLoading = isInitialLoad || loading || settlementsLoading;
  const [activeTab, setActiveTab] = useState<'in-progress' | 'completed'>('in-progress');
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (projects.length > 0) {

      const sortedProjects = [...projects].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const filtered = activeTab === 'in-progress'
        ? sortedProjects.filter(project =>
          project.status === "not-started" || project.status === "ongoing"
        )
        : sortedProjects.filter(project =>
          project.status === "completed"
        );

      setFilteredProjects(filtered);
    }
  }, [projects, activeTab]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as Project['status'];

    if (newStatus === 'completed') {
      const hasIncomplete = await hasIncompleteTasks(draggableId);
      if (hasIncomplete) {
        toast.error('Cannot complete project with pending tasks');
        return;
      }
    }

    try {
      await updateProjectStatus(draggableId, newStatus);
      toast.success('Project status updated');
    } catch (error) {
      console.error('Error updating project status:', error);
      toast.error('Failed to update project status');
    }
  };

  // Modify the table body to use filteredProjects instead of direct filtering
  return (
    <div className="p-6">
      <div className="mb-6 flex sm:flex-row flex-col gap-3 justify-between items-center">
        <h2 className="text-2xl font-heading font-semibold">Projects</h2>
        <div className="flex items-center space-x-4">
          <div className="bg-muted p-1 rounded-lg flex items-center">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon-sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-background shadow-sm hover:bg-background' : 'text-muted-foreground'}
              title="List View"
            >
              <List size={20} />
            </Button>
            <Button
              variant={viewMode === 'board' ? 'secondary' : 'ghost'}
              size="icon-sm"
              onClick={() => setViewMode('board')}
              className={viewMode === 'board' ? 'bg-background shadow-sm hover:bg-background' : 'text-muted-foreground'}
              title="Board View"
            >
              <LayoutGrid size={20} />
            </Button>
          </div>
          <Button onClick={() => navigate('/dashboard/projects/new')}>
            <Plus />
            Create New Project
          </Button>
        </div>
      </div>

      {viewMode === 'list' && (
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'in-progress' | 'completed')}
          className="mb-6"
        >
          <TabsList>
            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        viewMode === 'list' ? (
          <Card className="w-full overflow-hidden py-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">Project Number</TableHead>
                    <TableHead className="text-center">Name</TableHead>
                    <TableHead className="text-center">Customer</TableHead>
                    <TableHead className="text-center">Created On</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Payment Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {
                    filteredProjects.length > 0 ? (
                      <>
                        {filteredProjects.map((project) => (
                          <TableRow
                            onClick={() => navigate(`/dashboard/projects/${project.id}`)}
                            key={project.id}
                            className="hover:cursor-pointer text-center"
                          >
                            <TableCell className="text-center text-muted-foreground">
                              P-{project.projectNumber}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {project.name.length > 40
                                ? `${project.name.slice(0, 40)}...`
                                : project.name}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              {project.customer.name}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              {new Date(project.createdAt).toLocaleDateString("en-GB")}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              <ProjectStatusSelect
                                project={{
                                  id: project.id as string,
                                  status: project.status,
                                }}
                              />
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              {getSettlementStatus(project.customer_id)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end items-center space-x-1">
                                <Button
                                  asChild
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Link to={`/dashboard/projects/${project.id}`}>
                                    <ExternalLink className="text-blue-800" size={18} />
                                  </Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteProject(project.id!);
                                  }}
                                  className="text-destructive hover:text-destructive"
                                  title="Delete project"
                                >
                                  <Trash2 size={18} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </>) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                          No projects found.
                        </TableCell>
                      </TableRow>
                    )
                  }
                </TableBody>
              </Table>
            </div>
          </Card>
        ) : (
          <div className="h-[calc(100vh-200px)]">
            <ProjectKanban projects={projects} onDragEnd={handleDragEnd} />
          </div>
        )
      )}
    </div>
  );
}
