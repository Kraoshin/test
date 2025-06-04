'use client';

import { useEffect, useState, useCallback } from 'react';
import { connectDatabase, getTableNames, getColumnTypes, fetchData } from './actions/data.actions';
import ColumnRowSelector from './components/ColumnRowSelector';
import DateTimeFilter from './components/DateTimeFilter';

type FilterValue = {
  operator: string;
  value: string;
};

export default function HomePage() {
  const [connectionString, setConnectionString] = useState('');
  const [connected, setConnected] = useState(false);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [columnTypes, setColumnTypes] = useState<Record<string, string>>({});
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<Record<string, FilterValue>>({});
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

  // Charger colonnes et types à chaque changement de table
  useEffect(() => {
    if (!selectedTable) {
      setColumns([]);
      setColumnTypes({});
      setSelectedColumns([]);
      setData([]);
      setFilters({});
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const types = await getColumnTypes(selectedTable);
        setColumnTypes(types);

        const cols = Object.keys(types);
        setColumns(cols);
        setSelectedColumns((prev) => (prev.length === 0 ? cols : prev));
      } catch {
        setError('Erreur lors du chargement des colonnes/types');
        setColumns([]);
        setColumnTypes({});
        setSelectedColumns([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedTable]);

  // Charger données quand selectedTable, filters ou columnTypes changent
  useEffect(() => {
    if (
      !selectedTable ||
      !columnTypes ||
      Object.keys(columnTypes).length === 0
    ) {
      setData([]);
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const filtersForQuery: Record<string, FilterValue> = {};
        for (const [key, val] of Object.entries(filters)) {
          if (
            val &&
            typeof val === 'object' &&
            'operator' in val &&
            'value' in val &&
            val.value !== ''
          ) {
            filtersForQuery[key] = { operator: val.operator, value: val.value };
          }
        }

        const rows = await fetchData(selectedTable, filtersForQuery, columnTypes);
        setData(rows);
      } catch {
        setError('Erreur lors du chargement des données');
        setData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedTable, filters, columnTypes]);

  // Toggle sélection colonne
  const toggleColumn = useCallback((column: string) => {
    setSelectedColumns((prev) =>
      prev.includes(column) ? prev.filter((c) => c !== column) : [...prev, column]
    );
  }, []);

  // Mise à jour des filtres : on ne met à jour que si le filtre change vraiment
  const handleFilterChange = useCallback((newFilter: Record<string, FilterValue>) => {
    setFilters((prev) => {
      const merged = { ...prev, ...newFilter };
      for (const key in merged) {
        if (merged[key] === null || merged[key] === '' || merged[key] === undefined) {
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
          <button
            onClick={handleConnect}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
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
              const val = e.target.value;
              setSelectedTable(val || null);
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

          {/* Bouton Rafraîchir */}
          {selectedTable && (
            <button
              onClick={() => setFilters({})}
              className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Rafraîchir la table
            </button>
          )}
        </div>
      )}

      {selectedTable && columns.length > 0 && (
        <>
          <DateTimeFilter
            onFilterChange={handleFilterChange}
            fieldName="creationdate"
          />

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
                      {row[col] !== null && row[col] !== undefined
                        ? String(row[col])
                        : ''}
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
