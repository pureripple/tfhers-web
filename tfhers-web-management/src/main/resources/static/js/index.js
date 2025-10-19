// 蹄斗族群助手 - 后台管理系统JavaScript功能

// 全局状态管理
const AppState = {
    currentPage: 'articles',
    articles: [],
    filteredArticles: [],
    currentPageNum: 1,
    pageSize: 10,
    totalPages: 0,
    searchKeyword: '',
    deleteArticleId: null,
    isLoggedIn: false,
    user: null,
    token: null
};

// API配置
const API_CONFIG = {
    baseURL: '/api/articles',
    endpoints: {
        getAll: '/all',
        search: '/search',
        delete: '/{id}'
    }
};

// DOM元素引用
const elements = {
    sidebar: document.querySelector('.sidebar'),
    sidebarToggle: document.getElementById('sidebarToggle'),
    navLinks: document.querySelectorAll('.nav-link'),
    pages: document.querySelectorAll('.page'),
    pageTitle: document.querySelector('.page-title'),
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    addArticleBtn: document.getElementById('addArticleBtn'),
    articlesTableBody: document.getElementById('articlesTableBody'),
    articleCount: document.getElementById('articleCount'),
    pagination: document.getElementById('pagination'),
    deleteModal: document.getElementById('deleteModal'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    deleteArticlePreview: document.getElementById('deleteArticlePreview'),
    addArticleModal: document.getElementById('addArticleModal'),
    addArticleForm: document.getElementById('addArticleForm'),
    confirmAddBtn: document.getElementById('confirmAddBtn'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    messageToast: document.getElementById('messageToast'),
    messageText: document.getElementById('messageText')
};

// 初始化应用
function initApp() {
    checkLoginStatus();
    setupEventListeners();
    loadArticles();
    showPage('articles');
}

// 检查登录状态
function checkLoginStatus() {
    const token = localStorage.getItem('admin_token');
    
    if (token) {
        AppState.isLoggedIn = true;
        AppState.token = token;
        // 从token中解析用户信息或从API获取
        getUserInfo();
    } else {
        // 未登录，重定向到登录页面
        window.location.href = '/admin-login.html';
    }
}


// 获取用户信息
async function getUserInfo() {
    try {
        const response = await fetch('/api/admin/userinfo', {
            headers: {
                'Authorization': 'Bearer ' + AppState.token
            }
        });
        
        const data = await response.json();
        
        if (data.code === 200) {
            AppState.user = data.data;
            updateUserInfo();
        } else {
            // token无效，清除登录状态
            logout();
        }
    } catch (error) {
        console.error('获取用户信息失败:', error);
        logout();
    }
}

// 更新用户信息显示
function updateUserInfo() {
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    
    if (AppState.user && userMenu && userName) {
        userName.textContent = AppState.user.realName || AppState.user.username || '管理员';
        if (userAvatar && AppState.user.avatarUrl) {
            userAvatar.src = AppState.user.avatarUrl;
        }
        userMenu.style.display = 'flex';
    }
}

// 设置用户菜单
function setupUserMenu() {
    const userInfo = document.getElementById('userInfo');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userInfo && userDropdown) {
        userInfo.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });
        
        // 点击其他地方关闭菜单
        document.addEventListener('click', function() {
            userDropdown.classList.remove('show');
        });
    }
}

// 登出功能
function logout() {
    AppState.isLoggedIn = false;
    AppState.user = null;
    AppState.token = null;
    
    localStorage.removeItem('admin_token');
    localStorage.removeItem('user');
    
    // 重定向到登录页面
    window.location.href = '/admin-login.html';
}

// 设置事件监听器
function setupEventListeners() {
    
    // 侧边栏切换
    if (elements.sidebarToggle) {
        elements.sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    // 导航链接点击
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const page = link.dataset.page;
            // 如果有data-page属性，则使用单页应用模式
            if (page) {
                e.preventDefault();
                showPage(page);
            }
            // 如果没有data-page属性，则允许默认的链接跳转行为
        });
    });
    
    // 搜索功能
    if (elements.searchBtn) {
        elements.searchBtn.addEventListener('click', handleSearch);
    }
    
    if (elements.searchInput) {
        elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }
    
    // 刷新按钮
    if (elements.refreshBtn) {
        elements.refreshBtn.addEventListener('click', () => {
            loadArticles();
        });
    }
    
    // 新增文章按钮
    if (elements.addArticleBtn) {
        elements.addArticleBtn.addEventListener('click', showAddArticleModal);
    }
    
    // 删除确认按钮
    if (elements.confirmDeleteBtn) {
        elements.confirmDeleteBtn.addEventListener('click', confirmDelete);
    }
    
    // 新增文章确认按钮
    if (elements.confirmAddBtn) {
        elements.confirmAddBtn.addEventListener('click', confirmAddArticle);
    }
    
    // 用户菜单
    setupUserMenu();
    
    // 模态框关闭
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeDeleteModal();
            closeAddArticleModal();
        }
    });
    
    // 键盘事件
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDeleteModal();
            closeAddArticleModal();
        }
    });
}

