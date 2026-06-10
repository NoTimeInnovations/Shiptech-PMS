import React, { useState, useEffect } from 'react';
import { useCurrencyStore } from '../store/currencyStore';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface CurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; symbol: string; mandatory: boolean }) => Promise<void>;
  initialData?: { name: string; symbol: string; mandatory: boolean };
  isSubmitting?: boolean;
}

const CurrencyModal: React.FC<CurrencyModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    mandatory: false,
  });

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || { name: '', symbol: '', mandatory: false });
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Currency' : 'Add Currency'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency-name">Currency Name</Label>
            <Input
              id="currency-name"
              type="text"
              required
              disabled={isSubmitting}
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency-symbol">Symbol</Label>
            <Input
              id="currency-symbol"
              type="text"
              required
              disabled={isSubmitting}
              value={formData.symbol}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, symbol: e.target.value }))
              }
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {initialData ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function Currencies() {
  const { currencies, loading, fetchCurrencies, createCurrency, updateCurrency, deleteCurrency } =
    useCurrencyStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<{
    id: string;
    name: string;
    symbol: string;
    mandatory: boolean;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  const handleOpenModal = (currency?: typeof editingCurrency) => {
    if (currency) {
      setEditingCurrency(currency);
    } else {
      setEditingCurrency(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!isSubmitting) {
      setIsModalOpen(false);
      setEditingCurrency(null);
    }
  };

  const handleSubmit = async (data: {
    name: string;
    symbol: string;
    mandatory: boolean;
  }) => {
    try {
      setIsSubmitting(true);
      if (editingCurrency?.id) {
        await updateCurrency(editingCurrency.id, data);
      } else {
        await createCurrency(data);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error submitting currency:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this currency?')) {
      try {
        setIsSubmitting(true);
        await deleteCurrency(id);
      } catch (error) {
        console.error('Error deleting currency:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-heading font-semibold">Currencies</h1>
        <Button type="button" onClick={() => handleOpenModal()}>
          <Plus size={16} />
          Add Currency
        </Button>
      </div>

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && currencies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : (
              currencies.map((currency) => (
                <TableRow key={currency.id}>
                  <TableCell>{currency.name}</TableCell>
                  <TableCell>{currency.symbol}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleOpenModal(currency)}
                        className="text-muted-foreground"
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => currency.id && handleDelete(currency.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <CurrencyModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        initialData={editingCurrency || undefined}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
