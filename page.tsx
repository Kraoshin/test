'use client';

import { useState, useEffect } from 'react';
import ConnectionForm from './components/ConnectionForm';
import ColumnRowSelector from './components/ColumnRowSelector';
import DataTable from './components/DataTable';
import TableSelector from './components/TableSelector';
import { getTableNames, getTableColumns, fetchData } from './actions/data.actions';

export default function Home() {
  const [tableName, setTableName] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les tables quand la connexion est établie
  useEffect(() => {
    const loadTables = async () => {
      if (isConnected) {
        try {
          setLoading(true);
          const tables = await getTableNames();
          setAvailableTables(tables);
          setError(null);
        } catch (error) {
          console.error("Erreur lors du chargement des tables:", error);
          setError("Impossible de charger les tables");
        } finally {
          setLoading(false);
        }
      }
    };
    loadTables();
  }, [isConnected]);

  // Charger les colonnes et données quand la table change ou que les filtres sont modifiés
  useEffect(() => {
    const loadData = async () => {
      if (tableName) {
        try {
          setLoading(true);
          // Charger les colonnes
          const columns = await getTableColumns(tableName);
          setAvailableColumns(columns);
          setSelectedColumns(columns);
          
          // Charger les données avec les filtres actuels
          const data = await fetchData(tableName, filters);
          setTableData(data);
          setError(null);
        } catch (error) {
          console.error("Erreur lors du chargement des données:", error);
          setError("Impossible de charger les données");
          setTableData([]);
        } finally {
          setLoading(false);
        }
      }
    };
    loadData();
  }, [tableName, filters]);

  const handleColumnToggle = (column: string) => {
    setSelectedColumns(prev => 
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const handleRowFilter = async (newFilters: Record<string, any>) => {
    setFilters(newFilters);
  };

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Explorateur PostgreSQL</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ConnectionForm onConnectionChange={setIsConnected} />
        </div>
        
        {isConnected && (
          <div className="lg:col-span-2 space-y-4">
            {loading && <div className="p-4 bg-blue-50 text-blue-700">Chargement...</div>}
            {error && <div className="p-4 bg-red-50 text-red-700">{error}</div>}

            {/* Sélecteur de table */}
            {availableTables.length > 0 && (
              <TableSelector 
                tables={availableTables} 
                onSelect={setTableName}
                selectedTable={tableName}
              />
            )}
            
            {tableName && (
              <>
                <ColumnRowSelector
                  tableName={tableName}
                  availableColumns={availableColumns}
                  onColumnToggle={handleColumnToggle}
                  onRowFilter={handleRowFilter}
                  selectedColumns={selectedColumns}
                />
                <DataTable 
                  tableName={tableName} 
                  filters={filters}
                  selectedColumns={selectedColumns}
                  data={tableData}
                />
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
