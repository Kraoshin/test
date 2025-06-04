'use client';

import { useState, useEffect } from 'react';

const operators = ['=', '<', '<=', '>', '>='];

interface DateTimeFilterProps {
  onFilterChange: (filter: Record<string, { operator: string; value: string } | null>) => void;
  fieldName: string;
}

export default function DateTimeFilter({ onFilterChange, fieldName }: DateTimeFilterProps) {
  const [operator, setOperator] = useState('=');
  const [dateValue, setDateValue] = useState('');

  useEffect(() => {
    if (dateValue.trim() === '') {
      onFilterChange({ [fieldName]: null });
    } else {
      onFilterChange({ [fieldName]: { operator, value: dateValue } });
    }
  }, [operator, dateValue, fieldName, onFilterChange]);

  return (
    <div className="mb-4 flex items-center space-x-2 max-w-md">
      <label htmlFor={`${fieldName}-operator`} className="block font-medium">
        Opérateur :
      </label>
      <select
        id={`${fieldName}-operator`}
        value={operator}
        onChange={(e) => setOperator(e.target.value)}
        className="border rounded p-1"
      >
        {operators.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </select>

      <label htmlFor={`${fieldName}-input`} className="block font-medium">
        Date et heure :
      </label>
      <input
        id={`${fieldName}-input`}
        type="datetime-local"
        value={dateValue}
        onChange={(e) => setDateValue(e.target.value)}
        className="border rounded p-1 flex-grow"
      />
    </div>
  );
}
