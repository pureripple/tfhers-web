// 管理端 AI 聊天（与用户端 Grok 布局一致；用户头像为管理员）

const ADMIN_AI_ASSISTANT_AVATAR = 'images/CSel3_LargePortOleander.png';
const ADMIN_USER_AVATAR_FALLBACK = 'images/CSel3_LargePortTianhuo.png';

function logout() {
    if (confirm('确定要退出登录吗？')) {
        localStorage.removeItem('admin_token');
        window.location.href = 'admin-login.html';
    }
}

class AIChat {
    constructor() {
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.charCount = document.getElementById('charCount');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.messageToast = document.getElementById('messageToast');
        this.aiStatus = document.getElementById('aiStatus');

        this.historyToggle = document.getElementById('historyToggle');
        this.historyDropdown = document.getElementById('historyDropdown');
        this.historyList = document.getElementById('historyList');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');

        this.chatHistory = [];
        this.isTyping = false;
        this.isHistoryOpen = false;
        this.adminAvatarUrl = ADMIN_USER_AVATAR_FALLBACK;

        this.init();
    }

    init() {
        const token = localStorage.getItem('admin_token');
        if (!token || token === 'null') {
            window.location.href = 'admin-login.html';
            return;
        }

        this.loadAdminUser();
        this.setupEventListeners();
        this.setupSidebarToggle();
        this.initUserMenu();
        this.loadChatHistory();
        this.updateCharCount();
    }

    setupSidebarToggle() {
        const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
        const syncFloat = () => {
            const collapsed = document.documentElement.classList.contains('sidebar-collapsed');
            const floatBtn = document.getElementById('sidebarFloatToggle');
            if (floatBtn) floatBtn.setAttribute('aria-label', collapsed ? '展开侧栏' : '收起侧栏');
        };
        const toggle = () => {
            if (isMobile()) {
                const open = !document.documentElement.classList.contains('sidebar-open');
                document.documentElement.classList.toggle('sidebar-open', open);
                document.body.classList.toggle('sidebar-open', open);
                const bd = document.getElementById('sidebarBackdrop');
                if (bd) {
                    bd.hidden = !open;
                    bd.setAttribute('aria-hidden', open ? 'false' : 'true');
                }
            } else {
                const collapsed = !document.documentElement.classList.contains('sidebar-collapsed');
                document.documentElement.classList.toggle('sidebar-collapsed', collapsed);
                document.body.classList.toggle('sidebar-collapsed', collapsed);
                try { localStorage.setItem('tfhers_admin_sidebar_collapsed', collapsed ? '1' : '0'); } catch (e) {}
                syncFloat();
            }
        };
        const closeMobile = () => {
            document.documentElement.classList.remove('sidebar-open');
            document.body.classList.remove('sidebar-open');
            const bd = document.getElementById('sidebarBackdrop');
            if (bd) {
                bd.hidden = true;
                bd.setAttribute('aria-hidden', 'true');
            }
        };
        try {
            if (localStorage.getItem('tfhers_admin_sidebar_collapsed') === '1') {
                document.documentElement.classList.add('sidebar-collapsed');
                document.body.classList.add('sidebar-collapsed');
            }
        } catch (e) {}
        syncFloat();
        const t1 = document.getElementById('sidebarToggle');
        const t2 = document.getElementById('sidebarFloatToggle');
        const bd = document.getElementById('sidebarBackdrop');
        if (t1) t1.addEventListener('click', toggle);
        if (t2) t2.addEventListener('click', toggle);
        if (bd) bd.addEventListener('click', closeMobile);
    }

    initUserMenu() {
        const btn = document.getElementById('topAvatarBtn');
        const panel = document.getElementById('topAccountPanel');
        const wrap = document.getElementById('topAvatarWrap');
        if (!btn || !panel) return;
        const close = () => {
            panel.hidden = true;
            btn.setAttribute('aria-expanded', 'false');
        };
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = panel.hidden;
            panel.hidden = !open;
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        document.addEventListener('click', (e) => {
            if (wrap && !wrap.contains(e.target)) close();
        });
    }

