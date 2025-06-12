import React, { useState, useRef, useEffect } from 'react';
import { allCountries } from 'country-telephone-data';

// Define the props interface for the component
interface CountryCodeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const CountryCodeSelector: React.FC<CountryCodeSelectorProps> = ({ 
  value, 
  onChange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sort countries alphabetically
  const sortedCountries = [...allCountries].sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  // Default to showing the code that was passed in, even if not found
  const displayValue = value || '';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (dialCode: string) => {
    onChange(dialCode);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Custom select display - shows only the dial code */}
      <div
        onClick={toggleDropdown}
        className={`p-2 border border-gray-300 shadow-sm rounded-md focus:border-blue-500 focus:ring-blue-500 cursor-pointer bg-white flex justify-between items-center ${className}`}
      >
        <span className={displayValue ? 'text-gray-900' : 'text-gray-500'}>
          {displayValue || 'Select Code'}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown options - shows full country name with dial code */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div
            onClick={() => handleSelect('')}
            className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
          >
            Select Code
          </div>
          {sortedCountries.map((country) => (
            <div
              key={country.iso2}
              onClick={() => handleSelect(country.dialCode ? `+${country.dialCode}` : '')}
              className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              {country.name} ({country.dialCode ? `+${country.dialCode}` : 'N/A'})
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CountryCodeSelector;