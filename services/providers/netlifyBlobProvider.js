import path from 'node:path';
import fs from 'node:fs';

class NetlifyBlobProvider {
  constructor() {
    this.storeName = process.env.NETLIFY_BLOBS_STORE || 'private_chat_store';
    this.getStore = null;
    this.fallbackMap = new Map();
  }

  async getStoreInstance() {
    try {
      if (!this.getStore) {
        const netlifyBlobs = await import('@netlify/blobs');
        this.getStore = netlifyBlobs.getStore;
      }
      return this.getStore({ name: this.storeName });
    } catch (e) {
      console.warn('getStoreInstance warning:', e.message);
      return null;
    }
  }

  async getData(key, defaultValue) {
    try {
      const store = await this.getStoreInstance();
      const val = await store.get(key, { type: 'json' });
      if (val !== null && val !== undefined) return val;
    } catch (e) {
      console.warn(`NetlifyBlobs fallback warning for ${key}:`, e.message);
    }
    return this.fallbackMap.has(key) ? this.fallbackMap.get(key) : defaultValue;
  }

  async setData(key, value) {
    this.fallbackMap.set(key, value);
    try {
      const store = await this.getStoreInstance();
      await store.setJSON(key, value);
    } catch (e) {
      console.warn(`NetlifyBlobs write error for ${key}:`, e.message);
    }
  }

  // --- Users ---
  async getSeededUsers() {
    let users = await this.getData('users', null);
    if (!users || users.length === 0) {
      users = [
        {
          id: 'user_1',
          username: 'tishu1221',
          name: 'Tishu',
          passwordHash: 'none',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          createdAt: new Date().toISOString()
        },
        {
          id: 'user_2',
          username: 'bugu1221',
          name: 'Bugu',
          passwordHash: 'none',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          createdAt: new Date().toISOString()
        }
      ];
      await this.setData('users', users);
    }
    return users;
  }

