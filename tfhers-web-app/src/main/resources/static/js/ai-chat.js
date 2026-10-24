// AI 聊天（用户端）：请求同域 /api/ai，由 tfhers-web-app 转发至管理端

const AI_CHAT_STORAGE_KEY = 'aiChatHistoryApp';
const AI_ASSISTANT_AVATAR = '/images/CSel3_LargePortOleander.png';
const DEFAULT_USER_AVATAR = '/images/CSel3_LargePortTianhuo.png';

function escapeHtmlAttr(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** 与首页一致：localStorage.user 中存在有效 token 视为已登录 */
function isUserLoggedIn() {
    try {
        const raw = localStorage.getItem('user');
        if (!raw) return false;
        const u = JSON.parse(raw);
        return !!(u && u.token && String(u.token).trim());
    } catch (e) {
        return false;
    }
}

function showAiChatLoginGate() {
    const gate = document.getElementById('aiChatLoginGate');
    if (!gate) return;
    gate.hidden = false;
    gate.classList.add('is-visible');
    gate.setAttribute('aria-hidden', 'false');
    document.body.classList.add('ai-chat-page--gated');
}

/** 与首页一致：从 localStorage.user 读取头像（avatarUrl / avatar_url / steamAvatarUrl） */
function getStoredUserAvatarUrl() {
    try {
        const raw = localStorage.getItem('user');
        if (!raw) return DEFAULT_USER_AVATAR;
        const u = JSON.parse(raw);
        const url = u.avatarUrl || u.avatar_url || u.steamAvatarUrl;
        if (url != null && String(url).trim() !== '') return String(url).trim();
    } catch (e) { /* ignore */ }
    return DEFAULT_USER_AVATAR;
}

class AIChat {
    constructor() {
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.charCount = document.getElementById('charCount');
        this.loadingIndicator = document.getElementById('aiChatLoadingIndicator');
        this.messageToast = document.getElementById('messageToast');
        this.aiStatus = document.getElementById('aiStatus');
        
        // 历史记录相关元素
        this.historyToggle = document.getElementById('historyToggle');
        this.historyDropdown = document.getElementById('historyDropdown');
        this.historyList = document.getElementById('historyList');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        
        this.chatHistory = [];
        this.isTyping = false;
        this.isHistoryOpen = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadChatHistory();
        this.updateCharCount();
        this.probeAiStatus();
    }

    async probeAiStatus() {
        if (!this.aiStatus) return;
        const set = (cls, label) => {
            this.aiStatus.className = 'status-indicator grok-status-dot ' + cls;
            this.aiStatus.innerHTML = '<i class="fas fa-circle"></i><span class="grok-status-text">' + label + '</span>';
        };
        try {
            const r = await fetch('/api/ai/status');
            const j = await r.json();
            if (j.success && j.data && j.data.status === 'online') {
                set('is-online', '在线');
            } else {
                set('is-warn', '异常');
            }
        } catch (e) {
            set('is-offline', '离线');
        }
    }
    
    setupEventListeners() {
        // 发送按钮点击事件
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // 输入框事件
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
        
        // 清空对话按钮
        document.getElementById('clearChatBtn').addEventListener('click', () => {
            this.clearChat();
        });
        
        // 导出对话按钮
        document.getElementById('exportChatBtn').addEventListener('click', () => {
            this.exportChat();
        });
        
        // 历史记录切换
        this.historyToggle.addEventListener('click', () => {
            this.toggleHistoryDropdown();
        });
        
        // 清空历史记录按钮
        this.clearHistoryBtn.addEventListener('click', () => {
            this.clearChat();
        });
        
        // 点击外部关闭历史记录下拉菜单
        document.addEventListener('click', (e) => {
            if (!this.historyToggle.contains(e.target) && !this.historyDropdown.contains(e.target)) {
                this.closeHistoryDropdown();
            }
        });
    }
    
    updateCharCount() {
        const count = this.messageInput.value.length;
        this.charCount.textContent = `${count} / 1000`;
        
        if (count > 900) {
            this.charCount.style.color = '#f87171';
        } else if (count > 700) {
            this.charCount.style.color = '#fbbf24';
        } else {
            this.charCount.style.color = '';
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
        
        // 添加用户消息
        this.addMessage(message, 'user');
        
        // 清空输入框
        this.messageInput.value = '';
        this.updateCharCount();
        this.toggleSendButton();
        this.autoResizeTextarea();
        
        // 显示加载状态
        this.showTypingIndicator();
        
        try {
            // 调用AI接口
            const response = await this.callAIAPI(message);
            
            // 移除打字指示器
            this.hideTypingIndicator();
            
            // 添加AI回复
            this.addMessage(response, 'ai');
            
            // 保存到历史记录
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
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `question=${encodeURIComponent(message)}`
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.message || 'AI服务异常');
        }
    }
    
    
    addMessage(content, type) {
        const messageDiv = this.createMessageElement(type);
        const messageText = messageDiv.querySelector('.message-text');
        messageText.textContent = content;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    createMessageElement(type) {
        const messageDiv = document.createElement('div');
        const role = type === 'user' ? 'user' : 'assistant';
        messageDiv.className = `message ${type}-message grok-msg grok-msg--${role} grok-msg--appear`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar grok-msg-avatar grok-msg-avatar--img';
        if (type === 'user') {
            const src = escapeHtmlAttr(getStoredUserAvatarUrl());
            avatar.innerHTML = `<img src="${src}" alt="" onerror="this.onerror=null;this.src='${DEFAULT_USER_AVATAR}'">`;
        } else {
            const src = escapeHtmlAttr(AI_ASSISTANT_AVATAR);
            avatar.innerHTML = `<img src="${src}" alt="" onerror="this.onerror=null;this.src='${DEFAULT_USER_AVATAR}'">`;
        }
        
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
        typingDiv.id = 'aiChatTypingIndicator';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar grok-msg-avatar grok-msg-avatar--img';
        const oSrc = escapeHtmlAttr(AI_ASSISTANT_AVATAR);
        avatar.innerHTML = `<img src="${oSrc}" alt="" onerror="this.onerror=null;this.src='${DEFAULT_USER_AVATAR}'">`;
        
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
        
        const typingIndicator = document.getElementById('aiChatTypingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    scrollToBottom() {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 100);
    }
    
    getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    saveToHistory(userMessage, aiResponse) {
        const chatEntry = {
            user: userMessage,
            ai: aiResponse,
            timestamp: new Date().toISOString()
        };
        
        this.chatHistory.push(chatEntry);
        localStorage.setItem(AI_CHAT_STORAGE_KEY, JSON.stringify(this.chatHistory));
        this.updateHistoryPanel();
    }
    
    loadChatHistory() {
        const saved = localStorage.getItem(AI_CHAT_STORAGE_KEY);
        if (saved) {
            this.chatHistory = JSON.parse(saved);
            this.updateHistoryPanel();
        }
    }
    
    updateHistoryPanel() {
        this.historyList.innerHTML = '';
        
        // 显示最近10条历史记录
        const recentHistory = this.chatHistory.slice(-10).reverse();
        
        if (recentHistory.length === 0) {
            this.historyList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">暂无对话历史</div>';
            return;
        }
        
        recentHistory.forEach(entry => {
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
            this.openHistoryDropdown();
        }
    }
    
    openHistoryDropdown() {
        this.historyDropdown.classList.add('show');
        this.isHistoryOpen = true;
    }
    
    closeHistoryDropdown() {
        this.historyDropdown.classList.remove('show');
        this.isHistoryOpen = false;
    }
    
    clearChat() {
        if (confirm('确定要清空所有对话记录吗？')) {
            this.messagesContainer.innerHTML = `
                <div class="message ai-message grok-msg grok-msg--assistant">
                    <div class="message-avatar grok-msg-avatar grok-msg-avatar--img">
                        <img src="${AI_ASSISTANT_AVATAR}" alt="" onerror="this.onerror=null;this.src='${DEFAULT_USER_AVATAR}'">
                    </div>
                    <div class="message-content grok-msg-body">
                        <div class="message-text">
                            你好，我是蹄斗族群 AI 助手。可以问我角色、技能、攻略等问题。
                        </div>
                        <div class="message-time grok-msg-time">刚刚</div>
                    </div>
                </div>
            `;
            
            this.chatHistory = [];
            localStorage.removeItem(AI_CHAT_STORAGE_KEY);
            this.updateHistoryPanel();
            this.closeHistoryDropdown();
            this.showToast('对话记录已清空', 'success');
        }
    }
    
    exportChat() {
        if (this.chatHistory.length === 0) {
            this.showToast('没有对话记录可导出', 'warning');
            return;
        }
        
        let exportText = '蹄斗族群AI助手对话记录\n';
        exportText += '='.repeat(50) + '\n\n';
        
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
        
        messageText.textContent = message;
        
        // 设置图标和颜色
        const icon = toast.querySelector('i');
        if (type === 'success') {
            icon.className = 'fas fa-check-circle';
            toast.style.background = '#28a745';
        } else if (type === 'error') {
            icon.className = 'fas fa-exclamation-circle';
            toast.style.background = '#dc3545';
        } else if (type === 'warning') {
            icon.className = 'fas fa-exclamation-triangle';
            toast.style.background = '#ffc107';
        }
        
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
}

/** 单页 index：由 main.js showPage('ai-chat') 调用 */
let aiChatSingleton = null;

function hideAiChatLoginGate() {
    const gate = document.getElementById('aiChatLoginGate');
    if (!gate) return;
    gate.hidden = true;
    gate.classList.remove('is-visible');
    gate.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('ai-chat-page--gated');
}

function mountAiChatPanel() {
    document.body.classList.add('ai-chat-page');
    if (!isUserLoggedIn()) {
        showAiChatLoginGate();
        return;
    }
    hideAiChatLoginGate();
    if (!aiChatSingleton) {
        aiChatSingleton = new AIChat();
    } else {
        aiChatSingleton.probeAiStatus();
    }
}

window.mountAiChatPanel = mountAiChatPanel;

// 添加一些工具函数
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // 1分钟内
        return '刚刚';
    } else if (diff < 3600000) { // 1小时内
        return Math.floor(diff / 60000) + '分钟前';
    } else if (diff < 86400000) { // 24小时内
        return Math.floor(diff / 3600000) + '小时前';
    } else {
        return date.toLocaleDateString('zh-CN');
    }
}

// 添加键盘快捷键支持
document.addEventListener('keydown', (e) => {
    const aiSec = document.getElementById('ai-chat');
    if (!aiSec || !aiSec.classList.contains('active')) return;
    if (document.body.classList.contains('ai-chat-page--gated')) return;

    const input = document.getElementById('messageInput');
    if (!input) return;

    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        input.focus();
    }

    if (e.key === 'Escape' && input === document.activeElement) {
        input.value = '';
        input.dispatchEvent(new Event('input'));
    }
});
