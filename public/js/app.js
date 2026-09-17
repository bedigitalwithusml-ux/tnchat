/**
 * Our Space Direct ❤️ - IG Style Client Application
 */

class PrivateChatApp {
  constructor() {
    this.currentUser = null;
    this.partnerUser = null;
    this.messages = [];
    this.lastMessageTimestamp = null;
    this.pollingInterval = null;
    this.replyToMsg = null;
    this.editingMsg = null;
    this.pendingAttachmentIds = [];
    this.isTypingTimer = null;
    this.isLoadingOlder = false;
    this.hasMoreOlder = true;

    this.initDOM();
    this.bindEvents();
    this.checkAuthStatus();
  }

  initDOM() {
    // Views
    this.loginScreen = document.getElementById('loginScreen');
    this.appScreen = document.getElementById('appScreen');
    this.loginForm = document.getElementById('loginForm');
    this.authError = document.getElementById('authError');
    this.toggleManualLoginBtn = document.getElementById('toggleManualLoginBtn');
    this.usernameInput = document.getElementById('usernameInput');

    // Header
    this.partnerAvatar = document.getElementById('partnerAvatar');
    this.partnerName = document.getElementById('partnerName');
    this.partnerStatusDot = document.getElementById('partnerStatusDot');
    this.partnerStatusText = document.getElementById('partnerStatusText');
    this.switchUserBtn = document.getElementById('switchUserBtn');
    this.myUserBadge = document.getElementById('myUserBadge');
    this.themeToggleBtn = document.getElementById('themeToggleBtn');

    // Message stream
    this.messagesContainer = document.getElementById('messagesContainer');
    this.messageStream = document.getElementById('messageStream');
    this.emptyState = document.getElementById('emptyState');
    this.emptyPartnerAvatar = document.getElementById('emptyPartnerAvatar');
    this.emptyPartnerTitle = document.getElementById('emptyPartnerTitle');
    this.sendFirstMsgBtn = document.getElementById('sendFirstMsgBtn');
    this.typingIndicator = document.getElementById('typingIndicator');
    this.typingText = document.getElementById('typingText');

    // Composer
    this.messageInput = document.getElementById('messageInput');
    this.sendMsgBtn = document.getElementById('sendMsgBtn');
    this.sendHeartBtn = document.getElementById('sendHeartBtn');
    this.attachBtn = document.getElementById('attachBtn');
    this.fileInput = document.getElementById('fileInput');

    // Preview bars
    this.replyBar = document.getElementById('replyBar');
    this.replySnippet = document.getElementById('replySnippet');
    this.cancelReplyBtn = document.getElementById('cancelReplyBtn');

    this.editBar = document.getElementById('editBar');
    this.editSnippet = document.getElementById('editSnippet');
    this.cancelEditBtn = document.getElementById('cancelEditBtn');

    this.attachmentPreviewBar = document.getElementById('attachmentPreviewBar');
    this.attachmentThumbnails = document.getElementById('attachmentThumbnails');
    this.cancelAttachmentBtn = document.getElementById('cancelAttachmentBtn');

    // Drawers
    this.searchToggleBtn = document.getElementById('searchToggleBtn');
    this.searchDrawer = document.getElementById('searchDrawer');
    this.closeSearchBtn = document.getElementById('closeSearchBtn');
    this.searchInput = document.getElementById('searchInput');
    this.searchResults = document.getElementById('searchResults');

    this.pinnedToggleBtn = document.getElementById('pinnedToggleBtn');
    this.pinnedDrawer = document.getElementById('pinnedDrawer');
    this.closePinnedBtn = document.getElementById('closePinnedBtn');
    this.pinnedList = document.getElementById('pinnedList');

    this.memoriesToggleBtn = document.getElementById('memoriesToggleBtn');
    this.memoriesDrawer = document.getElementById('memoriesDrawer');
    this.closeMemoriesBtn = document.getElementById('closeMemoriesBtn');
    this.memoriesGrid = document.getElementById('memoriesGrid');
    this.saveMemoryBtn = document.getElementById('saveMemoryBtn');
    this.memoryTitleInput = document.getElementById('memoryTitleInput');
    this.memoryDescInput = document.getElementById('memoryDescInput');

    // Lightbox
    this.lightboxModal = document.getElementById('lightboxModal');
    this.lightboxImg = document.getElementById('lightboxImg');
    this.lightboxDownloadBtn = document.getElementById('lightboxDownloadBtn');
    this.closeLightboxBtn = document.getElementById('closeLightboxBtn');
  }

