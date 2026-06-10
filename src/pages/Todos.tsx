import React, { useEffect, useState } from 'react';
import { useTodoStore } from '../store/todoStore';
import { Plus, Pencil, Trash2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';

interface TodoFormData {
  title: string;
  description: string;
  endDate: string;
}

export default function Todos() {
  const { todos, loading, addTodo, updateTodo, deleteTodo, fetchUserTodos, toggleTodoComplete } = useTodoStore();
  const [showModal, setShowModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<string | null>(null);
  const [formData, setFormData] = useState<TodoFormData>({
    title: '',
    description: '',
    endDate: ''
  });

  useEffect(() => {
    fetchUserTodos();
  }, [fetchUserTodos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTodo) {
        await updateTodo(editingTodo, formData);
        toast.success('Todo updated successfully');
      } else {
        await addTodo(formData.title, formData.description, formData.endDate, undefined, undefined, null, null, null, null, null);
        toast.success('Todo added successfully');
      }
      setShowModal(false);
      setEditingTodo(null);
      setFormData({ title: '', description: '', endDate: '' });
    } catch (error) {
      toast.error('Failed to save todo');
    }
  };

  const handleEdit = (todo: any) => {
    setFormData({
      title: todo.title,
      description: todo.description,
      endDate: todo.endDate
    });
    setEditingTodo(todo.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTodo(id);
      toast.success('Todo deleted successfully');
    } catch (error) {
      toast.error('Failed to delete todo');
    }
  };



  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold">My To do</h1>
          <p className="text-muted-foreground">Keep track of your personal tasks</p>
        </div>
        <Button
          onClick={() => {
            setFormData({ title: '', description: '', endDate: '' });
            setEditingTodo(null);
            setShowModal(true);
          }}
        >
          <Plus className="h-5 w-5" />
          Add To do
        </Button>
      </div>

      <div className="grid gap-4">
        {todos.length === 0 && !loading && (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No to-dos yet</EmptyTitle>
              <EmptyDescription>Add your first to-do to get started.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {todos.map(todo => (
          <Card
            key={todo.id}
            className={`py-4 ${todo.completed ? 'bg-muted/50' : ''}`}
          >
            <CardContent className="px-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {todo.title}
                  </h3>
                  <p className="text-muted-foreground mt-1">{todo.description}</p>
                  {todo.projectNumber && todo.projectName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Project: {todo.projectNumber} - {todo.projectName}
                    </p>
                  )}
                  {todo.taskName && (
                    <p className="text-xs text-muted-foreground mt-1">Task: {todo.taskName}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    Due: {new Date(todo.endDate).toLocaleString('en-GB', {
                      year: 'numeric',
                      month: 'numeric',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleTodoComplete(todo.id)}
                    className={todo.completed ? 'bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700' : ''}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(todo)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(todo.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showModal} onOpenChange={(open) => { if (!open) setShowModal(false); }}>
        <DialogContent className="sm:max-w-96">
          <DialogHeader>
            <DialogTitle>{editingTodo ? 'Edit Todo' : 'Add Todo'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="todo-title">Title</Label>
              <Input
                id="todo-title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="todo-description">Description</Label>
              <Textarea
                id="todo-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="todo-end-date">End Date</Label>
              <Input
                id="todo-end-date"
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingTodo ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
