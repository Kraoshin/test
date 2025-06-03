'use client';

import { useState, useEffect } from 'react';
import { fetchData } from '../actions/data.actions';

interface DataTableProps {
  tableName: string;
  filters: Record<string, any>;
  selectedColumns?: string[];
}

export default function DataTable({ 
  tableName, 
  filters, 
  selectedColumns = [] 
}: DataTableProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!tableName) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchData(tableName, filters);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tableName, filters]);

  if (!tableName) {
    return <div className="p-4 text-gray-500">Sélectionnez une table</div>;
  }

  if (loading) {
    return <div className="p-4">Chargement...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Erreur: {error}</div>;
  }

  if (data.length === 0) {
    return <div className="p-4">Aucune donnée trouvée</div>;
  }

  // Filtrer les colonnes si des sélections existent
  const columnsToShow = selectedColumns.length > 0 
    ? Object.keys(data[0]).filter(col => selectedColumns.includes(col))
    : Object.keys(data[0]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border">
        <thead>
          <tr className="bg-gray-100">
            {columnsToShow.map((column) => (
              <th key={column} className="p-2 border text-left">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {columnsToShow.map((column) => (
                <td key={`${index}-${column}`} className="p-2 border">
                  {String(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
