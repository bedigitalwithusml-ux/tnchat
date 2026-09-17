import dotenv from 'dotenv';
import storage from '../services/storage.js';

dotenv.config();

async function setup() {
  console.log('--- Our Private Space Setup ---');

  const u1Username = process.env.USER_1_USERNAME || 'tishu1221';
  const u1Name = process.env.USER_1_NAME || 'Tishu';

  const u2Username = process.env.USER_2_USERNAME || 'bugu1221';
  const u2Name = process.env.USER_2_NAME || 'Bugu';

  console.log(`Setting up User 1 (${u1Username})...`);
  const existing1 = await storage.getUserByUsername(u1Username);
  if (!existing1) {
    await storage.createUser({
      id: 'user_1',
      username: u1Username,
      passwordHash: 'no_password_required',
      name: u1Name,
      bio: 'In our private space ❤️'
    });
    console.log(`✓ User 1 (${u1Username}) created.`);
  } else {
    console.log(`✓ User 1 (${u1Username}) already exists.`);
  }

  console.log(`Setting up User 2 (${u2Username})...`);
  const existing2 = await storage.getUserByUsername(u2Username);
  if (!existing2) {
    await storage.createUser({
      id: 'user_2',
      username: u2Username,
      passwordHash: 'no_password_required',
      name: u2Name,
      bio: 'Forever & always ❤️'
    });
    console.log(`✓ User 2 (${u2Username}) created.`);
  } else {
    console.log(`✓ User 2 (${u2Username}) already exists.`);
  }

  console.log('--- Setup Completed Successfully! ---');
  console.log('Authorized accounts:');
  console.log(`1. ${u1Username} (${u1Name})`);
  console.log(`2. ${u2Username} (${u2Name})`);
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
