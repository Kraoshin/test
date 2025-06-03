'use client';

import { useState, useEffect } from 'react';

type FilterValue = {
  operator: string;
  value: string;
};

const operators = ['=', '<', '<=', '>', '>=', '!='];

export default function Filters({
  onFilter,
  onTableSelect,
}: {
  onFilter: (filters: Record<string, FilterValue>) => void;
  onTableSelect: (tableName: string) => void;
}) {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<Record<string, FilterValue>>({});

  // Charger la liste des tables au montage
  useEffect(() => {
    const loadTables = async () => {
      try {
        const res = await fetch('/api/tables');
        const data = await res.json();
        setTables(data.tables);
      } catch (error) {
        console.error('Erreur chargement tables:', error);
      }
    };
    loadTables();
  }, []);

  // Charger colonnes quand selectedTable change
  useEffect(() => {
    if (!selectedTable) {
      setColumns([]);
      setFilters({});
      onFilter({});
      return;
    }

    const loadColumns = async () => {
      try {
        const res = await fetch(`/api/columns?table=${encodeURIComponent(selectedTable)}`);
        if (!res.ok) throw new Error('Erreur API colonnes');
        const data = await res.json();
        setColumns(data.columns || []);
      } catch (error) {
        console.error('Erreur chargement colonnes:', error);
        setColumns([]);
      }
    };

    loadColumns();
  }, [selectedTable, onFilter]);

  const handleTableChange = (table: string) => {
    setSelectedTable(table);
    setFilters({});
    onTableSelect(table);
    onFilter({});
  };

  const handleFilterChange = (column: string, filterValue: FilterValue) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [column]: filterValue };
      // Nettoyer si valeur vide
      if (!filterValue.value) {
        delete newFilters[column];
      }
      onFilter(newFilters);
      return newFilters;
    });
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
          onChange={(e) => handleTableChange(e.target.value)}
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
            <div key={column} className="flex flex-col">
              <label htmlFor={`filter-operator-${column}`} className="mb-1">
                {column}
              </label>

              <div className="flex gap-2">
                {/* Sélecteur d'opérateur */}
                <select
                  id={`filter-operator-${column}`}
                  className="p-2 border rounded w-20"
                  value={filters[column]?.operator || '='}
                  onChange={(e) =>
                    handleFilterChange(column, {
                      operator: e.target.value,
                      value: filters[column]?.value || '',
                    })
                  }
                >
                  {operators.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>

                {/* Input valeur */}
                <input
                  type="text"
                  id={`filter-value-${column}`}
                  className="flex-grow p-2 border rounded"
                  placeholder={`Filtrer par ${column}`}
                  value={filters[column]?.value || ''}
                  onChange={(e) =>
                    handleFilterChange(column, {
                      operator: filters[column]?.operator || '=',
                      value: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
