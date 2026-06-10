import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useTaskStore } from "@/store/taskStore";
import { ChevronDown, ChevronUp, File } from "lucide-react";
import { Link } from "react-router-dom";
// Add project store import
import { useProjectStore } from "@/store/projectStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function MyTasks() {
  const { user, userData } = useAuthStore();
  const { fetchUserTasks, tasks } = useTaskStore();
  const { projects, fetchProjects } = useProjectStore(); // Add project store
  const [expandedTaskRows, setExpandedTaskRows] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed'>('ongoing');
  const [filteredTasks, setFilteredTasks] = useState(tasks);

  useEffect(() => {
    const fetchData = async () => {
      if (user && userData) {
        await fetchUserTasks({
          id: user.uid,
          name: userData.fullName,
          email: userData.email,
        });
      }
      if(projects.length === 0) {
        await fetchProjects();
      }
    };
    fetchData();
  }, [user, userData, fetchUserTasks, fetchProjects]);

  useEffect(() => {
    const filtered = activeTab === 'ongoing'
      ? tasks.filter(task => {
          const project = projects.find(p => p.id === task.projectId);
          return !task.completed && project?.status !== 'completed';
        })
      : tasks.filter(task => {
          const project = projects.find(p => p.id === task.projectId);
          return task.completed && project?.status !== 'completed';
        });
    setFilteredTasks(filtered);
  }, [tasks, activeTab, projects]);

  const toggleTaskRowExpansion = (id: string) => {
    const newExpandedTaskRows = new Set(expandedTaskRows);
    if (newExpandedTaskRows.has(id)) {
      newExpandedTaskRows.delete(id);
    } else {
      newExpandedTaskRows.add(id);
    }
    setExpandedTaskRows(newExpandedTaskRows);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-heading font-semibold mb-1">My Tasks</h1>
      <p className="text-muted-foreground mb-4">Tasks assigned to you across projects</p>

      {/* Tab Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'ongoing' | 'completed')}
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredTasks.length > 0 ? (
        <Card className="py-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Task Name</TableHead>
                <TableHead className="text-center">Time Entries</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right pr-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => (
                <React.Fragment key={task.id}>
                  <TableRow
                    onClick={() => toggleTaskRowExpansion(task.id)}
                    className="hover:cursor-pointer text-center"
                  >
                    <TableCell className="font-medium">
                      {task.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {task.timeEntries
                        ? task.timeEntries
                            .filter(entry => entry.userId === user?.uid) // Filter by user ID
                            .reduce((total, entry) => total + entry.duration, 0) / 60 // Convert to hours
                        : 0}{" "}
                      hours
                    </TableCell>
                    <TableCell>
                      <Badge variant={task.completed ? "default" : "secondary"}>
                        {task.completed ? "completed" : "incomplete"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-12">
                      <Button variant="ghost" size="icon">
                        {expandedTaskRows.has(task.id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedTaskRows.has(task.id) && (
                    <TableRow>
                      <TableCell colSpan={4} className="bg-muted/50">
                        <div className="space-y-1">
                          <h3 className="font-semibold">Task Details:</h3>
                          <p>Description: {task.description}</p>
                          <p>Assigned To: {task.assignedTo?.map(user => user.name).join(", ")}</p>
                          <p>Deadline:{task.deadline? new Date(task.deadline).toLocaleString("en-GB") : "No deadline set"}</p>

                          <Link to={`/dashboard/projects/${task.projectId}`} className="text-primary flex items-center gap-1 hover:cursor-pointer underline-offset-4 hover:underline"><File size={18} /> Go to project</Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold">No {activeTab === 'ongoing' ? 'Ongoing' : 'Completed'} Tasks</h2>
            <p className="text-muted-foreground">You have no {activeTab === 'ongoing' ? 'ongoing' : 'completed'} tasks.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
