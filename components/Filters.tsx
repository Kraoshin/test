'use client';

import { useState, useEffect } from 'react';
import { getTableNames, getTableColumns } from '../actions/data.actions';

export default function Filters({ onFilter, onTableSelect }: {
  onFilter: (filters: Record<string, any>) => void;
  onTableSelect: (tableName: string) => void;
}) {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadTables = async () => {
      try {
        const tables = await getTableNames();
        setTables(tables);
      } catch (error) {
        console.error('Error loading tables:', error);
      }
    };
    loadTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      const loadColumns = async () => {
        try {
          const columns = await getTableColumns(selectedTable);
          setColumns(columns);
          onTableSelect(selectedTable);
        } catch (error) {
          console.error('Error loading columns:', error);
        }
      };
      loadColumns();
    }
  }, [selectedTable, onTableSelect]);

  const handleFilterChange = (column: string, value: any) => {
    const newFilters = { ...filters, [column]: value };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  return (
    <div className="p-4 border rounded-lg shadow mb-4">
      <h2 className="text-xl font-bold mb-4">Filtres</h2>
      
      <div className="mb-4">
        <label htmlFor="table" className="block mb-2">
          Table:
        </label>
        <select
          id="table"
          className="w-full p-2 border rounded"
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
        >
          <option value="">Sélectionner une table</option>
          {tables.map((table) => (
            <option key={table} value={table}>
              {table}
            </option>
          ))}
        </select>
      </div>

      {selectedTable && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {columns.map((column) => (
            <div key={column}>
              <label htmlFor={`filter-${column}`} className="block mb-1 text-sm">
                {column}
              </label>
              <input
                id={`filter-${column}`}
                type="text"
                className="w-full p-2 border rounded text-sm"
                placeholder={`Filtrer par ${column}`}
                onChange={(e) => handleFilterChange(column, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