  bindEvents() {
    // Auth Form & Quick Buttons
    this.loginForm?.addEventListener('submit', (e) => this.handleLogin(e));

    document.querySelectorAll('.quick-user-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const username = btn.dataset.username;
        this.loginWithUsername(username);
      });
    });

    if (this.toggleManualLoginBtn) {
      this.toggleManualLoginBtn.addEventListener('click', () => {
        this.loginForm?.classList.toggle('hidden');
      });
    }

    if (this.switchUserBtn) {
      this.switchUserBtn.addEventListener('click', () => this.handleSwitchUser());
    }

    if (this.themeToggleBtn) {
      this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
    }

    if (this.sendFirstMsgBtn) {
      this.sendFirstMsgBtn.addEventListener('click', () => {
        if (this.messageInput) this.messageInput.value = '👋 Hey!';
        this.sendMessage();
      });
    }

    // Message Input & Composer
    this.messagesContainer?.addEventListener('scroll', () => {
      if (this.messagesContainer.scrollTop <= 40 && !this.isLoadingOlder && this.hasMoreOlder && this.messages.length > 0) {
        this.loadOlderMessages();
      }
    });

    this.messageInput?.addEventListener('input', () => {
      this.autoResizeTextarea();
      this.toggleSendButton();
      this.handleTypingHeartbeat();
    });

    this.messageInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    this.sendMsgBtn?.addEventListener('click', () => this.sendMessage());
    this.sendHeartBtn?.addEventListener('click', () => {
      if (this.messageInput) this.messageInput.value = '❤️';
      this.sendMessage();
    });

    // File Attachments
    this.attachBtn?.addEventListener('click', () => this.fileInput?.click());
    this.fileInput?.addEventListener('change', (e) => this.handleFileSelection(e));
    this.cancelAttachmentBtn?.addEventListener('click', () => this.clearPendingAttachments());

    // Cancel state buttons
    this.cancelReplyBtn?.addEventListener('click', () => this.clearReplyState());
    this.cancelEditBtn?.addEventListener('click', () => this.clearEditState());

    // Drawers Toggles
    this.searchToggleBtn?.addEventListener('click', () => this.toggleDrawer(this.searchDrawer));
    this.closeSearchBtn?.addEventListener('click', () => this.searchDrawer?.classList.add('hidden'));
    this.searchInput?.addEventListener('input', () => this.handleSearch());

    this.pinnedToggleBtn?.addEventListener('click', () => {
      this.toggleDrawer(this.pinnedDrawer);
      this.loadPinnedMessages();
    });
    this.closePinnedBtn?.addEventListener('click', () => this.pinnedDrawer?.classList.add('hidden'));

    this.memoriesToggleBtn?.addEventListener('click', () => {
      this.toggleDrawer(this.memoriesDrawer);
      this.loadMemories();
    });
    this.closeMemoriesBtn?.addEventListener('click', () => this.memoriesDrawer?.classList.add('hidden'));
    this.saveMemoryBtn?.addEventListener('click', () => this.handleSaveMemory());

    // Lightbox Close
    this.closeLightboxBtn?.addEventListener('click', () => this.lightboxModal?.classList.add('hidden'));
    this.lightboxModal?.addEventListener('click', (e) => {
      if (e.target === this.lightboxModal) this.lightboxModal?.classList.add('hidden');
    });
  }

  // --- AUTHENTICATION & LOCALSTORAGE ---

  async checkAuthStatus() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();

      if (data.success) {
        this.currentUser = data.user;
        localStorage.setItem('ig_user', data.user.username);
        this.setupAppScreen(data.presence);
        return;
      }
    } catch (err) {}

    // Fallback: Check localStorage saved username
    const savedUser = localStorage.getItem('ig_user');
    if (savedUser) {
      await this.loginWithUsername(savedUser);
    } else {
      this.showLoginScreen();
    }
  }

  async handleLogin(e) {
    if (e) e.preventDefault();
    this.authError.classList.add('hidden');
    const username = this.usernameInput.value.trim();
    if (!username) return;
    await this.loginWithUsername(username);
  }

  async loginWithUsername(username) {
    this.authError.classList.add('hidden');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await res.json();

      if (data.success) {
        this.currentUser = data.user;
        localStorage.setItem('ig_user', data.user.username);
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();
        this.setupAppScreen(meData.presence);
      } else {
        localStorage.removeItem('ig_user');
        this.authError.textContent = data.error?.message || 'Please select Tishu or Bugu';
        this.authError.classList.remove('hidden');
        this.showLoginScreen();
      }
    } catch (err) {
      this.authError.textContent = 'Server connection error. Please try again.';
      this.authError.classList.remove('hidden');
      this.showLoginScreen();
    }
  }

  async handleSwitchUser() {
    localStorage.removeItem('ig_user');
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    this.stopPolling();
    this.showLoginScreen();
  }

  showLoginScreen() {
    this.loginScreen.classList.remove('hidden');
    this.appScreen.classList.add('hidden');
  }

  setupAppScreen(presenceData) {
    this.loginScreen.classList.add('hidden');
    this.appScreen.classList.remove('hidden');

    const savedTheme = localStorage.getItem('ig_theme') || 'dark';
    this.setTheme(savedTheme);

    this.updatePartnerPresenceUI(presenceData);
    this.loadInitialMessages();
    this.startPolling();
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ig_theme', theme);
    if (this.themeToggleBtn) {
      this.themeToggleBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
  }

  // --- PRESENCE & USER UI ---

  updatePartnerPresenceUI(presenceData) {
    if (!presenceData) return;
    const partnerId = Object.keys(presenceData).find(id => id !== this.currentUser.id);

    if (partnerId && presenceData[partnerId]) {
      const partner = presenceData[partnerId];
      this.partnerUser = partner;
      this.partnerName.textContent = partner.name || 'Soulmate';
      this.partnerAvatar.textContent = partner.name === 'Tishu' ? '❤️' : '🥰';
      this.emptyPartnerTitle.textContent = partner.name || 'Soulmate';
      this.emptyPartnerAvatar.textContent = partner.name === 'Tishu' ? '❤️' : '🥰';

      if (partner.status === 'online') {
        this.partnerStatusDot.className = 'status-dot online';
        this.partnerStatusText.textContent = partner.isTyping ? 'typing...' : 'Active now';
      } else {
        this.partnerStatusDot.className = 'status-dot offline';
        const lastSeenDate = new Date(partner.lastSeen);
        this.partnerStatusText.textContent = `Active ${this.formatTimeAgo(lastSeenDate)}`;
      }

      if (partner.isTyping) {
        this.typingText.textContent = `${partner.name} is typing...`;
        this.typingIndicator.classList.remove('hidden');
      } else {
        this.typingIndicator.classList.add('hidden');
      }
    }
  }

  handleTypingHeartbeat() {
    if (this.isTypingTimer) clearTimeout(this.isTypingTimer);
    
    fetch('/api/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'online', isTyping: true })
    }).catch(() => {});

    this.isTypingTimer = setTimeout(() => {
      fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'online', isTyping: false })
      }).catch(() => {});
    }, 4000);
  }

  // --- MESSAGES & STREAM ---

  async loadInitialMessages() {
    this.isLoadingOlder = false;
    this.hasMoreOlder = true;
    try {
      const res = await fetch('/api/messages?limit=30');
      const data = await res.json();

      if (data.success) {
        this.messages = data.messages || [];
        if (this.messages.length < 30) {
          this.hasMoreOlder = false;
        }
        this.renderMessageStream(true);
        if (this.messages.length > 0) {
          this.lastMessageTimestamp = this.messages[this.messages.length - 1].createdAt;
        }
      }
    } catch (err) {}
  }

  async loadOlderMessages() {
    if (this.isLoadingOlder || !this.hasMoreOlder || this.messages.length === 0) return;
    this.isLoadingOlder = true;

    const oldestMsg = this.messages[0];
    const oldScrollHeight = this.messagesContainer.scrollHeight;

    try {
      const res = await fetch(`/api/messages?before=${encodeURIComponent(oldestMsg.id)}&limit=30`);
      const data = await res.json();

      if (data.success && data.messages && data.messages.length > 0) {
        if (data.messages.length < 30) {
          this.hasMoreOlder = false;
        }

        const newOlder = data.messages.filter(m => !this.messages.some(existing => existing.id === m.id));
        if (newOlder.length > 0) {
          this.messages = [...newOlder, ...this.messages];
          this.renderMessageStream(false);

          const newScrollHeight = this.messagesContainer.scrollHeight;
          this.messagesContainer.scrollTop = newScrollHeight - oldScrollHeight;
        } else {
          this.hasMoreOlder = false;
        }
      } else {
        this.hasMoreOlder = false;
      }
    } catch (err) {
    } finally {
      this.isLoadingOlder = false;
    }
  }

  async pollUpdates() {
    try {
      let url = '/api/messages';
      if (this.lastMessageTimestamp) {
        url += `?after=${encodeURIComponent(this.lastMessageTimestamp)}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.success && data.messages) {
        if (data.messages.length > 0) {
          for (const newMsg of data.messages) {
            const idx = this.messages.findIndex(m => m.id === newMsg.id);
            if (idx !== -1) {
              this.messages[idx] = newMsg;
            } else {
              this.messages.push(newMsg);
            }
          }
          this.lastMessageTimestamp = data.messages[data.messages.length - 1].createdAt;
          this.renderMessageStream(true);
        }
      }

      // Poll presence
      const presRes = await fetch('/api/presence');
      const presData = await presRes.json();
      if (presData.success) {
        this.updatePartnerPresenceUI(presData.presence);
      }
    } catch (err) {}
  }

  startPolling() {
    this.stopPolling();
    this.pollingInterval = setInterval(() => this.pollUpdates(), 2000);
  }

  stopPolling() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  }

  renderMessageStream(autoScroll = true) {
    if (this.messages.length === 0) {
      this.emptyState.classList.remove('hidden');
      this.messageStream.innerHTML = '';
      return;
    }

    this.emptyState.classList.add('hidden');
    this.messageStream.innerHTML = '';

    let lastDateStr = null;

    this.messages.forEach(msg => {
      const msgDate = new Date(msg.createdAt);
      const dateStr = msgDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      if (dateStr !== lastDateStr) {
        lastDateStr = dateStr;
        const dateDiv = document.createElement('div');
        dateDiv.className = 'date-divider';
        dateDiv.textContent = dateStr;
        this.messageStream.appendChild(dateDiv);
      }

      const row = this.createMessageRowElement(msg);
      this.messageStream.appendChild(row);
    });

    if (autoScroll) {
      this.scrollToBottom();
    }
  }

  createMessageRowElement(msg) {
    const isOwn = msg.senderId === this.currentUser.id;
    const row = document.createElement('div');
    row.className = `message-row ${isOwn ? 'own' : 'partner'}`;
    row.id = `msg-row-${msg.id}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    // Reply Quote
    if (msg.replyTo) {
      const quote = document.createElement('div');
      quote.className = 'reply-quote';
      quote.innerHTML = `<span class="reply-quote-text"><strong>${this.escapeHTML(msg.replyTo.senderName)}:</strong> ${this.escapeHTML(msg.replyTo.content)}</span>`;
      quote.addEventListener('click', () => this.scrollToMessage(msg.replyTo.id));
      bubble.appendChild(quote);
    }

    // Attachments
    if (msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach(att => {
        if (att.mimeType && att.mimeType.startsWith('image/')) {
          const img = document.createElement('img');
          img.src = att.url;
          img.className = 'bubble-attachment-img';
          img.alt = att.originalName;
          img.addEventListener('click', () => this.openLightbox(att.url));
          bubble.appendChild(img);
        } else {
          const fileCard = document.createElement('a');
          fileCard.href = att.url;
          fileCard.download = att.originalName;
          fileCard.className = 'bubble-attachment-file';
          fileCard.innerHTML = `
            <span>📄</span>
            <span>${this.escapeHTML(att.originalName)}</span>
          `;
          bubble.appendChild(fileCard);
        }
      });
    }

    // Text Content
    const textSpan = document.createElement('div');
    if (msg.isDeleted) {
      textSpan.className = 'message-deleted';
      textSpan.textContent = 'This message was deleted';
    } else {
      textSpan.textContent = msg.content;
    }
    bubble.appendChild(textSpan);

    // Meta Info (Timestamp)
    const meta = document.createElement('div');
    meta.className = 'message-meta';
    const timeStr = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    meta.innerHTML = `${msg.isPinned ? '📌 ' : ''}${msg.editedAt && !msg.isDeleted ? 'edited • ' : ''}${timeStr}`;
    bubble.appendChild(meta);

    // Context Action Popover
    bubble.addEventListener('click', (e) => {
      if (e.target.tagName !== 'IMG' && e.target.tagName !== 'A') {
        this.showMessageActionsMenu(msg, e);
      }
    });

    row.appendChild(bubble);

    // Reactions
    if (msg.reactions && Object.keys(msg.reactions).length > 0) {
      const rxRow = document.createElement('div');
      rxRow.className = 'reactions-row';

      for (const [emoji, users] of Object.entries(msg.reactions)) {
        if (users.length > 0) {
          const badge = document.createElement('span');
          const hasUserReacted = users.some(u => u.userId === this.currentUser.id);
          badge.className = `reaction-badge ${hasUserReacted ? 'user-reacted' : ''}`;
          badge.innerHTML = `${emoji} ${users.length}`;
          badge.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleReaction(msg.id, emoji);
          });
          rxRow.appendChild(badge);
        }
      }
      row.appendChild(rxRow);
    }

    return row;
  }

  // --- SEND & MANAGE MESSAGES ---

  async sendMessage() {
    const text = this.messageInput.value.trim();
    if (!text && this.pendingAttachmentIds.length === 0) return;

    if (this.editingMsg) {
      await this.saveEditedMessage(text);
      return;
    }

    const payload = {
      content: text,
      replyToId: this.replyToMsg ? this.replyToMsg.id : null,
      attachmentIds: this.pendingAttachmentIds
    };

    try {
      this.messageInput.value = '';
      this.autoResizeTextarea();
      this.toggleSendButton();

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        this.messages.push(data.message);
        this.lastMessageTimestamp = data.message.createdAt;
        this.clearReplyState();
        this.clearPendingAttachments();
        this.renderMessageStream();
      }
    } catch (err) {}
  }

  async saveEditedMessage(newText) {
    if (!this.editingMsg) return;
    try {
      const res = await fetch(`/api/messages/${this.editingMsg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newText })
      });
      const data = await res.json();
      if (data.success) {
        const idx = this.messages.findIndex(m => m.id === this.editingMsg.id);
        if (idx !== -1) this.messages[idx] = data.message;
        this.clearEditState();
        this.messageInput.value = '';
        this.autoResizeTextarea();
        this.toggleSendButton();
        this.renderMessageStream();
      }
    } catch (e) {}
  }

  async deleteMessage(msgId) {
    if (!confirm('Delete message?')) return;
    try {
      const res = await fetch(`/api/messages/${msgId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        const idx = this.messages.findIndex(m => m.id === msgId);
        if (idx !== -1) this.messages[idx] = data.message;
        this.renderMessageStream();
      }
    } catch (e) {}
  }

  async toggleReaction(msgId, emoji) {
    try {
      const res = await fetch(`/api/messages/${msgId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      });
      const data = await res.json();
      if (data.success) {
        const idx = this.messages.findIndex(m => m.id === msgId);
        if (idx !== -1) this.messages[idx] = data.message;
        this.renderMessageStream();
      }
    } catch (e) {}
  }

  async togglePin(msgId) {
    try {
      const res = await fetch(`/api/messages/${msgId}/pin`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const idx = this.messages.findIndex(m => m.id === msgId);
        if (idx !== -1) this.messages[idx] = data.message;
        this.renderMessageStream();
      }
    } catch (e) {}
  }

  // --- ACTIONS POPOVER ---

  showMessageActionsMenu(msg, event) {
    const existing = document.getElementById('msgActionsMenu');
    if (existing) existing.remove();

    if (msg.isDeleted) return;

    const menu = document.createElement('div');
    menu.id = 'msgActionsMenu';
    menu.className = 'popover-modal';
    menu.style.position = 'fixed';
    menu.style.top = `${Math.min(event.clientY, window.innerHeight - 200)}px`;
    menu.style.left = `${Math.min(event.clientX, window.innerWidth - 180)}px`;
    menu.style.zIndex = '500';
    menu.style.display = 'flex';
    menu.style.flexDirection = 'column';
    menu.style.gap = '6px';
    menu.style.padding = '8px';

    const isOwn = msg.senderId === this.currentUser.id;

    menu.innerHTML = `
      <div style="display:flex; gap:6px; margin-bottom:4px;">
        <span class="emoji-item" data-rx="❤️">❤️</span>
        <span class="emoji-item" data-rx="😂">😂</span>
        <span class="emoji-item" data-rx="🥹">🥹</span>
        <span class="emoji-item" data-rx="🔥">🔥</span>
      </div>
      <button class="btn-secondary" id="actReply" style="text-align:left; font-size:0.85rem;">↩ Reply</button>
      <button class="btn-secondary" id="actPin" style="text-align:left; font-size:0.85rem;">📌 ${msg.isPinned ? 'Unpin' : 'Pin'}</button>
      ${isOwn ? `<button class="btn-secondary" id="actEdit" style="text-align:left; font-size:0.85rem;">✏️ Edit</button>` : ''}
      ${isOwn ? `<button class="btn-secondary" id="actDelete" style="text-align:left; font-size:0.85rem; color:#ef4444;">🗑️ Delete</button>` : ''}
    `;

    document.body.appendChild(menu);

    menu.querySelectorAll('[data-rx]').forEach(el => {
      el.addEventListener('click', () => {
        this.toggleReaction(msg.id, el.dataset.rx);
        menu.remove();
      });
    });

    document.getElementById('actReply')?.addEventListener('click', () => {
      this.setReplyState(msg);
      menu.remove();
    });

    document.getElementById('actPin')?.addEventListener('click', () => {
      this.togglePin(msg.id);
      menu.remove();
    });

    document.getElementById('actEdit')?.addEventListener('click', () => {
      this.setEditState(msg);
      menu.remove();
    });

    document.getElementById('actDelete')?.addEventListener('click', () => {
      this.deleteMessage(msg.id);
      menu.remove();
    });

    const closeHandler = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 10);
  }

  // --- REPLIES, EDITS & ATTACHMENTS ---

  setReplyState(msg) {
    this.clearEditState();
    this.replyToMsg = msg;
    this.replySnippet.textContent = msg.content || 'Attachment';
    this.replyBar.classList.remove('hidden');
    this.messageInput.focus();
  }

  clearReplyState() {
    this.replyToMsg = null;
    this.replyBar.classList.add('hidden');
  }

  setEditState(msg) {
    this.clearReplyState();
    this.editingMsg = msg;
    this.editSnippet.textContent = msg.content;
    this.editBar.classList.remove('hidden');
    this.messageInput.value = msg.content;
    this.autoResizeTextarea();
    this.toggleSendButton();
    this.messageInput.focus();
  }

  clearEditState() {
    this.editingMsg = null;
    this.editBar.classList.add('hidden');
  }

  async convertToWebP(file, maxDimension = 1200, quality = 0.8) {
    if (!file.type.startsWith('image/')) {
      return file;
    }

    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const webpName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
              const webpFile = new File([blob], webpName, { type: 'image/webp' });
              resolve(webpFile);
            } else {
              resolve(file);
            }
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };

      img.src = url;
    });
  }

  async handleFileSelection(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    for (const file of files) {
      const fileToUpload = await this.convertToWebP(file);

      const formData = new FormData();
      formData.append('file', fileToUpload);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();

        if (data.success) {
          this.pendingAttachmentIds.push(data.attachment.id);
          this.renderAttachmentPreviews(data.attachment);
        }
      } catch (err) {}
    }
  }

  renderAttachmentPreviews(att) {
    this.attachmentPreviewBar.classList.remove('hidden');
    const thumb = document.createElement('div');
    thumb.style.fontSize = '0.8rem';
    thumb.style.background = 'var(--bg-pill)';
    thumb.style.padding = '4px 8px';
    thumb.style.borderRadius = '4px';
    thumb.textContent = att.originalName;
    this.attachmentThumbnails.appendChild(thumb);
    this.toggleSendButton();
  }

  clearPendingAttachments() {
    this.pendingAttachmentIds = [];
    this.attachmentThumbnails.innerHTML = '';
    this.attachmentPreviewBar.classList.add('hidden');
    this.toggleSendButton();
  }

  // --- DRAWERS & SEARCH ---

  toggleDrawer(drawerEl) {
    [this.searchDrawer, this.pinnedDrawer, this.memoriesDrawer].forEach(d => {
      if (d !== drawerEl) d.classList.add('hidden');
    });
    drawerEl.classList.toggle('hidden');
  }

  async handleSearch() {
    const q = this.searchInput.value.trim();
    if (!q) {
      this.searchResults.innerHTML = '';
      return;
    }

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (data.success) {
        this.searchResults.innerHTML = '';
        if (data.results.length === 0) {
          this.searchResults.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">No results.</p>`;
          return;
        }

        data.results.forEach(msg => {
          const item = document.createElement('div');
          item.className = 'search-item';
          item.innerHTML = `
            <div class="search-item-sender">${this.escapeHTML(msg.senderName)}</div>
            <div>${this.escapeHTML(msg.content)}</div>
          `;
          item.addEventListener('click', () => {
            this.searchDrawer.classList.add('hidden');
            this.scrollToMessage(msg.id);
          });
          this.searchResults.appendChild(item);
        });
      }
    } catch (e) {}
  }

  async loadPinnedMessages() {
    try {
      const res = await fetch('/api/pinned');
      const data = await res.json();

      if (data.success) {
        this.pinnedList.innerHTML = '';
        if (data.pinned.length === 0) {
          this.pinnedList.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">No pinned messages.</p>`;
          return;
        }

        data.pinned.forEach(msg => {
          const item = document.createElement('div');
          item.className = 'pinned-item';
          item.innerHTML = `
            <div class="pinned-item-sender">${this.escapeHTML(msg.senderName)}</div>
            <div>${this.escapeHTML(msg.content)}</div>
          `;
          item.addEventListener('click', () => {
            this.pinnedDrawer.classList.add('hidden');
            this.scrollToMessage(msg.id);
          });
          this.pinnedList.appendChild(item);
        });
      }
    } catch (e) {}
  }

  async loadMemories() {
    try {
      const res = await fetch('/api/memories');
      const data = await res.json();

      if (data.success) {
        this.memoriesGrid.innerHTML = '';
        data.memories.forEach(mem => {
          const card = document.createElement('div');
          card.className = 'memory-card';
          card.innerHTML = `
            ${mem.attachmentUrl ? `<img src="${mem.attachmentUrl}" alt="${this.escapeHTML(mem.title)}">` : ''}
            <div class="memory-card-content">
              <div style="font-weight:600; font-size:0.95rem;">${this.escapeHTML(mem.title)}</div>
              <div style="font-size:0.84rem; color:var(--text-secondary); margin-top:2px;">${this.escapeHTML(mem.description)}</div>
            </div>
          `;
          this.memoriesGrid.appendChild(card);
        });
      }
    } catch (e) {}
  }

  async handleSaveMemory() {
    const title = this.memoryTitleInput.value.trim();
    const description = this.memoryDescInput.value.trim();
    if (!title) return;

    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description })
      });
      const data = await res.json();
      if (data.success) {
        this.memoryTitleInput.value = '';
        this.memoryDescInput.value = '';
        this.loadMemories();
      }
    } catch (e) {}
  }

  // --- UTILS ---

  autoResizeTextarea() {
    this.messageInput.style.height = 'auto';
    this.messageInput.style.height = `${Math.min(this.messageInput.scrollHeight, 100)}px`;
  }

  toggleSendButton() {
    const hasText = this.messageInput.value.trim().length > 0;
    const hasAtt = this.pendingAttachmentIds.length > 0;

    if (hasText || hasAtt) {
      this.sendHeartBtn.classList.add('hidden');
      this.sendMsgBtn.classList.remove('hidden');
    } else {
      this.sendMsgBtn.classList.add('hidden');
      this.sendHeartBtn.classList.remove('hidden');
    }
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  scrollToMessage(msgId) {
    const el = document.getElementById(`msg-row-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  openLightbox(url) {
    this.lightboxImg.src = url;
    this.lightboxDownloadBtn.href = url;
    this.lightboxModal.classList.remove('hidden');
  }

  escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  }
}

// Instantiate on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  window.chatApp = new PrivateChatApp();
});
