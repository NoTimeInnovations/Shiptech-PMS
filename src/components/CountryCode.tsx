import React from 'react';
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
  // Sort countries alphabetically
  const sortedCountries = [...allCountries].sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  // Find current country based on dial code (removing '+' if present)
//   const currentDialCode = value.startsWith('+') ? value.substring(1) : value;
  
  // Default to showing the code that was passed in, even if not found
  const displayValue = value || '+1';

  return (
    <select
      value={displayValue}
      onChange={(e) => onChange(e.target.value)}
      className={`p-2 border-gray-300 shadow-sm rounded-md focus:border-blue-500 focus:ring-blue-500 ${className}`}
    >
      <option value="">Select Code</option>
      {sortedCountries.map((country) => (
        <option 
          key={country.iso2} 
          value={country.dialCode ? `+${country.dialCode}` : ''}
        >
          {country.name} ({country.dialCode ? `+${country.dialCode}` : 'N/A'})
        </option>
      ))}
    </select>
  );
};

export default CountryCodeSelector;