  async getUser(id) {
    const users = await this.getSeededUsers();
    const user = users.find(u => u.id === id);
    if (!user) return null;
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async getUserWithHash(id) {
    const users = await this.getSeededUsers();
    return users.find(u => u.id === id) || null;
  }

  async getUserByUsername(username) {
    const users = await this.getSeededUsers();
    return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }

  async getUsers() {
    const users = await this.getSeededUsers();
    return users.map(({ passwordHash, ...u }) => u);
  }

  async createUser(user) {
    const users = await this.getSeededUsers();
    users.push(user);
    await this.setData('users', users);
    return this.getUser(user.id);
  }

  async updateUser(id, data) {
    const users = await this.getData('users', []);
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return null;

    users[idx] = { ...users[idx], ...data };
    await this.setData('users', users);
    return this.getUser(id);
  }

  // --- Sessions ---
  async createSession(id, userId, expiresAt) {
    const sessions = await this.getData('sessions', []);
    const session = { id, userId, expiresAt, createdAt: new Date().toISOString() };
    sessions.push(session);
    await this.setData('sessions', sessions);
    return session;
  }

  async getSession(id) {
    const sessions = await this.getData('sessions', []);
    const session = sessions.find(s => s.id === id);
    if (!session) return null;
    if (new Date(session.expiresAt) < new Date()) {
      await this.deleteSession(id);
      return null;
    }
    return session;
  }

  async deleteSession(id) {
    let sessions = await this.getData('sessions', []);
    sessions = sessions.filter(s => s.id !== id);
    await this.setData('sessions', sessions);
  }

  // --- Messages ---
  async getMessages(conversationId = 'private_001', { limit = 50, before = null } = {}) {
    const messages = await this.getData(`messages_${conversationId}`, []);
    let filtered = messages;
    if (before) {
      const idx = filtered.findIndex(m => m.id === before);
      if (idx !== -1) filtered = filtered.slice(0, idx);
    }
    return filtered.slice(-limit);
  }

  async getNewMessages(conversationId = 'private_001', afterTimestamp = null) {
    const messages = await this.getData(`messages_${conversationId}`, []);
    if (!afterTimestamp) return messages;
    return messages.filter(m => 
      m.createdAt > afterTimestamp || 
      (m.editedAt && m.editedAt > afterTimestamp) || 
      (m.deletedAt && m.deletedAt > afterTimestamp)
    );
  }

  async getMessageById(id, conversationId = 'private_001') {
    const messages = await this.getData(`messages_${conversationId}`, []);
    return messages.find(m => m.id === id) || null;
  }

  async createMessage({ id, conversationId = 'private_001', senderId, content, replyToId = null, attachmentIds = [] }) {
    const users = await this.getData('users', []);
    const sender = users.find(u => u.id === senderId);
    
    let replyTo = null;
    if (replyToId) {
      const existing = await this.getMessageById(replyToId, conversationId);
      if (existing) {
        replyTo = {
          id: existing.id,
          content: existing.content,
          senderName: existing.senderName
        };
      }
    }

    const attachments = [];
    if (attachmentIds && attachmentIds.length > 0) {
      const allAtts = await this.getData('attachments', []);
      for (const attId of attachmentIds) {
        const found = allAtts.find(a => a.id === attId);
        if (found) attachments.push(found);
      }
    }

    const newMessage = {
      id,
      conversationId,
      senderId,
      senderName: sender ? sender.name : 'Unknown',
      senderAvatar: sender ? sender.avatar : null,
      content,
      createdAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
      isDeleted: false,
      replyTo,
      isPinned: false,
      reactions: {},
      attachments: attachments.map(a => ({
        id: a.id,
        filename: a.filename,
        originalName: a.originalName,
        mimeType: a.mimeType,
        size: a.size,
        url: `/api/attachments/${a.id}`
      }))
    };

    const messages = await this.getData(`messages_${conversationId}`, []);
    messages.push(newMessage);
    await this.setData(`messages_${conversationId}`, messages);
    return newMessage;
  }

  async updateMessage(id, userId, content, conversationId = 'private_001') {
    const messages = await this.getData(`messages_${conversationId}`, []);
    const idx = messages.findIndex(m => m.id === id);
    if (idx === -1 || messages[idx].senderId !== userId || messages[idx].isDeleted) return null;

    messages[idx].content = content;
    messages[idx].editedAt = new Date().toISOString();
    await this.setData(`messages_${conversationId}`, messages);
    return messages[idx];
  }

  async deleteMessage(id, userId, conversationId = 'private_001') {
    const messages = await this.getData(`messages_${conversationId}`, []);
    const idx = messages.findIndex(m => m.id === id);
    if (idx === -1 || messages[idx].senderId !== userId) return null;

    messages[idx].deletedAt = new Date().toISOString();
    messages[idx].isDeleted = true;
    messages[idx].content = 'This message was deleted';
    await this.setData(`messages_${conversationId}`, messages);
    return messages[idx];
  }

  // --- Reactions ---
  async toggleReaction(id, messageId, userId, emoji, conversationId = 'private_001') {
    const messages = await this.getData(`messages_${conversationId}`, []);
    const idx = messages.findIndex(m => m.id === messageId);
    if (idx === -1) return null;

    const users = await this.getData('users', []);
    const user = users.find(u => u.id === userId);
    const userName = user ? user.name : 'User';

    if (!messages[idx].reactions) messages[idx].reactions = {};
    if (!messages[idx].reactions[emoji]) messages[idx].reactions[emoji] = [];

    const existingIdx = messages[idx].reactions[emoji].findIndex(r => r.userId === userId);
    if (existingIdx !== -1) {
      messages[idx].reactions[emoji].splice(existingIdx, 1);
      if (messages[idx].reactions[emoji].length === 0) {
        delete messages[idx].reactions[emoji];
      }
    } else {
      messages[idx].reactions[emoji].push({ userId, userName });
    }

    await this.setData(`messages_${conversationId}`, messages);
    return messages[idx];
  }

  // --- Pinned Messages ---
  async togglePinMessage(id, conversationId, messageId, userId) {
    const messages = await this.getData(`messages_${conversationId}`, []);
    const idx = messages.findIndex(m => m.id === messageId);
    if (idx === -1) return null;

    messages[idx].isPinned = !messages[idx].isPinned;
    await this.setData(`messages_${conversationId}`, messages);
    return messages[idx];
  }

  async getPinnedMessages(conversationId = 'private_001') {
    const messages = await this.getData(`messages_${conversationId}`, []);
    return messages.filter(m => m.isPinned);
  }

  // --- Attachments ---
  async saveAttachment(att) {
    const attachments = await this.getData('attachments', []);
    const newAtt = { ...att, createdAt: new Date().toISOString() };
    attachments.push(newAtt);
    await this.setData('attachments', attachments);
    return newAtt;
  }

  async getAttachment(id) {
    const attachments = await this.getData('attachments', []);
    return attachments.find(a => a.id === id) || null;
  }

  // --- Presence & Typing ---
  async updatePresence(userId, status = 'online', isTyping = false) {
    const presenceMap = await this.getData('presence', {});
    presenceMap[userId] = {
      userId,
      status,
      lastSeen: new Date().toISOString(),
      isTyping,
      typingUpdatedAt: isTyping ? new Date().toISOString() : null
    };
    await this.setData('presence', presenceMap);
  }

  async getPresence() {
    const users = await this.getData('users', []);
    const presenceMap = await this.getData('presence', {});
    const result = {};

    for (const u of users) {
      const p = presenceMap[u.id];
      let isTyping = false;
      if (p && p.isTyping && p.typingUpdatedAt) {
        if (Date.now() - new Date(p.typingUpdatedAt).getTime() < 5000) {
          isTyping = true;
        }
      }
      let status = p ? p.status : 'offline';
      if (p && status === 'online' && p.lastSeen) {
        if (Date.now() - new Date(p.lastSeen).getTime() > 30000) {
          status = 'offline';
        }
      }

      result[u.id] = {
        userId: u.id,
        name: u.name,
        avatar: u.avatar,
        status,
        lastSeen: p ? p.lastSeen : u.createdAt,
        isTyping
      };
    }
    return result;
  }

  // --- Search ---
  async searchMessages(conversationId = 'private_001', query = '') {
    if (!query || !query.trim()) return [];
    const messages = await this.getData(`messages_${conversationId}`, []);
    const q = query.toLowerCase().trim();
    return messages.filter(m => !m.isDeleted && m.content.toLowerCase().includes(q));
  }

  // --- Settings ---
  async getSettings(userId) {
    const settingsMap = await this.getData('settings', {});
    return settingsMap[userId] || {
      theme: 'dark',
      background: 'plain',
      enterToSend: true,
      readReceipts: true,
      typingIndicator: true,
      notifications: true
    };
  }

  async updateSettings(userId, settings) {
    const current = await this.getSettings(userId);
    const updated = { ...current, ...settings };
    const settingsMap = await this.getData('settings', {});
    settingsMap[userId] = updated;
    await this.setData('settings', settingsMap);
    return updated;
  }

  // --- Memories ---
  async getMemories() {
    return await this.getData('memories', []);
  }

  async addMemory(data) {
    const memories = await this.getData('memories', []);
    const users = await this.getData('users', []);
    const user = users.find(u => u.id === data.createdBy);

    const memory = {
      id: data.id,
      title: data.title,
      description: data.description || '',
      attachmentId: data.attachmentId || null,
      attachmentUrl: data.attachmentId ? `/api/attachments/${data.attachmentId}` : null,
      createdAt: new Date().toISOString(),
      createdBy: data.createdBy,
      createdByName: user ? user.name : 'Soulmate'
    };

    memories.push(memory);
    await this.setData('memories', memories);
    return memory;
  }
}

export default NetlifyBlobProvider;
