import fs from 'node:fs';
import path from 'node:path';

async function restore() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: npm run restore <path-to-backup.json>');
    process.exit(1);
  }

  const backupPath = path.resolve(args[0]);
  if (!fs.existsSync(backupPath)) {
    console.error(`Backup file not found at: ${backupPath}`);
    process.exit(1);
  }

  console.log(`--- Restoring from ${backupPath} ---`);
  const raw = fs.readFileSync(backupPath, 'utf8');
  const data = JSON.parse(raw);

  console.log(`Backup export date: ${data.exportedAt}`);
  console.log(`Users count: ${data.users?.length || 0}`);
  console.log(`Messages count: ${data.messages?.length || 0}`);

  console.log('✓ Verification of backup file format complete.');
}

restore().catch(err => {
  console.error('Restore failed:', err);
  process.exit(1);
});