// 切换侧边栏
function toggleSidebar() {
    elements.sidebar.classList.toggle('open');
}

// 显示页面
function showPage(pageId) {
    // 隐藏所有页面
    elements.pages.forEach(page => {
        page.classList.remove('active');
    });
    
    // 显示目标页面
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        AppState.currentPage = pageId;
    }
    
    // 更新导航状态
    elements.navLinks.forEach(link => {
        link.parentElement.classList.remove('active');
        if (link.dataset.page === pageId) {
            link.parentElement.classList.add('active');
        }
    });
    
    // 更新页面标题
    const pageTitles = {
        'articles': '资讯管理',
        'characters': '角色管理',
        'settings': '系统设置'
    };
    
    if (elements.pageTitle) {
        elements.pageTitle.textContent = pageTitles[pageId] || '后台管理';
    }
    
    // 根据页面加载相应内容
    if (pageId === 'articles') {
        loadArticles();
    }
}

// 加载文章列表
async function loadArticles() {
    showLoading();
    
    try {
        const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.getAll}`, {
            headers: {
                'Authorization': 'Bearer ' + AppState.token
            }
        });
        const data = await response.json();
        
        if (data.code === 200) {
            AppState.articles = data.data || [];
            AppState.filteredArticles = [...AppState.articles];
            renderArticles();
            updatePagination();
        } else {
            showMessage(data.msg || '加载文章列表失败', 'error');
        }
    } catch (error) {
        console.error('加载文章列表失败:', error);
        showMessage('网络错误，请检查连接', 'error');
    } finally {
        hideLoading();
    }
}

// 处理搜索
async function handleSearch() {
    const keyword = elements.searchInput.value.trim();
    AppState.searchKeyword = keyword;
    AppState.currentPageNum = 1;
    
    if (!keyword) {
        AppState.filteredArticles = [...AppState.articles];
        renderArticles();
        updatePagination();
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.search}?keyword=${encodeURIComponent(keyword)}`, {
            headers: {
                'Authorization': 'Bearer ' + AppState.token
            }
        });
        const data = await response.json();
        
        if (data.code === 200) {
            AppState.filteredArticles = data.data || [];
            renderArticles();
            updatePagination();
        } else {
            showMessage(data.msg || '搜索失败', 'error');
        }
    } catch (error) {
        console.error('搜索失败:', error);
        showMessage('搜索失败，请重试', 'error');
    } finally {
        hideLoading();
    }
}

