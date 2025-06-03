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

  const { rows } = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = $1
  `, [tableName]);

  return rows.reduce((acc, row) => {
    acc[row.column_name] = row.data_type;
    return acc;
  }, {} as Record<string, string>);
}

export async function fetchData(
  tableName: string,
  filters: Record<string, any> = {},
  columnTypes: Record<string, string> = {}
) {
  if (!pool) throw new Error('Base de données non connectée');

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error('Nom de table invalide');
  }

  const queryParts: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const column of Object.keys(filters)) {
    if (!(column in columnTypes)) {
      throw new Error(`Colonne de filtre inconnue : ${column}`);
    }
  }

  // Fonction parse flexible pour convertir date (en string) en ISO
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

  for (const [column, rawValue] of Object.entries(filters)) {
    let valueStr = rawValue?.toString().trim();
    if (!valueStr) continue;

    const columnType = columnTypes[column]?.toLowerCase();

    try {
      if (
        columnType?.includes('int') ||
        columnType?.includes('numeric') ||
        columnType?.includes('float')
      ) {
        const operatorMatch = valueStr.match(/^(<=|>=|=|<|>)/);
        const operator = operatorMatch ? operatorMatch[0] : '=';
        const numValue = Number(valueStr.replace(operator, '').trim());
        if (isNaN(numValue)) throw new Error('Valeur numérique invalide');
        queryParts.push(`${column} ${operator} $${paramIndex}`);
        values.push(numValue);
        paramIndex++;
      } else if (columnType?.includes('bool')) {
        if (['true', '1'].includes(valueStr.toLowerCase())) {
          queryParts.push(`${column} = true`);
        } else if (['false', '0'].includes(valueStr.toLowerCase())) {
          queryParts.push(`${column} = false`);
        } else {
          throw new Error('Valeur booléenne invalide');
        }
      } else if (columnType?.includes('timestamp') || columnType?.includes('date')) {
        // valueStr est supposé être sous forme "operator + date"
        const operatorMatch = valueStr.match(/^(<=|>=|=|<|>)/);
        if (!operatorMatch) {
          throw new Error('Opérateur manquant dans le filtre date');
        }
        const operator = operatorMatch[0];
        const datePart = valueStr.substring(operator.length).trim();
        const isoDate = parseDateFlexible(datePart);

        queryParts.push(`${column} ${operator} $${paramIndex}`);
        values.push(isoDate);
        paramIndex++;
      } else {
        // Texte (varchar, text etc)
        queryParts.push(`${column} ILIKE $${paramIndex}`);
        values.push(`%${valueStr}%`);
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
