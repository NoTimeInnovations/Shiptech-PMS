import { useState, useEffect } from "react";
import { useCurrencyStore } from "../store/currencyStore";
import { CurrencyDetails } from "../store/enquiryStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CurrencyProps {
  addCurrency: (currency: CurrencyDetails | undefined) => void;
  initialCurrency?: CurrencyDetails;
}

const NONE_VALUE = "__none__";

export default function Currency({ addCurrency, initialCurrency }: CurrencyProps) {
  const { currencies, loading, fetchCurrencies } = useCurrencyStore();
  const [selectedCurrency, setSelectedCurrency] = useState<string>(initialCurrency?.id || '');

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  useEffect(() => {
    if (currencies.length > 0 && !initialCurrency) {
      // Set the default currency to the first element in the currencies array
      const defaultCurrency = currencies[0];
      setSelectedCurrency(defaultCurrency.id || "");
      addCurrency({
        id: defaultCurrency.id!,
        name: defaultCurrency.name,
        symbol: defaultCurrency.symbol,
        mandatory: defaultCurrency.mandatory,
      });
    } else if (initialCurrency) {
      // If an initial currency is provided, set it as the selected currency
      setSelectedCurrency(initialCurrency.id);
    }
  }, [currencies, initialCurrency, addCurrency]);

  const handleCurrencyChange = (newValue: string) => {
    const value = newValue === NONE_VALUE ? "" : newValue;
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
        mandatory: selectedCurrency.mandatory,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-foreground">Currency</h3>
      </div>

      <Select
        value={selectedCurrency || NONE_VALUE}
        onValueChange={handleCurrencyChange}
        disabled={loading}
      >
        <SelectTrigger className="mt-1 w-full">
          <SelectValue placeholder="Select Currency" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>Select Currency</SelectItem>
          {currencies.map((currency) => (
            <SelectItem key={currency.id} value={currency.id!}>
              {currency.name} ({currency.symbol})
              {currency.mandatory ? ' *' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
