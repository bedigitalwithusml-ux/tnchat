import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import multer from 'multer';

import storage from './services/storage.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

// File filter validation
const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'audio/mpeg', 'audio/wav', 'audio/ogg'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: Images, PDF, TXT, DOC, Audio.'));
    }
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static frontend files from 'public'
app.use(express.static(path.join(process.cwd(), 'public')));

// Rate limiter helper for login attempts
// --- AUTH ENDPOINTS ---

app.post('/api/auth/login', async (req, res) => {
  const { username } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Username is required.' }
    });
  }

  try {
    let user = await storage.getUserByUsername(username.trim());
    if (!user) {
      const cleanName = username.trim().toLowerCase();
      if (cleanName === 'tishu1221') {
        user = await storage.createUser({ id: 'user_1', username: 'tishu1221', name: 'Tishu', passwordHash: 'none' });
      } else if (cleanName === 'bugu1221') {
        user = await storage.createUser({ id: 'user_2', username: 'bugu1221', name: 'Bugu', passwordHash: 'none' });
      } else {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Please enter tishu1221 or bugu1221' }
        });
      }
    }

    // Create session (expires in 30 days)
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await storage.createSession(sessionId, user.id, expiresAt);

    res.cookie('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    const safeUser = await storage.getUser(user.id);
    return res.json({ success: true, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' }
    });
  }
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  try {
    await storage.deleteSession(req.sessionId);
    res.clearCookie('session_id');
    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: 'Logout failed.' } });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const presence = await storage.getPresence();
  return res.json({
    success: true,
    user: req.user,
    presence
  });
});

// --- MESSAGES ENDPOINTS ---

app.get('/api/messages', requireAuth, async (req, res) => {
  try {
    const { before, after, limit } = req.query;
    if (after) {
      const messages = await storage.getNewMessages('private_001', after);
      return res.json({ success: true, messages });
    }
    const messages = await storage.getMessages('private_001', {
      before: before || null,
      limit: parseInt(limit, 10) || 50
    });
    return res.json({ success: true, messages });
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ success: false, error: { message: 'Failed to retrieve messages.' } });
  }
});

app.post('/api/messages', requireAuth, async (req, res) => {
  try {
    const { content, replyToId, attachmentIds } = req.body;
    if ((!content || !content.trim()) && (!attachmentIds || attachmentIds.length === 0)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Message content or attachment is required.' }
      });
    }

    const msgId = `msg_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const message = await storage.createMessage({
      id: msgId,
      conversationId: 'private_001',
      senderId: req.user.id,
      content: content ? content.trim() : '',
      replyToId: replyToId || null,
      attachmentIds: attachmentIds || []
    });

    // Update presence timestamp
    await storage.updatePresence(req.user.id, 'online', false);

    return res.json({ success: true, message });
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ success: false, error: { message: 'Failed to send message.' } });
  }
});

app.patch('/api/messages/:id', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Content cannot be empty.' } });
    }

    const updated = await storage.updateMessage(req.params.id, req.user.id, content.trim());
    if (!updated) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot edit message or message not found.' }
      });
    }

    return res.json({ success: true, message: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: 'Failed to edit message.' } });
  }
});

app.delete('/api/messages/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await storage.deleteMessage(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot delete message or message not found.' }
      });
    }

    return res.json({ success: true, message: deleted });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: 'Failed to delete message.' } });
  }
});

app.post('/api/messages/:id/reactions', requireAuth, async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) {
      return res.status(400).json({ success: false, error: { message: 'Emoji is required.' } });
    }

    const rxId = `rx_${uuidv4().substring(0, 8)}`;
    const updated = await storage.toggleReaction(rxId, req.params.id, req.user.id, emoji);
    return res.json({ success: true, message: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: 'Failed to toggle reaction.' } });
  }
});

app.post('/api/messages/:id/pin', requireAuth, async (req, res) => {
  try {
    const pinId = `pin_${uuidv4().substring(0, 8)}`;
    const updated = await storage.togglePinMessage(pinId, 'private_001', req.params.id, req.user.id);
    return res.json({ success: true, message: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: 'Failed to toggle pin.' } });
  }
});

app.get('/api/pinned', requireAuth, async (req, res) => {
  try {
    const pinned = await storage.getPinnedMessages('private_001');
    return res.json({ success: true, pinned });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: 'Failed to fetch pinned messages.' } });
  }
});

// --- PRESENCE & TYPING ---

app.post('/api/presence', requireAuth, async (req, res) => {
  try {
    const { status = 'online', isTyping = false } = req.body;
    await storage.updatePresence(req.user.id, status, isTyping);
    const presence = await storage.getPresence();
    return res.json({ success: true, presence });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: 'Failed to update presence.' } });
  }
});

app.get('/api/presence', requireAuth, async (req, res) => {
  try {
    const presence = await storage.getPresence();
    return res.json({ success: true, presence });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: 'Failed to fetch presence.' } });
  }
});

// --- UPLOADS & ATTACHMENTS ---

app.post('/api/upload', requireAuth, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: { message: err.message } });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: { message: 'No file uploaded.' } });
    }

    try {
      const attId = `att_${uuidv4().substring(0, 8)}`;
      const attachment = await storage.saveAttachment({
        id: attId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      });

      return res.json({
        success: true,
        attachment: {
          id: attachment.id,
          filename: attachment.filename,
          originalName: attachment.originalName,
          mimeType: attachment.mimeType,
          size: attachment.size,
          url: `/api/attachments/${attachment.id}`
        }
      });
    } catch (e) {
      console.error('Save attachment error:', e);
      return res.status(500).json({ success: false, error: { message: 'Failed to save attachment metadata.' } });
    }
  });
});

app.get('/api/attachments/:id', requireAuth, async (req, res) => {
  try {
    const att = await storage.getAttachment(req.params.id);
    if (!att || !fs.existsSync(att.path)) {
      return res.status(404).json({ success: false, error: { message: 'Attachment not found.' } });
    }

    res.setHeader('Content-Type', att.mime_type || att.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${att.original_name || att.originalName}"`);
    return res.sendFile(path.resolve(att.path));
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: 'Failed to load attachment.' } });
  }
});

