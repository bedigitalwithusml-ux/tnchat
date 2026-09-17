import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');
const providerType = process.env.STORAGE_PROVIDER || (process.env.NETLIFY ? 'netlify' : 'local');

let storageInstance;

if (providerType === 'netlify') {
  console.log('[Storage] Initializing Netlify Blobs Provider');
  const { default: NetlifyBlobProvider } = await import('./providers/netlifyBlobProvider.js');
  storageInstance = new NetlifyBlobProvider();
} else {
  console.log('[Storage] Initializing SQLite Provider at:', dbPath);
  const { default: SqliteProvider } = await import('./providers/sqliteProvider.js');
  storageInstance = new SqliteProvider(dbPath);
}

export default storageInstance;
