'use client';

import { useState } from 'react';

const operators = ['=', '<', '<=', '>', '>='];

interface DateTimeFilterProps {
  onFilterChange: (filter: Record<string, { operator: string; value: string } | null>) => void;
  fieldName: string;
}

export default function DateTimeFilter({ onFilterChange, fieldName }: DateTimeFilterProps) {
  const [operator, setOperator] = useState('=');
  const [dateValue, setDateValue] = useState('');

  function handleOperatorChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setOperator(e.target.value);
    sendFilter(e.target.value, dateValue);
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDateValue(e.target.value);
    sendFilter(operator, e.target.value);
  }

  function sendFilter(op: string, val: string) {
    if (val.trim() === '') {
      onFilterChange({ [fieldName]: null });
    } else {
      onFilterChange({ [fieldName]: { operator: op, value: val } });
    }
  }

  return (
    <div className="mb-4 flex items-center space-x-2 max-w-md">
      <label htmlFor={`${fieldName}-operator`} className="block font-medium">
        Opérateur :
      </label>
      <select
        id={`${fieldName}-operator`}
        value={operator}
        onChange={handleOperatorChange}
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
        onChange={handleDateChange}
        className="border rounded p-1 flex-grow"
      />
    </div>
  );
}
