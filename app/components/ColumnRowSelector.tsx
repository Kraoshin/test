'use client';

import { useState, useEffect, useRef } from 'react';

interface ColumnRowSelectorProps {
  tableName: string;
  availableColumns: string[];
  columnTypes: Record<string, string>;
  selectedColumns: string[];
  onColumnToggle: (col: string) => void;
  onRowFilter: (filter: Record<string, { operator: string; value: string }>) => void;
}

const operatorsNumber = ['=', '<', '<=', '>', '>='];
const operatorsText = ['contient'];

export default function ColumnRowSelector({
  availableColumns,
  columnTypes,
  selectedColumns,
  onColumnToggle,
  onRowFilter,
}: ColumnRowSelectorProps) {
  const [localFilters, setLocalFilters] = useState<Record<string, { operator: string; value: string }>>({});

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  function handleFilterChange(
    column: string,
    value: string,
    operator: string | null = null
  ) {
    setLocalFilters((prev) => {
      const newFilters = { ...prev };

      if (!value || value.trim() === '') {
        delete newFilters[column];
      } else {
        const type = columnTypes[column]?.toLowerCase();

        if (
          type?.includes('int') ||
          type?.includes('numeric') ||
          type?.includes('float') ||
          type?.includes('double')
        ) {
          newFilters[column] = {
            operator: operator || '=',
            value: value.trim(),
          };
        } else if (type?.includes('bool')) {
          if (value === 'true' || value === 'false') {
            newFilters[column] = {
              operator: '=',
              value: value, // garder 'true' ou 'false' en string pour serveur
            };
          } else {
            delete newFilters[column];
          }
        } else if (type?.includes('uuid')) {
          // UUID : opérateur forcé à '='
          newFilters[column] = {
            operator: '=',
            value: value.trim(),
          };
        } else {
          // Texte : opérateur "contient" pour filtrage en LIKE
          newFilters[column] = {
            operator: 'contient',
            value: value.trim(),
          };
        }
      }

      return newFilters;
    });
  }

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      onRowFilter(localFilters);
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [localFilters, onRowFilter]);

  function renderFilterInput(column: string) {
    const type = columnTypes[column]?.toLowerCase();
    const filterValue = localFilters[column];

    if (type?.includes('bool')) {
      return (
        <select
          value={filterValue === undefined ? '' : filterValue.value}
          onChange={(e) => handleFilterChange(column, e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">--</option>
          <option value="true">Vrai</option>
          <option value="false">Faux</option>
        </select>
      );
    }

    if (
      type?.includes('int') ||
      type?.includes('numeric') ||
      type?.includes('float') ||
      type?.includes('double')
    ) {
      const operator = filterValue?.operator || '=';
      const value = filterValue?.value || '';

      return (
        <div className="flex space-x-1">
          <select
            value={operator}
            onChange={(e) => handleFilterChange(column, value, e.target.value)}
            className="border rounded px-2 py-1"
          >
            {operatorsNumber.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={value}
            onChange={(e) => handleFilterChange(column, e.target.value, operator)}
            placeholder="Valeur"
            className="border rounded px-2 py-1 flex-grow"
          />
        </div>
      );
    }

    if (type?.includes('uuid')) {
      const value = filterValue?.value || '';
      const operator = '=';

      return (
        <div className="flex space-x-1">
          <select
            value={operator}
            disabled
            className="border rounded px-2 py-1 bg-gray-200 cursor-not-allowed"
          >
            <option value="=">=</option>
          </select>
          <input
            type="text"
            value={value}
            onChange={(e) => handleFilterChange(column, e.target.value, operator)}
            placeholder="UUID exact"
            className="border rounded px-2 py-1 flex-grow"
          />
        </div>
      );
    }

    // Texte classique (contient)
    const value = filterValue?.value || '';

    return (
      <input
        type="text"
        value={value}
        onChange={(e) => handleFilterChange(column, e.target.value)}
        placeholder="Filtrer"
        className="border rounded px-2 py-1 w-full"
      />
    );
  }

  return (
    <div className="mb-6 max-w-5xl">
      <h2 className="text-xl font-semibold mb-2">Colonnes et filtres</h2>

      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 p-2">Afficher</th>
            <th className="border border-gray-300 p-2">Colonne</th>
            <th className="border border-gray-300 p-2">Type</th>
            <th className="border border-gray-300 p-2">Filtre</th>
          </tr>
        </thead>
        <tbody>
          {availableColumns.map((col) => (
            <tr key={col} className="odd:bg-white even:bg-gray-50">
              <td className="border border-gray-300 text-center p-2">
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(col)}
                  onChange={() => onColumnToggle(col)}
                />
              </td>
              <td className="border border-gray-300 p-2">{col}</td>
              <td className="border border-gray-300 p-2">{columnTypes[col]}</td>
              <td className="border border-gray-300 p-2">{renderFilterInput(col)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