    async loadAdminUser() {
        try {
            const response = await fetch('/api/admin/userinfo', {
                headers: { Authorization: 'Bearer ' + localStorage.getItem('admin_token') }
            });
            const result = await response.json();
            if (result.code !== 200 || !result.data) return;

            const d = result.data;
            if (d.avatarUrl) {
                this.adminAvatarUrl = d.avatarUrl;
            }
            const displayName = d.realName || d.username || '管理员';
            const nameEl = document.getElementById('userName');
            const avatarEl = document.getElementById('userAvatar');
            const tapNick = document.getElementById('tapNickname');
            const tapUser = document.getElementById('tapUsername');
            const tapAvatar = document.getElementById('tapAvatar');
            if (nameEl) nameEl.textContent = displayName;
            if (tapNick) tapNick.textContent = displayName;
            if (tapUser) tapUser.textContent = '@' + (d.username || 'admin');
            const applyAvatar = (el) => {
                if (!el) return;
                el.src = this.adminAvatarUrl;
                el.onerror = () => {
                    el.onerror = null;
                    el.src = ADMIN_USER_AVATAR_FALLBACK;
                };
            };
            applyAvatar(avatarEl);
            applyAvatar(tapAvatar);
        } catch (e) {
            console.warn('加载管理员信息失败', e);
        }
    }

