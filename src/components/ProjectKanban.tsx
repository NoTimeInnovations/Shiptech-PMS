import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Project } from '../store/projectStore';
import { useNavigate } from 'react-router-dom';

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
            color: 'bg-gray-100',
            titleColor: 'text-gray-700'
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
                    <div key={columnId} className={`flex-1 min-w-[300px] rounded-lg p-4 ${column.color}`}>
                        <h3 className={`font-semibold mb-4 ${column.titleColor} flex items-center justify-between`}>
                            {column.title}
                            <span className="bg-white px-2 py-0.5 rounded-full text-xs shadow-sm">
                                {column.items.length}
                            </span>
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
                                                    className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500 ring-opacity-50 rotate-2' : ''
                                                        }`}
                                                    style={{
                                                        ...provided.draggableProps.style,
                                                    }}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                            P-{project.projectNumber}
                                                        </span>
                                                        {project.project_due_date && (
                                                            <span className="text-xs text-gray-500">
                                                                Due: {new Date(project.project_due_date).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h4 className="font-medium text-gray-900 mb-1 line-clamp-2">
                                                        {project.name}
                                                    </h4>

                                                    <div className="text-sm text-gray-600 mb-2 truncate">
                                                        {project.customer.name}
                                                    </div>

                                                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                                                        <div className="text-xs text-gray-400">
                                                            {new Date(project.createdAt).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                ))}
            </div>
        </DragDropContext>
    );
};

export default ProjectKanban;
