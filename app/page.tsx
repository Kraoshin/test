'use client';

import { useEffect, useState, useCallback } from 'react';
import { connectDatabase, getTableNames, getColumnTypes, fetchData } from './actions/data.actions';
import ColumnRowSelector from './components/ColumnRowSelector';
import DateTimeFilter from './components/DateTimeFilter';

export default function HomePage() {
  const [connectionString, setConnectionString] = useState('');
  const [connected, setConnected] = useState(false);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [columnTypes, setColumnTypes] = useState<Record<string, string>>({});
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Connexion à la base
  const handleConnect = async () => {
    setError(null);
    const formData = new FormData();
    formData.append('connectionString', connectionString);

    const result = await connectDatabase({}, formData);
    setConnected(result.connected);
    if (!result.connected) setError(result.message);
  };

  // Charger les tables après connexion
  useEffect(() => {
    if (!connected) return;
    (async () => {
      try {
        const tableList = await getTableNames();
        setTables(tableList);
      } catch {
        setError('Erreur lors du chargement des tables');
      }
    })();
  }, [connected]);

  // Charger colonnes, types et données à chaque changement de table ou filtres
  useEffect(() => {
    if (!selectedTable) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const types = await getColumnTypes(selectedTable);
        setColumnTypes(types);
        const cols = Object.keys(types);
        setColumns(cols);
        setSelectedColumns((prev) => (prev.length === 0 ? cols : prev));

        // Transformer filtres en strings pour la query
        const filtersForQuery: Record<string, string> = {};
        for (const [key, val] of Object.entries(filters)) {
          if (
            val &&
            typeof val === 'object' &&
            'operator' in val &&
            'value' in val &&
            val.value !== ''
          ) {
            const op = val.operator;
            const rawValue = val.value;
            const type = columnTypes[key]?.toLowerCase() || '';

            // Détecter si la valeur est numérique
            const isNumberType =
              type.includes('int') || type.includes('numeric') || type.includes('float') || type.includes('double');

            // Ajouter des quotes autour des strings et dates
            let formattedValue = rawValue;

            if (isNumberType) {
              // Essayer de parser en nombre
              const numberValue = Number(rawValue);
              if (isNaN(numberValue)) {
                // Ignorer ce filtre si valeur non numérique
                continue;
              }
              formattedValue = numberValue.toString();
            } else if (type.includes('date') || type.includes('timestamp')) {
              // Formater en ISO pour les dates (supposé bien formaté)
              formattedValue = `'${rawValue}'`;
            } else {
              // Pour chaînes (varchar, text, etc)
              formattedValue = `'${rawValue.replace(/'/g, "''")}'`; // échappement simple quote
            }

            filtersForQuery[key] = `${op} ${formattedValue}`;
          }
        }

        const rows = await fetchData(selectedTable, filtersForQuery, types);
        setData(rows);
      } catch {
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedTable, filters]);

  // Toggle sélection colonne
  const toggleColumn = useCallback((column: string) => {
    setSelectedColumns((prev) =>
      prev.includes(column) ? prev.filter((c) => c !== column) : [...prev, column]
    );
  }, []);

  // Mise à jour des filtres : on ne met à jour que si le filtre change vraiment
  const handleFilterChange = useCallback((newFilter: Record<string, any>) => {
    setFilters((prev) => {
      const merged = { ...prev, ...newFilter };
      for (const key in merged) {
        if (merged[key] === null || merged[key] === '') {
          delete merged[key];
        }
      }
      // Comparaison shallow pour éviter boucle infinie
      const prevKeys = Object.keys(prev);
      const mergedKeys = Object.keys(merged);
      const isSame =
        prevKeys.length === mergedKeys.length &&
        prevKeys.every((key) => {
          const a = prev[key];
          const b = merged[key];
          if (typeof a === 'object' && typeof b === 'object') {
            return JSON.stringify(a) === JSON.stringify(b);
          }
          return a === b;
        });

      if (isSame) {
        return prev; // Pas de changement réel
      }
      return merged;
    });
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Explorateur de base de données</h1>

      {!connected && (
        <div className="mb-6">
          <input
            type="text"
            value={connectionString}
            onChange={(e) => setConnectionString(e.target.value)}
            placeholder="Chaîne de connexion PostgreSQL"
            className="w-full p-2 border rounded mb-2"
          />
          <button onClick={handleConnect} className="bg-blue-500 text-white px-4 py-2 rounded">
            Se connecter
          </button>
        </div>
      )}

      {connected && (
        <div className="mb-4">
          <label className="block mb-1 font-medium">Table</label>
          <select
            value={selectedTable || ''}
            onChange={(e) => {
              setSelectedTable(e.target.value || null);
              setFilters({});
              setSelectedColumns([]);
              setData([]);
            }}
            className="p-2 border rounded w-full max-w-md"
          >
            <option value="">-- Choisir une table --</option>
            {tables.map((table) => (
              <option key={table} value={table}>
                {table}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedTable && columns.length > 0 && (
        <>
          <DateTimeFilter onFilterChange={handleFilterChange} fieldName="creationdate" />

          <ColumnRowSelector
            tableName={selectedTable}
            availableColumns={columns}
            columnTypes={columnTypes}
            selectedColumns={selectedColumns}
            onColumnToggle={toggleColumn}
            onRowFilter={handleFilterChange}
          />
        </>
      )}

      {error && <div className="text-red-500 mb-4">{error}</div>}
      {loading && <div className="text-gray-500 mb-4">Chargement…</div>}

      {!loading && !error && data.length === 0 && selectedTable && (
        <div className="text-gray-700 mb-4 italic">Aucun résultat trouvé</div>
      )}

      {!loading && data.length > 0 && (
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-100">
                {selectedColumns.map((col) => (
                  <th key={col} className="p-2 border-b border-gray-300">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {selectedColumns.map((col) => (
                    <td key={col} className="p-2 border-b border-gray-200">
                      {String(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
