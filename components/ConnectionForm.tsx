'use client';

import { useActionState } from 'react';
import { connectDatabase } from '../actions/data.actions';

interface ConnectionFormProps {
  onConnectionChange: (connected: boolean) => void;
}

export default function ConnectionForm({ onConnectionChange }: ConnectionFormProps) {
  const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
    const result = await connectDatabase(prevState, formData);
    onConnectionChange(result.connected);
    return result;
  }, { 
    message: '', 
    error: null,
    connected: false 
  });

  return (
    <div className="p-4 border rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Connexion à PostgreSQL</h2>
      <form action={formAction}>
        <div className="mb-4">
          <label htmlFor="connectionString" className="block mb-2">
            Chaîne de connexion:
          </label>
          <input
            type="password"
            id="connectionString"
            name="connectionString"
            placeholder="postgresql://user:password@host:port/database"
            className="w-full p-2 border rounded"
            required
            disabled={isPending}
          />
          <p className="text-sm text-gray-500 mt-1">
            Format: postgresql://user:password@host:port/database
          </p>
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
          disabled={isPending}
        >
          {isPending ? 'Connexion en cours...' : (state.connected ? 'Reconnecter' : 'Se connecter')}
        </button>
      </form>
      {state.message && (
        <p className={`mt-4 ${state.error ? 'text-red-500' : 'text-green-500'}`}>
          {state.message}: {state.error}
        </p>
      )}
    </div>
  );
}
