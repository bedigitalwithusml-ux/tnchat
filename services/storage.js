import path from 'node:path';
import dotenv from 'dotenv';
import SqliteProvider from './providers/sqliteProvider.js';
import NetlifyBlobProvider from './providers/netlifyBlobProvider.js';

dotenv.config();

const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');
const providerType = process.env.STORAGE_PROVIDER || (process.env.NETLIFY ? 'netlify' : 'local');

let storageInstance;

if (providerType === 'netlify') {
  console.log('[Storage] Initializing Netlify Blobs Provider');
  storageInstance = new NetlifyBlobProvider();
} else {
  console.log('[Storage] Initializing SQLite Provider at:', dbPath);
  storageInstance = new SqliteProvider(dbPath);
}

export default storageInstance;