// --- SEARCH ---

app.get('/api/search', requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    const results = await storage.searchMessages('private_001', q || '');
    return res.json({ success: true, results });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: 'Search failed.' } });
  }
});

// --- SETTINGS & PROFILE ---

app.get('/api/settings', requireAuth, async (req, res) => {
  try {
    const settings = await storage.getSettings(req.user.id);
    return res.json({ success: true, settings });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: 'Failed to fetch settings.' } });
  }
});

app.patch('/api/settings', requireAuth, async (req, res) => {
  try {
    const updated = await storage.updateSettings(req.user.id, req.body);
    return res.json({ success: true, settings: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: 'Failed to update settings.' } });
  }
});

app.patch('/api/profile', requireAuth, async (req, res) => {
  try {
    const { name, bio, password, newPassword } = req.body;
    const updateData = {};

    if (name) updateData.name = name.trim();
    if (bio) updateData.bio = bio.trim();

    if (newPassword) {
      if (!password) {
        return res.status(400).json({ success: false, error: { message: 'Current password is required to change password.' } });
      }
      const userWithHash = await storage.getUserWithHash(req.user.id);
      const match = await bcrypt.compare(password, userWithHash.password_hash);
      if (!match) {
        return res.status(401).json({ success: false, error: { message: 'Current password is incorrect.' } });
      }
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(newPassword, salt);
    }

    const updatedUser = await storage.updateUser(req.user.id, updateData);
    return res.json({ success: true, user: updatedUser });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: 'Failed to update profile.' } });
  }
});

// --- MEMORIES ---

app.get('/api/memories', requireAuth, async (req, res) => {
  try {
    const memories = await storage.getMemories();
    return res.json({ success: true, memories });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: 'Failed to fetch memories.' } });
  }
});

app.post('/api/memories', requireAuth, async (req, res) => {
  try {
    const { title, description, attachmentId } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Title is required for memory.' } });
    }

    const memId = `mem_${uuidv4().substring(0, 8)}`;
    const memory = await storage.addMemory({
      id: memId,
      title: title.trim(),
      description: description ? description.trim() : '',
      attachmentId: attachmentId || null,
      createdBy: req.user.id
    });

    return res.json({ success: true, memory });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: 'Failed to save memory.' } });
  }
});

// Catch-all route for SPA navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// Start Express server when run directly
app.listen(PORT, async () => {
  console.log(`❤️ Our Private Space server running at http://localhost:${PORT}`);
});

export default app;
