import React, { useState } from "react";
import { allCountries } from "country-telephone-data";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

// Define the props interface for the component
interface CountryCodeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const CountryCodeSelector: React.FC<CountryCodeSelectorProps> = ({
  value,
  onChange,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Sort countries alphabetically
  const sortedCountries = [...allCountries].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Default to showing the code that was passed in, even if not found
  const displayValue = value || "";

  const handleSelect = (dialCode: string) => {
    onChange(dialCode);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className={cn(
            "w-full justify-between font-normal",
            !displayValue && "text-muted-foreground",
            className
          )}
        >
          {displayValue || "Select Code"}
          <ChevronDown
            className={cn(
              "size-4 opacity-50 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__select-code__" onSelect={() => handleSelect("")}>
                Select Code
              </CommandItem>
              {sortedCountries.map((country) => (
                <CommandItem
                  key={country.iso2}
                  value={`${country.name} +${country.dialCode}`}
                  onSelect={() =>
                    handleSelect(country.dialCode ? `+${country.dialCode}` : "")
                  }
                >
                  {country.name} ({country.dialCode ? `+${country.dialCode}` : "N/A"})
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default CountryCodeSelector;
