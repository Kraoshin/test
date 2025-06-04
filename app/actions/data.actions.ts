'use server';

import { Pool } from 'pg';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

let pool: Pool | null = null;

export async function connectDatabase(prevState: any, formData: FormData) {
  const connectionString = formData.get('connectionString') as string;

  try {
    if (pool) await pool.end();

    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000,
      query_timeout: 10000,
    });

    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    return { message: 'Connexion réussie', error: null, connected: true };
  } catch (error) {
    return {
      message: 'Échec de la connexion',
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      connected: false,
    };
  }
}

export async function getTableNames() {
  if (!pool) throw new Error('Base de données non connectée');
  const { rows } = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  );
  return rows.map(row => row.table_name);
}

export async function getColumnTypes(tableName: string): Promise<Record<string, string>> {
  if (!pool) throw new Error('Base de données non connectée');

  const { rows } = await pool.query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_name = $1`,
    [tableName]
  );

  return rows.reduce((acc, row) => {
    acc[row.column_name] = row.data_type;
    return acc;
  }, {} as Record<string, string>);
}

export async function fetchData(
  tableName: string,
  filters: Record<string, { operator: string; value: string }> = {},
  columnTypes: Record<string, string> = {}
) {
  if (!pool) throw new Error('Base de données non connectée');

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error('Nom de table invalide');
  }

  const queryParts: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  function parseDateFlexible(dateStr: string): string {
    let d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
    const frDateRegex = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2})(?::(\d{2}))?)?$/;
    const match = dateStr.match(frDateRegex);
    if (!match) {
      throw new Error('Date invalide');
    }
    const [, day, month, year, hour = '00', minute = '00'] = match;
    d = new Date(`${year}-${month}-${day}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00Z`);
    if (isNaN(d.getTime())) {
      throw new Error('Date invalide');
    }
    return d.toISOString();
  }

  for (const [column, filter] of Object.entries(filters)) {
    if (!(column in columnTypes)) {
      throw new Error(`Colonne de filtre inconnue : ${column}`);
    }
    if (!filter || !filter.value) continue;

    const { operator, value } = filter;
    const columnType = columnTypes[column]?.toLowerCase();

    try {
      if (
        columnType.includes('int') ||
        columnType.includes('numeric') ||
        columnType.includes('float')
      ) {
        // Valeur numérique
        const numValue = Number(value);
        if (isNaN(numValue)) throw new Error('Valeur numérique invalide');
        queryParts.push(`"${column}" ${operator} $${paramIndex}`);
        values.push(numValue);
        paramIndex++;
      } else if (columnType.includes('bool')) {
        // Booléen strict = opérateur '=' seulement accepté
        if (operator !== '=') {
          throw new Error('Opérateur invalide pour booléen');
        }
        const lowerVal = value.toLowerCase();
        if (lowerVal === 'true' || lowerVal === '1') {
          queryParts.push(`"${column}" = $${paramIndex}`);
          values.push(true);
        } else if (lowerVal === 'false' || lowerVal === '0') {
          queryParts.push(`"${column}" = $${paramIndex}`);
          values.push(false);
        } else {
          throw new Error('Valeur booléenne invalide');
        }
        paramIndex++;
      } else if (columnType.includes('timestamp') || columnType.includes('date')) {
        // Dates avec opérateur
        if (!['=', '<', '<=', '>', '>='].includes(operator)) {
          throw new Error('Opérateur invalide pour date');
        }

        if (operator === '=') {
          // Cas égalité : transformer en intervalle [minute, minute+1)
          const dt = new Date(value);
          if (isNaN(dt.getTime())) throw new Error('Date invalide');

          const start = new Date(dt);
          start.setSeconds(0, 0);

          const end = new Date(start);
          end.setMinutes(end.getMinutes() + 1);

          queryParts.push(`("${column}" >= $${paramIndex} AND "${column}" < $${paramIndex + 1})`);
          values.push(start.toISOString());
          values.push(end.toISOString());
          paramIndex += 2;
        } else {
          // Autres opérateurs
          const isoDate = parseDateFlexible(value);
          queryParts.push(`"${column}" ${operator} $${paramIndex}`);
          values.push(isoDate);
          paramIndex++;
        }
      } else if (columnType.includes('uuid')) {
        // UUID - uniquement opérateur '=' possible
        if (operator !== '=') {
          throw new Error('Opérateur invalide pour UUID, seul "=" est accepté');
        }
        queryParts.push(`"${column}" = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      } else {
        // Texte - on accepte uniquement '=' ou '!=' ou 'ILIKE'
        if (operator === '!=' || operator === '<>') {
          queryParts.push(`"${column}" NOT ILIKE $${paramIndex}`);
          values.push(`%${value}%`);
        } else {
          // On traite '=' comme ILIKE pour recherche partielle, ignore autres opérateurs
          queryParts.push(`"${column}" ILIKE $${paramIndex}`);
          values.push(`%${value}%`);
        }
        paramIndex++;
      }
    } catch (err) {
      throw new Error(`Erreur dans le filtre colonne ${column}: ${err instanceof Error ? err.message : ''}`);
    }
  }

  const whereClause = queryParts.length > 0 ? `WHERE ${queryParts.join(' AND ')}` : '';

  const selectedColumns = Object.keys(columnTypes)
    .map(col => `"${col}"`)
    .join(', ');

  const sql = `SELECT ${selectedColumns} FROM "${tableName}" ${whereClause} LIMIT 1000`;

  const { rows } = await pool.query(sql, values);

  return rows;
}