// 渲染文章列表
function renderArticles() {
    if (!elements.articlesTableBody) return;
    
    const startIndex = (AppState.currentPageNum - 1) * AppState.pageSize;
    const endIndex = startIndex + AppState.pageSize;
    const currentArticles = AppState.filteredArticles.slice(startIndex, endIndex);
    
    if (currentArticles.length === 0) {
        elements.articlesTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fas fa-inbox" style="font-size: 24px; margin-bottom: 12px; display: block;"></i>
                    ${AppState.searchKeyword ? '没有找到匹配的文章' : '暂无文章数据'}
                </td>
            </tr>
        `;
    } else {
        elements.articlesTableBody.innerHTML = currentArticles.map(article => `
            <tr>
                <td>${article.id}</td>
                <td>
                    <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${article.title}">
                        ${article.title}
                    </div>
                </td>
                <td>${article.author || '未知'}</td>
                <td>
                    <div style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${article.summary || ''}">
                        ${article.summary || '暂无摘要'}
                    </div>
                </td>
                <td>${article.view_count || 0}</td>
                <td>${formatDate(article.created_at)}</td>
                <td>
                    <div class="action-buttons-cell">
                        <button class="action-btn edit btn-sm" onclick="editArticle(${article.id})" title="编辑">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete btn-sm" onclick="showDeleteModal(${article.id}, '${article.title}')" title="删除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    // 更新文章数量
    if (elements.articleCount) {
        elements.articleCount.textContent = AppState.filteredArticles.length;
    }
}

// 更新分页
function updatePagination() {
    if (!elements.pagination) return;
    
    AppState.totalPages = Math.ceil(AppState.filteredArticles.length / AppState.pageSize);
    
    if (AppState.totalPages <= 1) {
        elements.pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // 上一页按钮
    paginationHTML += `
        <button class="pagination-btn ${AppState.currentPageNum === 1 ? 'disabled' : ''}" 
                onclick="changePage(${AppState.currentPageNum - 1})" 
                ${AppState.currentPageNum === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // 页码按钮
    const startPage = Math.max(1, AppState.currentPageNum - 2);
    const endPage = Math.min(AppState.totalPages, AppState.currentPageNum + 2);
    
    if (startPage > 1) {
        paginationHTML += `<button class="pagination-btn" onclick="changePage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="pagination-btn ${i === AppState.currentPageNum ? 'active' : ''}" 
                    onclick="changePage(${i})">
                ${i}
            </button>
        `;
    }
    
    if (endPage < AppState.totalPages) {
        if (endPage < AppState.totalPages - 1) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHTML += `<button class="pagination-btn" onclick="changePage(${AppState.totalPages})">${AppState.totalPages}</button>`;
    }
    
    // 下一页按钮
    paginationHTML += `
        <button class="pagination-btn ${AppState.currentPageNum === AppState.totalPages ? 'disabled' : ''}" 
                onclick="changePage(${AppState.currentPageNum + 1})" 
                ${AppState.currentPageNum === AppState.totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    elements.pagination.innerHTML = paginationHTML;
}

// 切换页面
function changePage(pageNum) {
    if (pageNum < 1 || pageNum > AppState.totalPages) return;
    
    AppState.currentPageNum = pageNum;
    renderArticles();
    updatePagination();
}

// 编辑文章
function editArticle(id) {
    showMessage('编辑文章功能开发中...', 'info');
}

// 显示新增文章模态框
function showAddArticleModal() {
    if (elements.addArticleModal) {
        elements.addArticleModal.style.display = 'flex';
        // 清空表单
        if (elements.addArticleForm) {
            elements.addArticleForm.reset();
        }
    }
}

// 关闭新增文章模态框
function closeAddArticleModal() {
    if (elements.addArticleModal) {
        elements.addArticleModal.style.display = 'none';
    }
}

// 确认新增文章
async function confirmAddArticle() {
    if (!elements.addArticleForm) return;
    
    // 获取表单数据
    const formData = new FormData(elements.addArticleForm);
    const articleData = {
        title: formData.get('title'),
        author: formData.get('author'),
        summary: formData.get('summary') || '',
        coverUrl: formData.get('coverUrl') || '',
        content: formData.get('content'),
        viewCount: 0
    };
    
    // 验证必填字段
    if (!articleData.title || articleData.title.trim() === '') {
        showMessage('请输入文章标题', 'error');
        return;
    }
    if (!articleData.author || articleData.author.trim() === '') {
        showMessage('请输入作者姓名', 'error');
        return;
    }
    if (!articleData.content || articleData.content.trim() === '') {
        showMessage('请输入文章内容', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${API_CONFIG.baseURL}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + AppState.token
            },
            body: JSON.stringify(articleData)
        });
        
        const data = await response.json();
        
        if (data.code === 200) {
            showMessage('新增文章成功', 'success');
            closeAddArticleModal();
            // 重新加载文章列表
            await loadArticles();
        } else {
            showMessage(data.msg || '新增文章失败', 'error');
        }
    } catch (error) {
        console.error('新增文章失败:', error);
        showMessage('新增文章失败，请重试', 'error');
    } finally {
        hideLoading();
    }
}

// 显示删除确认模态框
function showDeleteModal(id, title) {
    AppState.deleteArticleId = id;
    
    if (elements.deleteArticlePreview) {
        elements.deleteArticlePreview.innerHTML = `
            <h4>${title}</h4>
            <p>ID: ${id}</p>
        `;
    }
    
    if (elements.deleteModal) {
        elements.deleteModal.style.display = 'flex';
    }
}

// 关闭删除模态框
function closeDeleteModal() {
    if (elements.deleteModal) {
        elements.deleteModal.style.display = 'none';
    }
    AppState.deleteArticleId = null;
}

// 确认删除
async function confirmDelete() {
    if (!AppState.deleteArticleId) return;
    
    showLoading();
    
    try {
        const response = await fetch(`${API_CONFIG.baseURL}/${AppState.deleteArticleId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + AppState.token
            }
        });
        
        const data = await response.json();
        
        if (data.code === 200) {
            showMessage('删除成功', 'success');
            closeDeleteModal();
            // 重新加载文章列表
            await loadArticles();
        } else {
            showMessage(data.msg || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除失败:', error);
        showMessage('删除失败，请重试', 'error');
    } finally {
        hideLoading();
    }
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '未知';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
}

// 显示加载指示器
function showLoading() {
    if (elements.loadingIndicator) {
        elements.loadingIndicator.style.display = 'flex';
    }
}

// 隐藏加载指示器
function hideLoading() {
    if (elements.loadingIndicator) {
        elements.loadingIndicator.style.display = 'none';
    }
}

// 显示消息提示
function showMessage(message, type = 'success') {
    if (!elements.messageToast || !elements.messageText) return;
    
    elements.messageText.textContent = message;
    elements.messageToast.className = `message-toast ${type} show`;
    
    // 3秒后自动隐藏
    setTimeout(() => {
        elements.messageToast.classList.remove('show');
    }, 3000);
}

// AI助手按钮功能
function setupAIAssistantButton() {
    const aiButton = document.querySelector('.ai-assistant-fab');
    if (aiButton) {
        aiButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 检查当前是否在AI聊天页面
            if (window.location.pathname.includes('ai-chat.html')) {
                // 如果在AI页面，返回主页
                window.location.href = 'index.html';
            } else {
                // 如果在主页，跳转到AI页面
                window.location.href = 'ai-chat.html';
            }
        });
        
        // 根据当前页面设置按钮状态
        if (window.location.pathname.includes('ai-chat.html')) {
            aiButton.classList.add('active');
            aiButton.title = '返回主页';
        } else {
            aiButton.classList.remove('active');
            aiButton.title = 'AI游戏助手';
        }
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    setupAIAssistantButton();
});

