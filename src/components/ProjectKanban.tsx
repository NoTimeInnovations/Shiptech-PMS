import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Project } from '../store/projectStore';
import { useNavigate } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ProjectKanbanProps {
    projects: Project[];
    onDragEnd: (result: DropResult) => void;
}

const ProjectKanban: React.FC<ProjectKanbanProps> = ({ projects, onDragEnd }) => {
    const navigate = useNavigate();

    const columns = {
        'not-started': {
            title: 'Not Started',
            items: projects.filter((p) => p.status === 'not-started' && p.id),
            color: 'bg-muted',
            titleColor: 'text-foreground'
        },
        'ongoing': {
            title: 'In Progress',
            items: projects.filter((p) => p.status === 'ongoing' && p.id),
            color: 'bg-blue-50',
            titleColor: 'text-blue-700'
        },
        'completed': {
            title: 'Completed',
            items: projects.filter((p) => p.status === 'completed' && p.id),
            color: 'bg-green-50',
            titleColor: 'text-green-700'
        },
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex flex-col md:flex-row gap-6 h-full overflow-x-auto pb-4">
                {(Object.entries(columns) as [string, typeof columns['not-started']][]).map(([columnId, column]) => (
                    <Card
                        key={columnId}
                        size="sm"
                        className={cn('flex-1 min-w-[300px] gap-4 p-4 shadow-none ring-0', column.color)}
                    >
                        <h3 className={cn('font-semibold', column.titleColor, 'flex items-center justify-between')}>
                            {column.title}
                            <Badge variant="outline" className="bg-background shadow-sm">
                                {column.items.length}
                            </Badge>
                        </h3>

                        <Droppable droppableId={columnId}>
                            {(provided) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="space-y-3 min-h-[200px]"
                                >
                                    {column.items.map((project, index) => (
                                        <Draggable key={project.id!} draggableId={project.id || ''} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    onClick={() => navigate(`/dashboard/projects/${project.id}`)}
                                                    style={{
                                                        ...provided.draggableProps.style,
                                                    }}
                                                >
                                                    <Card
                                                        size="sm"
                                                        className={cn(
                                                            'gap-0 rounded-lg p-4 transition-shadow cursor-pointer hover:shadow-md',
                                                            snapshot.isDragging && 'shadow-lg ring-2 ring-blue-500/50 rotate-2'
                                                        )}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <Badge variant="secondary" className="text-muted-foreground">
                                                                P-{project.projectNumber}
                                                            </Badge>
                                                            {project.project_due_date && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    Due: {new Date(project.project_due_date).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <h4 className="font-medium text-foreground mb-1 line-clamp-2">
                                                            {project.name}
                                                        </h4>

                                                        <div className="text-sm text-muted-foreground mb-2 truncate">
                                                            {project.customer.name}
                                                        </div>

                                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
                                                            <div className="text-xs text-muted-foreground">
                                                                {new Date(project.createdAt).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    </Card>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </Card>
                ))}
            </div>
        </DragDropContext>
    );
};

export default ProjectKanban;
