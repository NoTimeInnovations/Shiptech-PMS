import { Task, useTaskStore } from "../store/taskStore";
import { ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import CompletionSummaryModal from "./CompletionSummaryModal";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const statusOptions = [
  {
    value: "completed",
    label: "Completed",
    color: "bg-green-100 text-green-700",
  },
  {
    value: "not-started",
    label: "Not Started",
    color: "bg-red-100 text-red-700",
  },
  { value: "ongoing", label: "Ongoing", color: "bg-blue-100 text-blue-700" },
];

interface ProjectStatusSelectProps {
  project: {
    id: string;
    status: "completed" | "ongoing" | "not-started";
  };
  updateProjectStatus?: (
    projectId: string,
    status: "completed" | "ongoing" | "not-started"
  ) => Promise<void>;
  tasks?: Task[];
}

const ProjectStatusSelect = ({
  project,
  updateProjectStatus,
  tasks = [],
}: ProjectStatusSelectProps) => {
  const { fetchAllTasksWithChildren } = useTaskStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selected, setSelected] = useState(statusOptions[1]);

  useEffect(() => {
    const currentStatus =
      statusOptions.find((s) => s.value == project?.status) ?? statusOptions[1];

    setSelected(currentStatus);
  }, [project]);

  const handleStatusChange = async (option: (typeof statusOptions)[0]) => {
    if (option.value === "completed") {
      // Check if all tasks are completed

      const allTasks = await fetchAllTasksWithChildren(project.id);

      const hasUncompletedTasks = allTasks.some((task) => {
        const checkTaskCompletion = (t: Task): boolean => {
          if (!t.completed) return true;
          if (t.children && t.children.length > 0) {
            return t.children.some(checkTaskCompletion);
          }
          return false;
        };
        return checkTaskCompletion(task);
      });

      if (hasUncompletedTasks) {
        toast.error(
          "All tasks must be completed before marking project as complete"
        );
        return;
      }

      setShowCompletionModal(true);
    }

    if (updateProjectStatus && project.id) {
      await updateProjectStatus(
        project.id,
        option.value as "completed" | "ongoing" | "not-started"
      );
    }

    setSelected(option);
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative inline-block">
        <div className="flex gap-3">
          <DropdownMenu
            open={updateProjectStatus ? isOpen : false}
            onOpenChange={(open) => {
              if (updateProjectStatus) setIsOpen(open);
            }}
          >
            {/* Selected Status (Badge) */}
            <DropdownMenuTrigger asChild disabled={!updateProjectStatus}>
              <button
                type="button"
                className={cn(
                  updateProjectStatus
                    ? "cursor-pointer text-base"
                    : "text-[12px]",
                  "flex items-center gap-1 justify-center px-4 py-2 rounded-2xl text-sm text-center transition-all outline-hidden",
                  selected.color
                )}
              >
                {selected.label}

                {updateProjectStatus && (
                  <ChevronDown
                    className={cn(isOpen && "rotate-180", "transition-all")}
                    size={20}
                  />
                )}
              </button>
            </DropdownMenuTrigger>

            {/* Dropdown Menu */}
            <DropdownMenuContent align="start" className="min-w-[10rem] p-0">
              {statusOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  className={cn(
                    "cursor-pointer rounded-none px-4 py-2 text-sm",
                    option.color
                  )}
                  onClick={() => handleStatusChange(option)}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {window.location.pathname !== "/dashboard/projects" &&
            project.status === "completed" && (
              <Button
                onClick={() => setShowCompletionModal(!showCompletionModal)}
                className="rounded-2xl bg-blue-600 text-white hover:bg-blue-700"
              >
                Show Time Status
              </Button>
            )}
        </div>
      </div>

      <CompletionSummaryModal
        isOpen={showCompletionModal}
        onClose={() => {
          setShowCompletionModal(false);
          // Reset selected status if user cancels
          setSelected(
            statusOptions.find((s) => s.value === project.status) ||
              statusOptions[1]
          );
        }}
        onComplete={async () => {
          setShowCompletionModal(false);
        }}
        tasks={tasks}
      />
    </>
  );
};

export default ProjectStatusSelect;
