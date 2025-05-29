'use server';

import { Pool } from 'pg';

let pool: Pool | null = null;

// Connexion à la base de données
export async function connectDatabase(prevState: any, formData: FormData) {
  const connectionString = formData.get('connectionString') as string;

  try {
    // Fermer la connexion existante si elle existe
    if (pool) {
      await pool.end();
    }

    // Établir une nouvelle connexion
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000,
      query_timeout: 10000
    });

    // Tester la connexion
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    return { 
      message: 'Connexion réussie', 
      error: null,
      connected: true
    };
  } catch (error) {
    return { 
      message: 'Échec de la connexion', 
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      connected: false
    };
  }
}

// Récupérer les noms de tables
export async function getTableNames() {
  if (!pool) throw new Error('Base de données non connectée');
  
  try {
    const { rows } = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    return rows.map(row => row.table_name);
  } catch (error) {
    console.error('Erreur lors de la récupération des tables:', error);
    throw error;
  }
}

// Récupérer les colonnes d'une table
export async function getTableColumns(tableName: string) {
  if (!pool) throw new Error('Base de données non connectée');
  
  try {
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      [tableName]
    );
    return rows.map(row => row.column_name);
  } catch (error) {
    console.error(`Erreur lors de la récupération des colonnes pour ${tableName}:`, error);
    throw error;
  }
}

// Récupérer les données avec filtres
export async function fetchData(tableName: string, filters: Record<string, any> = {}) {
  if (!pool) throw new Error('Base de données non connectée');
  
  try {
    // Validation du nom de table
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new Error('Nom de table invalide');
    }

    let query = `SELECT * FROM ${tableName}`;
    const values: any[] = [];
    const conditions: string[] = [];
    
    // Construction des filtres
    Object.entries(filters).forEach(([key, value], index) => {
      if (value && typeof value === 'string' && value.trim() !== '') {
        conditions.push(`${key} ILIKE $${index + 1}`);
        values.push(`%${value}%`);
      }
    });
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    // Limiter le nombre de résultats pour éviter les surcharges
    query += ' LIMIT 500';
    
    const { rows } = await pool.query(query, values);
    return rows;
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
    throw error;
  }
}

// Vérifier l'état de la connexion
export async function checkConnection() {
  try {
    if (!pool) return false;
    
    // Teste activement la connexion au lieu de juste vérifier le pool
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Connection check failed:', error);
    return false;
  }
}
