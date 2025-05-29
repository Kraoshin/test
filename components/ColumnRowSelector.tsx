'use client';

import { useState, useEffect } from 'react';

interface ColumnRowSelectorProps {
  tableName: string;
  availableColumns: string[];
  selectedColumns: string[];
  onColumnToggle: (column: string) => void;
  onRowFilter: (filters: Record<string, any>) => Promise<void>;
}

export default function ColumnRowSelector({
  tableName,
  availableColumns,
  selectedColumns,
  onColumnToggle,
  onRowFilter
}: ColumnRowSelectorProps) {
  const [rowFilters, setRowFilters] = useState<Record<string, any>>({});
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [showRowFilter, setShowRowFilter] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [isFiltering, setIsFiltering] = useState(false);

  // Réinitialiser les filtres quand la table change
  useEffect(() => {
    setRowFilters({});
    setFilterError(null);
  }, [tableName]);

  // Gestion des colonnes
  const toggleColumn = (column: string) => {
    onColumnToggle(column);
  };

  // Gestion des filtres de ligne
  const updateRowFilter = async (column: string, value: string) => {
    const newFilters = { ...rowFilters };
    
    if (value && value.trim() !== '') {
      newFilters[column] = value.trim();
    } else {
      delete newFilters[column];
    }
    
    setRowFilters(newFilters);
    setFilterError(null);
    setIsFiltering(true);
    
    try {
      await onRowFilter(newFilters);
    } catch (error) {
      setFilterError(error instanceof Error ? error.message : 'Erreur lors du filtrage');
      console.error('Filter error:', error);
    } finally {
      setIsFiltering(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-4 mb-6">
      {/* Bouton de sélection des colonnes */}
      <div className="relative">
        <button
          onClick={() => setShowColumnSelector(!showColumnSelector)}
          className={`bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 ${
            availableColumns.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={availableColumns.length === 0}
        >
          Colonnes ({selectedColumns.length})
          {availableColumns.length === 0 && (
            <span className="ml-2 text-xs">(Chargement...)</span>
          )}
        </button>
        
        {showColumnSelector && availableColumns.length > 0 && (
          <div className="absolute z-10 mt-2 w-64 bg-white border rounded-lg shadow-lg p-3">
            <h3 className="font-bold mb-2">Sélectionnez les colonnes</h3>
            <div className="max-h-60 overflow-y-auto">
              {availableColumns.map(column => (
                <label key={column} className="flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column)}
                    onChange={() => toggleColumn(column)}
                    className="rounded"
                  />
                  <span>{column}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bouton de filtrage des lignes */}
      <div className="relative">
        <button
          onClick={() => setShowRowFilter(!showRowFilter)}
          className={`bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 ${
            availableColumns.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={availableColumns.length === 0 || isFiltering}
        >
          Filtres ({Object.keys(rowFilters).length})
          {isFiltering && (
            <span className="ml-2 text-xs">(Application...)</span>
          )}
        </button>
        
        {showRowFilter && availableColumns.length > 0 && (
          <div className="absolute z-10 mt-2 w-64 bg-white border rounded-lg shadow-lg p-3">
            <h3 className="font-bold mb-2">Filtrer les lignes</h3>
            {filterError && (
              <p className="text-red-500 text-sm mb-2">{filterError}</p>
            )}
            <div className="max-h-60 overflow-y-auto">
              {availableColumns.map(column => (
                <div key={`filter-${column}`} className="mb-3">
                  <label className="block text-sm font-medium mb-1">{column}</label>
                  <input
                    type="text"
                    value={rowFilters[column] || ''}
                    onChange={(e) => updateRowFilter(column, e.target.value)}
                    placeholder={`Filtrer ${column}`}
                    className="w-full p-2 border rounded text-sm"
                    disabled={isFiltering}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
