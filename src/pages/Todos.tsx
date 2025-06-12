import React, { useEffect, useState } from 'react';
import { useTodoStore } from '../store/todoStore';
import { Loader2, Plus, Pencil, Trash2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

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
        await addTodo(formData.title, formData.description, formData.endDate);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My To do</h1>
        <button
          onClick={() => {
            setFormData({ title: '', description: '', endDate: '' });
            setEditingTodo(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-black/90 text-white rounded-md hover:bg-black/80 flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add To do
        </button>
      </div>

      <div className="grid gap-4">
        {todos.map(todo => (
          <div
            key={todo.id}
            className={`p-4 rounded-lg border ${
              todo.completed ? 'bg-gray-50' : 'bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className={`text-lg font-semibold ${todo.completed ? 'line-through text-gray-500' : ''}`}>
                  {todo.title}
                </h3>
                <p className="text-gray-600 mt-1">{todo.description}</p>
                <p className="text-sm text-gray-500 mt-2">
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
                <button
                  onClick={() => toggleTodoComplete(todo.id)}
                  className={`p-2 rounded-md ${
                    todo.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleEdit(todo)}
                  className="p-2 bg-blue-100 text-blue-600 rounded-md"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(todo.id)}
                  className="p-2 bg-red-100 text-red-600 rounded-md"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">
              {editingTodo ? 'Edit Todo' : 'Add Todo'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border rounded"
                  rows={3}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  {editingTodo ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 