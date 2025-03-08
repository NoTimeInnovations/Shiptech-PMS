import React, { useState, useEffect } from 'react';
import { useCurrencyStore } from '../store/currencyStore';
import { Edit2, Trash2, Plus, X } from 'lucide-react';
import { Currency as CurrencyType } from '../store/currencyStore';
import { CurrencyDetails } from '../store/enquiryStore';

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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    onClose()
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {initialData ? 'Edit Currency' : 'Add Currency'}
          </h2>
          <button 
            type="button"
            onClick={onClose} 
            disabled={isSubmitting}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Currency Name
            </label>
            <input
              type="text"
              required
              disabled={isSubmitting}
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Symbol
            </label>
            <input
              type="text"
              required
              disabled={isSubmitting}
              value={formData.symbol}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, symbol: e.target.value }))
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="mandatory"
              disabled={isSubmitting}
              checked={formData.mandatory}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, mandatory: e.target.checked }))
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:bg-gray-100"
            />
            <label
              htmlFor="mandatory"
              className="ml-2 block text-sm text-gray-900"
            >
              Mandatory
            </label>
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500"
            >
              Cancel
            </button>
            <button
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-black/90 disabled:bg-gray-400 flex items-center"
              onClick={handleSubmit}
            >
              {isSubmitting && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {initialData ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface CurrencyProps {
  addCurrency: (currency: CurrencyDetails | undefined) => void;
  initialCurrency?: CurrencyDetails;
}

export default function Currency({ addCurrency, initialCurrency }: CurrencyProps) {
  const { currencies, loading, fetchCurrencies, createCurrency, updateCurrency, deleteCurrency } =
    useCurrencyStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>(initialCurrency?.id || '');
  const [editingCurrency, setEditingCurrency] = useState<CurrencyType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  useEffect(() => {
    if (initialCurrency) {
      setSelectedCurrency(initialCurrency.id);
    }
  }, [initialCurrency]);

  const handleOpenModal = (currency?: CurrencyType) => {
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
        const updatedCurrency = { ...data, id: editingCurrency.id };
        setSelectedCurrency(editingCurrency.id);
        addCurrency(updatedCurrency);
      } else {
        const newId = await createCurrency(data);
        const newCurrency = { ...data, id: newId };
        setSelectedCurrency(newId);
        addCurrency(newCurrency);
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
        setSelectedCurrency('');
        addCurrency(undefined);
      } catch (error) {
        console.error('Error deleting currency:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedCurrency(value);
    
    if (!value) {
      addCurrency(undefined);
      return;
    }

    const selectedCurrency = currencies.find(c => c.id === value);
    if (selectedCurrency) {
      addCurrency({
        id: selectedCurrency.id!,
        name: selectedCurrency.name,
        symbol: selectedCurrency.symbol,
        mandatory: selectedCurrency.mandatory
      });
    }
  };

  const currentCurrency = currencies.find(c => c.id === selectedCurrency);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Currency</h3>
        <button
          type="button"
          onClick={() => handleOpenModal()}
          disabled={isSubmitting}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-black/90 disabled:bg-gray-400"
        >
          <Plus size={16} className="mr-1" />
          Add Currency
        </button>
      </div>

      <div className="relative">
        <select
          value={selectedCurrency}
          onChange={handleCurrencyChange}
          disabled={isSubmitting || loading}
          className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm disabled:bg-gray-100"
        >
          <option value="">Select Currency</option>
          {currencies.map((currency) => (
            <option key={currency.id} value={currency.id}>
              {currency.name} ({currency.symbol})
              {currency.mandatory ? ' *' : ''}
            </option>
          ))}
        </select>

        <div className="absolute right-0 top-0 h-full flex items-center pr-2 space-x-1">
          {currentCurrency && (
            <>
              <button
                onClick={() => handleOpenModal(currentCurrency)}
                disabled={isSubmitting}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:text-gray-300"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => currentCurrency.id && handleDelete(currentCurrency.id)}
                disabled={isSubmitting}
                className="p-1 text-gray-400 hover:text-red-600 disabled:text-gray-300"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

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