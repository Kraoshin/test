'use client';

interface TableSelectorProps {
  tables: string[];
  selectedTable: string;
  onSelect: (table: string) => void;
}

export default function TableSelector({ 
  tables, 
  selectedTable, 
  onSelect 
}: TableSelectorProps) {
  return (
    <div className="p-4 border rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Sélection de la table</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {tables.map((table) => (
          <button
            key={table}
            onClick={() => onSelect(table)}
            className={`p-2 rounded border ${
              selectedTable === table
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white hover:bg-gray-100'
            }`}
          >
            {table}
          </button>
        ))}
      </div>
    </div>
  );
}
