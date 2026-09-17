import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

class SqliteProvider {
  constructor(dbPath) {
    let DatabaseSync;
    try {
      const sqliteMod = require('node:sqlite');
      DatabaseSync = sqliteMod.DatabaseSync;
    } catch (e) {
      console.warn('[SqliteProvider] node:sqlite module not available in this Node runtime.');
    }

    if (!DatabaseSync) {
      throw new Error('node:sqlite is not supported in this Node environment.');
    }

    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new DatabaseSync(dbPath);
    this.init();
  }

  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT,
        bio TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        content TEXT NOT NULL,
        reply_to_id TEXT,
        created_at TEXT NOT NULL,
        edited_at TEXT,
        deleted_at TEXT,
        FOREIGN KEY(conversation_id) REFERENCES conversations(id),
        FOREIGN KEY(sender_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS reactions (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        emoji TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(message_id, user_id, emoji),
        FOREIGN KEY(message_id) REFERENCES messages(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS pinned_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        pinned_by TEXT NOT NULL,
        pinned_at TEXT NOT NULL,
        UNIQUE(conversation_id, message_id),
        FOREIGN KEY(conversation_id) REFERENCES conversations(id),
        FOREIGN KEY(message_id) REFERENCES messages(id)
      );

      CREATE TABLE IF NOT EXISTS attachments (
        id TEXT PRIMARY KEY,
        message_id TEXT,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        path TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS presence (
        user_id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'offline',
        last_seen TEXT NOT NULL,
        is_typing INTEGER DEFAULT 0,
        typing_updated_at TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        user_id TEXT PRIMARY KEY,
        theme TEXT DEFAULT 'dark',
        background TEXT DEFAULT 'plain',
        enter_to_send INTEGER DEFAULT 1,
        read_receipts INTEGER DEFAULT 1,
        typing_indicator INTEGER DEFAULT 1,
        notifications INTEGER DEFAULT 1,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        attachment_id TEXT,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        FOREIGN KEY(created_by) REFERENCES users(id)
      );
    `);

    // Ensure default conversation exists
    const convStmt = this.db.prepare('SELECT id FROM conversations WHERE id = ?');
    const conv = convStmt.get('private_001');
    if (!conv) {
      const insertConv = this.db.prepare(
        'INSERT INTO conversations (id, title, created_at) VALUES (?, ?, ?)'
      );
      insertConv.run('private_001', 'Our Private Space', new Date().toISOString());
    }
  }

  // --- Users ---
  getUser(id) {
    const stmt = this.db.prepare('SELECT id, username, name, avatar, bio, created_at FROM users WHERE id = ?');
    return stmt.get(id) || null;
  }

  getUserWithHash(id) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) || null;
  }

  getUserByUsername(username) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)');
    return stmt.get(username) || null;
  }

  getUsers() {
    const stmt = this.db.prepare('SELECT id, username, name, avatar, bio, created_at FROM users');
    return stmt.all();
  }

  createUser(user) {
    const stmt = this.db.prepare(
      'INSERT INTO users (id, username, password_hash, name, avatar, bio, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    stmt.run(
      user.id,
      user.username,
      user.passwordHash,
      user.name,
      user.avatar || null,
      user.bio || 'In our private space ❤️',
      user.createdAt || new Date().toISOString()
    );

    // Initialize presence & settings
    const presStmt = this.db.prepare(
      'INSERT OR IGNORE INTO presence (user_id, status, last_seen, is_typing) VALUES (?, ?, ?, 0)'
    );
    presStmt.run(user.id, 'offline', new Date().toISOString());

    const setStmt = this.db.prepare(
      'INSERT OR IGNORE INTO settings (user_id, theme, background) VALUES (?, ?, ?)'
    );
    setStmt.run(user.id, 'dark', 'plain');

    return this.getUser(user.id);
  }

  updateUser(id, data) {
    const current = this.getUserWithHash(id);
    if (!current) return null;

    const name = data.name !== undefined ? data.name : current.name;
    const avatar = data.avatar !== undefined ? data.avatar : current.avatar;
    const bio = data.bio !== undefined ? data.bio : current.bio;
    const passwordHash = data.passwordHash !== undefined ? data.passwordHash : current.password_hash;

    const stmt = this.db.prepare(
      'UPDATE users SET name = ?, avatar = ?, bio = ?, password_hash = ? WHERE id = ?'
    );
    stmt.run(name, avatar, bio, passwordHash, id);
    return this.getUser(id);
  }

  // --- Sessions ---
  createSession(id, userId, expiresAt) {
    const stmt = this.db.prepare(
      'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
    );
    const now = new Date().toISOString();
    stmt.run(id, userId, expiresAt, now);
    return { id, userId, expiresAt, createdAt: now };
  }

  getSession(id) {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
    const session = stmt.get(id);
    if (!session) return null;

    if (new Date(session.expires_at) < new Date()) {
      this.deleteSession(id);
      return null;
    }
    return {
      id: session.id,
      userId: session.user_id,
      expiresAt: session.expires_at,
      createdAt: session.created_at
    };
  }

  deleteSession(id) {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?');
    stmt.run(id);
  }

  // --- Messages ---
  getMessages(conversationId = 'private_001', { limit = 30, before = null } = {}) {
    let sql = `
      SELECT m.*, 
             u.name as sender_name, u.avatar as sender_avatar,
             rm.content as reply_content, ru.name as reply_sender_name,
             p.id as pinned_id
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN messages rm ON m.reply_to_id = rm.id
      LEFT JOIN users ru ON rm.sender_id = ru.id
      LEFT JOIN pinned_messages p ON m.id = p.message_id AND p.conversation_id = m.conversation_id
      WHERE m.conversation_id = ?
    `;
    const params = [conversationId];

    if (before) {
      sql += ` AND m.created_at < (SELECT created_at FROM messages WHERE id = ?)`;
      params.push(before);
    }

    sql += ` ORDER BY m.created_at DESC LIMIT ?`;
    params.push(limit);

    const rows = this.db.prepare(sql).all(...params);
    rows.reverse();

    return rows.map(row => this.formatMessageRow(row));
  }

  getNewMessages(conversationId = 'private_001', afterTimestamp = null) {
    let sql = `
      SELECT m.*, 
             u.name as sender_name, u.avatar as sender_avatar,
             rm.content as reply_content, ru.name as reply_sender_name,
             p.id as pinned_id
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN messages rm ON m.reply_to_id = rm.id
      LEFT JOIN users ru ON rm.sender_id = ru.id
      LEFT JOIN pinned_messages p ON m.id = p.message_id AND p.conversation_id = m.conversation_id
      WHERE m.conversation_id = ?
    `;
    const params = [conversationId];

    if (afterTimestamp) {
      sql += ` AND (m.created_at > ? OR m.edited_at > ? OR m.deleted_at > ?)`;
      params.push(afterTimestamp, afterTimestamp, afterTimestamp);
    }

    sql += ` ORDER BY m.created_at ASC`;

    const rows = this.db.prepare(sql).all(...params);
    return rows.map(row => this.formatMessageRow(row));
  }

  getMessageById(id) {
    const sql = `
      SELECT m.*, 
             u.name as sender_name, u.avatar as sender_avatar,
             rm.content as reply_content, ru.name as reply_sender_name,
             p.id as pinned_id
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN messages rm ON m.reply_to_id = rm.id
      LEFT JOIN users ru ON rm.sender_id = ru.id
      LEFT JOIN pinned_messages p ON m.id = p.message_id AND p.conversation_id = m.conversation_id
      WHERE m.id = ?
    `;
    const row = this.db.prepare(sql).get(id);
    return row ? this.formatMessageRow(row) : null;
  }

  formatMessageRow(row) {
    // Get reactions for this message
    const rxStmt = this.db.prepare(`
      SELECT r.emoji, r.user_id, u.name as user_name
      FROM reactions r
      JOIN users u ON r.user_id = u.id
      WHERE r.message_id = ?
    `);
    const reactions = rxStmt.all(row.id);

    // Group reactions by emoji
    const reactionMap = {};
    for (const rx of reactions) {
      if (!reactionMap[rx.emoji]) {
        reactionMap[rx.emoji] = [];
      }
      reactionMap[rx.emoji].push({ userId: rx.user_id, userName: rx.user_name });
    }

    // Get attachments
    const attStmt = this.db.prepare(`
      SELECT id, filename, original_name, mime_type, size, path
      FROM attachments
      WHERE message_id = ?
    `);
    const attachments = attStmt.all(row.id);

    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      senderAvatar: row.sender_avatar,
      content: row.deleted_at ? 'This message was deleted' : row.content,
      createdAt: row.created_at,
      editedAt: row.edited_at,
      deletedAt: row.deleted_at,
      isDeleted: !!row.deleted_at,
      replyTo: row.reply_to_id ? {
        id: row.reply_to_id,
        content: row.reply_content || 'Original message',
        senderName: row.reply_sender_name || 'Someone'
      } : null,
      isPinned: !!row.pinned_id,
      reactions: reactionMap,
      attachments: attachments.map(a => ({
        id: a.id,
        filename: a.filename,
        originalName: a.original_name,
        mimeType: a.mime_type,
        size: a.size,
        url: `/api/attachments/${a.id}`
      }))
    };
  }

  createMessage({ id, conversationId = 'private_001', senderId, content, replyToId = null, attachmentIds = [] }) {
    const stmt = this.db.prepare(
      'INSERT INTO messages (id, conversation_id, sender_id, content, reply_to_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const now = new Date().toISOString();
    stmt.run(id, conversationId, senderId, content, replyToId, now);

    if (attachmentIds && attachmentIds.length > 0) {
      const attStmt = this.db.prepare('UPDATE attachments SET message_id = ? WHERE id = ?');
      for (const attId of attachmentIds) {
        attStmt.run(id, attId);
      }
    }

    return this.getMessageById(id);
  }

  updateMessage(id, userId, content) {
    const msg = this.getMessageById(id);
    if (!msg || msg.senderId !== userId || msg.isDeleted) return null;

    const now = new Date().toISOString();
    const stmt = this.db.prepare('UPDATE messages SET content = ?, edited_at = ? WHERE id = ?');
    stmt.run(content, now, id);
    return this.getMessageById(id);
  }

  deleteMessage(id, userId) {
    const msg = this.getMessageById(id);
    if (!msg || msg.senderId !== userId) return null;

    const now = new Date().toISOString();
    const stmt = this.db.prepare('UPDATE messages SET deleted_at = ? WHERE id = ?');
    stmt.run(now, id);
    return this.getMessageById(id);
  }

  // --- Reactions ---
  toggleReaction(id, messageId, userId, emoji) {
    const checkStmt = this.db.prepare('SELECT id FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?');
    const existing = checkStmt.get(messageId, userId, emoji);

    if (existing) {
      const delStmt = this.db.prepare('DELETE FROM reactions WHERE id = ?');
      delStmt.run(existing.id);
    } else {
      const now = new Date().toISOString();
      const insStmt = this.db.prepare('INSERT INTO reactions (id, message_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?, ?)');
      insStmt.run(id, messageId, userId, emoji, now);
    }

    return this.getMessageById(messageId);
  }

  // --- Pinned Messages ---
  togglePinMessage(id, conversationId, messageId, userId) {
    const checkStmt = this.db.prepare('SELECT id FROM pinned_messages WHERE conversation_id = ? AND message_id = ?');
    const existing = checkStmt.get(conversationId, messageId);

    if (existing) {
      const delStmt = this.db.prepare('DELETE FROM pinned_messages WHERE id = ?');
      delStmt.run(existing.id);
    } else {
      const now = new Date().toISOString();
      const insStmt = this.db.prepare('INSERT INTO pinned_messages (id, conversation_id, message_id, pinned_by, pinned_at) VALUES (?, ?, ?, ?, ?)');
      insStmt.run(id, conversationId, messageId, userId, now);
    }

    return this.getMessageById(messageId);
  }

  getPinnedMessages(conversationId = 'private_001') {
    const stmt = this.db.prepare('SELECT message_id FROM pinned_messages WHERE conversation_id = ? ORDER BY pinned_at DESC');
    const rows = stmt.all(conversationId);
    return rows.map(r => this.getMessageById(r.message_id)).filter(Boolean);
  }

  // --- Attachments ---
  saveAttachment({ id, filename, originalName, mimeType, size, path: filePath }) {
    const stmt = this.db.prepare(
      'INSERT INTO attachments (id, filename, original_name, mime_type, size, path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const now = new Date().toISOString();
    stmt.run(id, filename, originalName, mimeType, size, filePath, now);

    return { id, filename, originalName, mimeType, size, path: filePath, createdAt: now };
  }

  getAttachment(id) {
    const stmt = this.db.prepare('SELECT * FROM attachments WHERE id = ?');
    return stmt.get(id) || null;
  }

  // --- Presence & Typing ---
  updatePresence(userId, status = 'online', isTyping = false) {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO presence (user_id, status, last_seen, is_typing, typing_updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        status = excluded.status,
        last_seen = excluded.last_seen,
        is_typing = excluded.is_typing,
        typing_updated_at = excluded.typing_updated_at
    `);
    stmt.run(userId, status, now, isTyping ? 1 : 0, isTyping ? now : null);
  }

  getPresence() {
    const users = this.getUsers();
    const result = {};

    for (const u of users) {
      const stmt = this.db.prepare('SELECT * FROM presence WHERE user_id = ?');
      const p = stmt.get(u.id);
      
      let isTyping = false;
      if (p && p.is_typing && p.typing_updated_at) {
        // Expire typing indicator after 5 seconds
        const diff = Date.now() - new Date(p.typing_updated_at).getTime();
        if (diff < 5000) {
          isTyping = true;
        }
      }

      // Expire online status after 30 seconds of inactivity
      let status = p ? p.status : 'offline';
      if (p && status === 'online' && p.last_seen) {
        const diff = Date.now() - new Date(p.last_seen).getTime();
        if (diff > 30000) {
          status = 'offline';
        }
      }

      result[u.id] = {
        userId: u.id,
        name: u.name,
        avatar: u.avatar,
        status,
        lastSeen: p ? p.last_seen : u.created_at,
        isTyping
      };
    }

    return result;
  }

  // --- Search ---
  searchMessages(conversationId = 'private_001', query = '') {
    if (!query || !query.trim()) return [];
    const sql = `
      SELECT m.id
      FROM messages m
      WHERE m.conversation_id = ? AND m.deleted_at IS NULL AND m.content LIKE ?
      ORDER BY m.created_at DESC
      LIMIT 50
    `;
    const rows = this.db.prepare(sql).all(conversationId, `%${query.trim()}%`);
    return rows.map(r => this.getMessageById(r.id)).filter(Boolean);
  }

  // --- Settings ---
  getSettings(userId) {
    const stmt = this.db.prepare('SELECT * FROM settings WHERE user_id = ?');
    const s = stmt.get(userId);
    if (!s) {
      return {
        theme: 'dark',
        background: 'plain',
        enterToSend: true,
        readReceipts: true,
        typingIndicator: true,
        notifications: true
      };
    }
    return {
      theme: s.theme || 'dark',
      background: s.background || 'plain',
      enterToSend: !!s.enter_to_send,
      readReceipts: !!s.read_receipts,
      typingIndicator: !!s.typing_indicator,
      notifications: !!s.notifications
    };
  }

  updateSettings(userId, newSettings) {
    const current = this.getSettings(userId);
    const updated = { ...current, ...newSettings };

    const stmt = this.db.prepare(`
      INSERT INTO settings (user_id, theme, background, enter_to_send, read_receipts, typing_indicator, notifications)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        theme = excluded.theme,
        background = excluded.background,
        enter_to_send = excluded.enter_to_send,
        read_receipts = excluded.read_receipts,
        typing_indicator = excluded.typing_indicator,
        notifications = excluded.notifications
    `);
    stmt.run(
      userId,
      updated.theme,
      updated.background,
      updated.enterToSend ? 1 : 0,
      updated.readReceipts ? 1 : 0,
      updated.typingIndicator ? 1 : 0,
      updated.notifications ? 1 : 0
    );

    return this.getSettings(userId);
  }

  // --- Memories ---
  getMemories() {
    const stmt = this.db.prepare(`
      SELECT m.*, u.name as created_by_name, a.filename, a.original_name, a.mime_type
      FROM memories m
      JOIN users u ON m.created_by = u.id
      LEFT JOIN attachments a ON m.attachment_id = a.id
      ORDER BY m.created_at DESC
    `);
    const rows = stmt.all();
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      attachmentId: r.attachment_id,
      attachmentUrl: r.attachment_id ? `/api/attachments/${r.attachment_id}` : null,
      createdAt: r.created_at,
      createdBy: r.created_by,
      createdByName: r.created_by_name
    }));
  }

  addMemory({ id, title, description, attachmentId, createdBy }) {
    const stmt = this.db.prepare(
      'INSERT INTO memories (id, title, description, attachment_id, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const now = new Date().toISOString();
    stmt.run(id, title, description || '', attachmentId || null, now, createdBy);
    return this.getMemories().find(m => m.id === id);
  }
}

export default SqliteProvider;