    setupEventListeners() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());

        this.messageInput.addEventListener('input', () => {
            this.updateCharCount();
            this.toggleSendButton();
            this.autoResizeTextarea();
        });

        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        document.getElementById('clearChatBtn').addEventListener('click', () => this.clearChat());
        document.getElementById('exportChatBtn').addEventListener('click', () => this.exportChat());

        this.historyToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleHistoryDropdown();
        });

        this.clearHistoryBtn.addEventListener('click', () => this.clearChat());

        document.addEventListener('click', (e) => {
            if (!this.historyToggle.contains(e.target) && !this.historyDropdown.contains(e.target)) {
                this.closeHistoryDropdown();
            }
        });
    }

    updateCharCount() {
        const count = this.messageInput.value.length;
        if (this.charCount) {
            this.charCount.textContent = `${count} / 1000`;
            this.charCount.classList.remove('is-warn', 'is-danger');
            if (count > 900) this.charCount.classList.add('is-danger');
            else if (count > 700) this.charCount.classList.add('is-warn');
        }
    }

    toggleSendButton() {
        const hasText = this.messageInput.value.trim().length > 0;
        this.sendBtn.disabled = !hasText || this.isTyping;
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 200) + 'px';
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isTyping) return;

        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.updateCharCount();
        this.toggleSendButton();
        this.autoResizeTextarea();

        this.showTypingIndicator();

        try {
            const response = await this.callAIAPI(message);
            this.hideTypingIndicator();
            this.addMessage(response, 'ai');
            this.saveToHistory(message, response);
        } catch (error) {
            console.error('AI调用失败:', error);
            this.hideTypingIndicator();
            this.addMessage('抱歉，我现在无法回答您的问题，请稍后再试。', 'ai');
            this.showToast('AI服务暂时不可用', 'error');
        }
    }

    async callAIAPI(message) {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `question=${encodeURIComponent(message)}`
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
            return result.data;
        }
        throw new Error(result.message || 'AI服务异常');
    }

    addMessage(content, type) {
        const messageDiv = this.createMessageElement(type);
        const messageText = messageDiv.querySelector('.message-text');
        messageText.textContent = content;
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    createMessageElement(type) {
        const isUser = type === 'user';
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message grok-msg grok-msg--${isUser ? 'user' : 'assistant'} grok-msg--appear`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar grok-msg-avatar grok-msg-avatar--img';

        const img = document.createElement('img');
        img.alt = '';
        if (isUser) {
            img.src = this.adminAvatarUrl || ADMIN_USER_AVATAR_FALLBACK;
        } else {
            img.src = ADMIN_AI_ASSISTANT_AVATAR;
        }
        img.onerror = () => {
            img.onerror = null;
            img.src = ADMIN_USER_AVATAR_FALLBACK;
        };
        avatar.appendChild(img);

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content grok-msg-body';

        const messageText = document.createElement('div');
        messageText.className = 'message-text';

        const messageTime = document.createElement('div');
        messageTime.className = 'message-time grok-msg-time';
        messageTime.textContent = this.getCurrentTime();

        messageContent.appendChild(messageText);
        messageContent.appendChild(messageTime);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);

        return messageDiv;
    }

    showTypingIndicator() {
        this.isTyping = true;
        this.toggleSendButton();

        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai-message grok-msg grok-msg--assistant typing-message grok-msg--appear';
        typingDiv.id = 'typingIndicator';

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar grok-msg-avatar grok-msg-avatar--img';
        const img = document.createElement('img');
        img.src = ADMIN_AI_ASSISTANT_AVATAR;
        img.alt = '';
        img.onerror = () => {
            img.onerror = null;
            img.src = ADMIN_USER_AVATAR_FALLBACK;
        };
        avatar.appendChild(img);

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content grok-msg-body';

        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.innerHTML = `
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;

        messageContent.appendChild(typingIndicator);
        typingDiv.appendChild(avatar);
        typingDiv.appendChild(messageContent);

        this.messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.isTyping = false;
        this.toggleSendButton();
        const el = document.getElementById('typingIndicator');
        if (el) el.remove();
    }

    scrollToBottom() {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 100);
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }

    getWelcomeHtml() {
        return `
            <div class="message ai-message grok-msg grok-msg--assistant grok-msg--appear" id="welcomeMessage">
                <div class="message-avatar grok-msg-avatar grok-msg-avatar--img">
                    <img src="${ADMIN_AI_ASSISTANT_AVATAR}" alt=""
                         onerror="this.onerror=null;this.src='${ADMIN_USER_AVATAR_FALLBACK}'">
                </div>
                <div class="message-content grok-msg-body">
                    <div class="message-text">
                        你好，我是蹄斗族群 AI 助手。可以问我角色、技能、攻略等问题。
                    </div>
                    <div class="message-time grok-msg-time">刚刚</div>
                </div>
            </div>
        `;
    }

    saveToHistory(userMessage, aiResponse) {
        this.chatHistory.push({
            user: userMessage,
            ai: aiResponse,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('aiChatHistory', JSON.stringify(this.chatHistory));
        this.updateHistoryPanel();
    }

    loadChatHistory() {
        const saved = localStorage.getItem('aiChatHistory');
        if (saved) {
            try {
                this.chatHistory = JSON.parse(saved);
            } catch {
                this.chatHistory = [];
            }
            this.updateHistoryPanel();
        }
    }

    updateHistoryPanel() {
        this.historyList.innerHTML = '';
        const recentHistory = this.chatHistory.slice(-10).reverse();

        if (recentHistory.length === 0) {
            this.historyList.innerHTML =
                '<div style="padding: 20px; text-align: center; color: var(--text-muted);">暂无对话历史</div>';
            return;
        }

        recentHistory.forEach((entry) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            const time = new Date(entry.timestamp).toLocaleString('zh-CN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            historyItem.innerHTML = `
                <span class="history-time">${time}</span>
                <span class="history-preview">${entry.user}</span>
            `;
            historyItem.addEventListener('click', () => {
                this.messageInput.value = entry.user;
                this.updateCharCount();
                this.toggleSendButton();
                this.closeHistoryDropdown();
            });
            this.historyList.appendChild(historyItem);
        });
    }

    toggleHistoryDropdown() {
        if (this.isHistoryOpen) {
            this.closeHistoryDropdown();
        } else {
            this.historyDropdown.classList.add('show');
            this.isHistoryOpen = true;
        }
    }

    closeHistoryDropdown() {
        this.historyDropdown.classList.remove('show');
        this.isHistoryOpen = false;
    }

    clearChat() {
        if (!confirm('确定要清空所有对话记录吗？')) return;
        this.messagesContainer.innerHTML = this.getWelcomeHtml();
        this.chatHistory = [];
        localStorage.removeItem('aiChatHistory');
        this.updateHistoryPanel();
        this.closeHistoryDropdown();
        this.showToast('对话记录已清空', 'success');
    }

    exportChat() {
        if (this.chatHistory.length === 0) {
            this.showToast('没有对话记录可导出', 'warning');
            return;
        }

        let exportText = '蹄斗族群AI助手对话记录\n' + '='.repeat(50) + '\n\n';
        this.chatHistory.forEach((entry, index) => {
            const time = new Date(entry.timestamp).toLocaleString('zh-CN');
            exportText += `对话 ${index + 1} - ${time}\n`;
            exportText += `用户: ${entry.user}\n`;
            exportText += `AI: ${entry.ai}\n`;
            exportText += '-'.repeat(30) + '\n\n';
        });

        const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AI对话记录_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showToast('对话记录已导出', 'success');
    }

    showToast(message, type = 'success') {
        const toast = this.messageToast;
        const messageText = document.getElementById('messageText');
        if (!toast || !messageText) return;

        messageText.textContent = message;
        toast.className = 'message-toast show';
        toast.classList.remove('error', 'warning', 'info');

        const icon = toast.querySelector('i');
        if (type === 'success') {
            if (icon) icon.className = 'fas fa-check-circle';
            toast.style.background = '';
        } else if (type === 'error') {
            if (icon) icon.className = 'fas fa-exclamation-circle';
            toast.classList.add('error');
            toast.style.background = '';
        } else if (type === 'warning') {
            if (icon) icon.className = 'fas fa-exclamation-triangle';
            toast.classList.add('warning');
            toast.style.background = '';
        }

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AIChat();
});

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('messageInput');
        if (input) input.focus();
    }
    if (e.key === 'Escape') {
        const input = document.getElementById('messageInput');
        if (input === document.activeElement) {
            input.value = '';
            input.dispatchEvent(new Event('input'));
        }
    }
});
