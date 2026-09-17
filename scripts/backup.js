import fs from 'node:fs';
import path from 'node:path';
import storage from '../services/storage.js';

async function backup() {
  console.log('--- Creating Backup ---');
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const users = await storage.getUsers();
  const messages = await storage.getMessages('private_001', { limit: 10000 });
  const pinned = await storage.getPinnedMessages('private_001');
  const memories = await storage.getMemories();

  const data = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    users,
    messages,
    pinned,
    memories
  };

  const filename = `backup-${Date.now()}.json`;
  const filePath = path.join(backupDir, filename);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✓ Backup successfully saved to ${filePath}`);
}

backup().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
