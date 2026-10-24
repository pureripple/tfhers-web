// 蹄斗族群助手 - 主要JavaScript文件
//
// API 基址自动切换（本地 / 上线一般不用改这里）：
// - 覆盖优先级：?api=http://host:8081  >  window.__TFHERS_API__  >  <meta name="tfhers-api" content="...">
// - hostname 为 localhost / 127.0.0.1 / ::1 → managementApiUrl 直连同主机 :8081
// - 其他（Nginx 生产）→ managementApiUrl 为空，请求同源 /api/（由 Nginx 反代到 8081）
// 线上：上传 static + 配好 Nginx /api/ 即可，无需改 apiBaseUrl / managementApiUrl。
// apiBaseUrl 始终走同源（本地 8080 自有接口；线上 Nginx /api/）。

// 全局状态管理
function resolveApiBaseUrls() {
    const empty = { apiBaseUrl: '', managementApiUrl: '' };
    if (typeof location === 'undefined') {
        return empty;
    }

    const normalize = (raw) => {
        if (raw == null) return '';
        const s = String(raw).trim().replace(/\/$/, '');
        return s;
    };

    // 1) 显式覆盖（调试 / 非常规部署）
    try {
        const q = new URLSearchParams(location.search || '').get('api');
        const fromQuery = normalize(q);
        if (fromQuery) {
            return { apiBaseUrl: '', managementApiUrl: fromQuery };
        }
    } catch (e) { /* ignore */ }

    if (typeof window !== 'undefined') {
        const fromWindow = normalize(window.__TFHERS_API__);
        if (fromWindow) {
            return { apiBaseUrl: '', managementApiUrl: fromWindow };
        }
    }

    try {
        const meta = typeof document !== 'undefined'
            ? document.querySelector('meta[name="tfhers-api"]')
            : null;
        const fromMeta = normalize(meta && meta.content);
        if (fromMeta) {
            return { apiBaseUrl: '', managementApiUrl: fromMeta };
        }
    } catch (e) { /* ignore */ }

    // 2) 本机开发：直连管理端 8081；生产：同源（Nginx）
    const host = location.hostname || '';
    const isLocal = host === 'localhost' || host === '127.0.0.1'
        || host === '[::1]' || host === '::1';
    // 用当前 hostname，避免 localhost 与 127.0.0.1 混用
    const localMgmt = isLocal
        ? ((location.protocol === 'https:' ? 'https' : 'http') + '://' + host + ':8081')
        : '';

    return {
        apiBaseUrl: '',
        managementApiUrl: localMgmt
    };
}

const __apiUrls = resolveApiBaseUrls();

const AppState = {
    currentPage: 'news',
    isLoggedIn: false,
    user: null,
    characters: [],
    articles: [],
    // 本地自动 → :8081；生产空串 → Nginx 同源 /api/
    apiBaseUrl: __apiUrls.apiBaseUrl,
    managementApiUrl: __apiUrls.managementApiUrl,

    /** 已废弃：Steam 数据改为仅手动刷新，不再定时轮询 */
    steamPlaytimeIntervalId: null,
    myStats: {
        articleCount: 0,
        comboCount: 0
    },
    hotNewsTimerId: null,
    hotNewsIndex: 0,
    modalBodyScrollLocked: false,
    modalBodyScrollPrevOverflow: ''
};

// 角色静态数据已废弃，改为从管理端 API 加载真实角色和教程数据

// 模拟文章数据已删除 - 现在只从API获取真实数据

// DOM元素引用
const elements = {
    navMenu: document.getElementById('navMenu'),
    navToggle: document.getElementById('sidebarToggle'),
    sidebarToggleMobile: document.getElementById('sidebarToggleMobile'),
    sidebarFloatToggle: document.getElementById('sidebarFloatToggle'),
    sidebarBackdrop: document.getElementById('sidebarBackdrop'),
    navLinks: document.querySelectorAll('#navMenu .nav-link'),
    pages: document.querySelectorAll('.page'),
    articlesGrid: document.getElementById('articlesGrid'),
    charactersGrid: document.getElementById('charactersGrid'),
    loginSection: document.getElementById('loginSection'),
    userSection: document.getElementById('userSection'),
    loginModal: document.getElementById('loginModal'),
    registerModal: document.getElementById('registerModal'),
    characterModal: document.getElementById('characterModal'),
    articleModal: document.getElementById('articleModal'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    createArticleModal: document.getElementById('createArticleModal'),
    createArticleForm: document.getElementById('createArticleForm')
};

// 初始化应用
async function initApp() {
    setupEventListeners();
    checkLoginStatus();
    applyAuthEntryGate();

    // 未登录：只展示入口页，不加载资讯/教程等内容
    if (!AppState.isLoggedIn) {
        return;
    }

    AppState._contentBootstrapped = true;
    // 首次进入主页才用全局 loading；后续页面切换由各自逻辑处理
    await loadCharacters({ silent: true });
    await loadArticles({ silent: true });
    renderArticles(AppState.articles);
    renderCharacters(AppState.characters);
    const initialPage = getPageIdFromRouting();
    showPage(initialPage);
    normalizeIndexTabInUrl(initialPage);
}

// 设置事件监听器
function setupEventListeners() {
    initAppTopActions();
    // 导航切换
    initSidebarPreference();
    if (elements.navToggle) {
        elements.navToggle.addEventListener('click', onSidebarToggleClick);
    }
    if (elements.sidebarToggleMobile) {
        elements.sidebarToggleMobile.addEventListener('click', onSidebarToggleClick);
    }
    if (elements.sidebarFloatToggle) {
        elements.sidebarFloatToggle.addEventListener('click', onSidebarToggleClick);
    }
    if (elements.sidebarBackdrop) {
        elements.sidebarBackdrop.addEventListener('click', closeNavMenu);
    }
    window.addEventListener('resize', function () {
        /* sidebar-resize */
        if (!isMobileSidebar()) {
            closeNavMenu();
        }
    });
    
    // 导航链接点击（均带 data-page，单页内切换）
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const page = link.dataset.page;
            if (!page) {
                closeNavMenu();
                return;
            }
            e.preventDefault();
            showPage(page);
            const path = location.pathname || '/';
            const params = new URLSearchParams(location.search || '');
            params.delete('tab');
            const q = params.toString();
            history.replaceState(null, '', (q ? path + '?' + q : path) + '#' + page);
            closeNavMenu();
        });
    });

    window.addEventListener('hashchange', () => {
        const page = getPageIdFromRouting();
        showPage(page);
        normalizeIndexTabInUrl(page);
    });
    // 从 AI 助手等页返回时：bfcache 可能不重新跑 initApp；部分环境下 hash 与 DOM 不一致。每次 pageshow 按 URL 再同步一次。
    window.addEventListener('pageshow', () => {
        const page = getPageIdFromRouting();
        showPage(page);
        normalizeIndexTabInUrl(page);
    });

    const articleSearchInput = document.getElementById('articleSearchInput');
    const articleSearchClear = document.getElementById('articleSearchClear');
    if (articleSearchInput) {
        articleSearchInput.addEventListener('input', () => {
            applyArticleGridSearchFilter(AppState.articles);
        });
        articleSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                articleSearchInput.value = '';
                applyArticleGridSearchFilter(AppState.articles);
            }
        });
    }
    if (articleSearchClear && articleSearchInput) {
        articleSearchClear.addEventListener('click', () => {
            articleSearchInput.value = '';
            articleSearchInput.focus();
            applyArticleGridSearchFilter(AppState.articles);
        });
    }

    // 登录表单
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // 注册表单
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    const createComboCharacterSelect = document.getElementById('createComboCharacterSelect');
    if (createComboCharacterSelect) {
        createComboCharacterSelect.addEventListener('change', (e) => {
            const hidden = document.getElementById('createComboCharacterId');
            if (hidden) hidden.value = e.target.value || '';
        });
    }


    // 用户发布资讯正文插图
    const insertUserArticleImageBtn = document.getElementById('insertUserArticleImageBtn');
    const userArticleContentImageInput = document.getElementById('userArticleContentImageInput');
    if (insertUserArticleImageBtn && userArticleContentImageInput) {
        insertUserArticleImageBtn.addEventListener('click', () => {
            if (!AppState.isLoggedIn) {
                showLoginRequiredHint();
                return;
            }
            userArticleContentImageInput.click();
        });
        userArticleContentImageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await uploadUserContentImageAndInsert(file, 'createArticleContent');
            }
        });
    }

    // 用户发布资讯封面上传
    const userArticleCoverBtn = document.getElementById('userArticleCoverBtn');
    const userArticleCoverImage = document.getElementById('userArticleCoverImage');
    const userArticleCoverPreview = document.getElementById('userArticleCoverPreview');
    const userArticleCoverPreviewImg = document.getElementById('userArticleCoverPreviewImg');
    const userArticleCoverRemove = document.getElementById('userArticleCoverRemove');
    if (userArticleCoverBtn && userArticleCoverImage) {
        userArticleCoverBtn.addEventListener('click', () => userArticleCoverImage.click());
        userArticleCoverImage.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await uploadUserArticleCoverAndPreview(file);
            }
            e.target.value = '';
        });
    }
    if (userArticleCoverRemove) {
        userArticleCoverRemove.addEventListener('click', () => {
            document.getElementById('userArticleCoverUrl').value = '';
            if (userArticleCoverPreview) userArticleCoverPreview.style.display = 'none';
            if (userArticleCoverPreviewImg) userArticleCoverPreviewImg.src = '';
            if (userArticleCoverImage) userArticleCoverImage.value = '';
        });
    }

    // 发布连段：连段文件、连段视频上传
    const createComboFileBtn = document.getElementById('createComboFileBtn');
    const createComboFileInput = document.getElementById('createComboFileInput');
    const createComboVideoBtn = document.getElementById('createComboVideoBtn');
    const createComboVideoInput = document.getElementById('createComboVideoInput');
    if (createComboFileBtn && createComboFileInput) {
        createComboFileBtn.addEventListener('click', () => createComboFileInput.click());
        createComboFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                if (!file.name.toLowerCase().endsWith('.tfhc')) {
                    alert('仅支持 .tfhc 连段文件');
                    e.target.value = '';
                    return;
                }
                await uploadComboFileAndSet(file, 'createComboFileUrl', 'createComboFileName');
            }
            e.target.value = '';
        });
    }
    if (createComboVideoBtn && createComboVideoInput) {
        createComboVideoBtn.addEventListener('click', () => createComboVideoInput.click());
        createComboVideoInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) await uploadComboVideoAndSet(file, 'createComboVideoUrl', 'createComboVideoName');
            e.target.value = '';
        });
    }
    
    // 模态框：不响应点击遮罩关闭；Esc 关闭其它弹窗，但不关闭个人设置/头像裁剪（仅按钮关闭）
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const cropModal = document.getElementById('avatarCropModal');
            const settingsModal = document.getElementById('profileSettingsModal');
            const cropOpen = cropModal && (cropModal.classList.contains('show') || cropModal.style.display === 'block');
            const settingsOpen = settingsModal && (settingsModal.classList.contains('show') || settingsModal.style.display === 'block');
            if (cropOpen || settingsOpen) return;
            closeAllModals();
        }
    });
}

// 切换导航菜单
function isMobileSidebar() {
    try {
        return window.matchMedia('(max-width: 768px)').matches;
    } catch (e) {
        return window.innerWidth <= 768;
    }
}

function initSidebarPreference() {
    try {
        if (localStorage.getItem('tfhers_sidebar_collapsed') === '1') {
            document.documentElement.classList.add('sidebar-collapsed');
            document.body.classList.add('sidebar-collapsed');
        }
    } catch (e) { /* ignore */ }
    updateSidebarChrome();
}

function updateSidebarChrome() {
    const collapsed = document.documentElement.classList.contains('sidebar-collapsed');
    const open = document.documentElement.classList.contains('sidebar-open');
    const floatBtn = elements.sidebarFloatToggle;
    if (floatBtn) {
        floatBtn.setAttribute('aria-label', collapsed ? 'expand sidebar' : 'collapse sidebar');
        floatBtn.title = collapsed ? 'expand' : 'collapse';
    }
    const inBtn = elements.navToggle;
    if (inBtn) {
        inBtn.setAttribute('aria-label', 'collapse sidebar');
        inBtn.title = 'collapse';
    }
    /* unused but keeps lint quiet */
    void open;
}

function onSidebarToggleClick(e) {
    if (e) {
        try { e.preventDefault(); } catch (err) { /* ignore */ }
    }
    if (isMobileSidebar()) {
        const open = !document.documentElement.classList.contains('sidebar-open');
        document.documentElement.classList.toggle('sidebar-open', open);
        document.body.classList.toggle('sidebar-open', open);
        const bd = elements.sidebarBackdrop;
        if (bd) {
            bd.hidden = !open;
            bd.setAttribute('aria-hidden', open ? 'false' : 'true');
        }
        return;
    }
    const collapsed = !document.documentElement.classList.contains('sidebar-collapsed');
    document.documentElement.classList.toggle('sidebar-collapsed', collapsed);
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    try {
        localStorage.setItem('tfhers_sidebar_collapsed', collapsed ? '1' : '0');
    } catch (err) { /* ignore */ }
    updateSidebarChrome();
}

function toggleNavMenu() {
    onSidebarToggleClick();
}

function closeNavMenu() {
    document.documentElement.classList.remove('sidebar-open');
    document.body.classList.remove('sidebar-open');
    const bd = elements.sidebarBackdrop;
    if (bd) {
        bd.hidden = true;
        bd.setAttribute('aria-hidden', 'true');
    }
    if (elements.navMenu) elements.navMenu.classList.remove('active');
    if (elements.navToggle) elements.navToggle.classList.remove('active');
}


/** 与导航锚点一致：#news、#characters、#tournaments、#profile、#ai-chat；非法或空则默认资讯 */
function getPageIdFromHash() {
    const raw = (location.hash || '').replace(/^#/, '').trim();
    if (raw === 'my') return 'profile';
    if (raw === 'news' || raw === 'characters' || raw === 'tournaments' || raw === 'lobby' || raw === 'rankings' || raw === 'ai-chat' || raw === 'data' || raw === 'settings' || raw === 'profile' || raw === 'manuscripts') return raw;
    return 'news';
}

/**
 * 优先读 ?tab=（随请求传到服务端，从外链进入更稳），再读 hash。
 * AI 助手页跳转首页时使用 ?tab=，避免仅靠 # 时在缓存/恢复场景下落到默认资讯。
 */
function getPageIdFromRouting() {
    try {
        const params = new URLSearchParams(location.search || '');
        const tab = (params.get('tab') || '').trim();
        if (tab === 'my') return 'profile';
        if (tab === 'news' || tab === 'characters' || tab === 'tournaments' || tab === 'lobby' || tab === 'rankings' || tab === 'ai-chat' || tab === 'data' || tab === 'settings' || tab === 'profile' || tab === 'manuscripts') return tab;
    } catch (e) { /* ignore */ }
    return getPageIdFromHash();
}

/** 去掉 ?tab=，把地址规范成 path#板块，避免与 hash 双轨冲突 */
function normalizeIndexTabInUrl(pageId) {
    if (pageId !== 'news' && pageId !== 'characters' && pageId !== 'tournaments' && pageId !== 'lobby' && pageId !== 'rankings' && pageId !== 'ai-chat' && pageId !== 'data' && pageId !== 'settings' && pageId !== 'profile' && pageId !== 'manuscripts') return;
    try {
        const params = new URLSearchParams(location.search || '');
        if (!params.has('tab')) return;
        params.delete('tab');
        const q = params.toString();
        const path = location.pathname || '/';
        history.replaceState(null, '', (q ? path + '?' + q : path) + '#' + pageId);
    } catch (e) { /* ignore */ }
}

// 显示页面
function showPage(pageId) {
    if (pageId !== 'ai-chat') {
        document.body.classList.remove('ai-chat-page');
        document.body.classList.remove('ai-chat-page--gated');
        const aiGate = document.getElementById('aiChatLoginGate');
        if (aiGate) {
            aiGate.hidden = true;
            aiGate.classList.remove('is-visible');
            aiGate.setAttribute('aria-hidden', 'true');
        }
    }

    if (pageId === 'lobby') {
        document.body.classList.add('lobby-page');
    } else {
        document.body.classList.remove('lobby-page');
        document.body.classList.remove('rooms-page--gated');
        const roomsGate = document.getElementById('roomsLoginGate');
        if (roomsGate) {
            roomsGate.hidden = true;
            roomsGate.classList.remove('is-visible');
            roomsGate.setAttribute('aria-hidden', 'true');
        }
    }

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
        link.classList.remove('active');
        if (link.dataset.page === pageId) {
            link.classList.add('active');
        }
    });
    
    // 根据页面加载相应内容
    switch (pageId) {
        case 'news':
            loadNewsContent();
            break;
        case 'characters':
            loadCharactersContent();
            break;
        case 'tournaments':
            if (typeof loadTournamentsContent === 'function') loadTournamentsContent();
            break;
        case 'lobby':
            if (typeof loadLobbyContent === 'function') loadLobbyContent();
            break;
        case 'rankings':
            if (typeof loadRankingsContent === 'function') loadRankingsContent();
            break;
        case 'my':
            // 「我的」已移除，跳转个人信息页
            showPage('profile');
            return;
        case 'profile':
            if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
                showAppToast('请先登录', 'error');
                showLoginModal();
                showPage('news');
                break;
            }
            if (typeof fillProfilePage === 'function') fillProfilePage();
            if (typeof refreshProfilePageFromServer === 'function') refreshProfilePageFromServer();
            if (typeof initProfileHomeTabs === 'function') initProfileHomeTabs();
            if (typeof loadMyPublishedContent === 'function') loadMyPublishedContent();
            break;
        case 'settings':
            if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
                showAppToast('请先登录', 'error');
                showLoginModal();
                showPage('news');
                break;
            }
            fillProfileSettingsForm(AppState.user);
            if (typeof loadNotifyPrefsIntoForm === 'function') loadNotifyPrefsIntoForm();
            if (typeof loadThemePrefsIntoForm === 'function') loadThemePrefsIntoForm();
            if (typeof refreshSettingsBindPanel === 'function') refreshSettingsBindPanel();
            if (typeof refreshProfileIntoSettings === 'function') refreshProfileIntoSettings();
            break;
        case 'manuscripts':
            if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
                showAppToast('请先登录', 'error');
                showLoginModal();
                showPage('news');
                break;
            }
            if (typeof initManuscriptsTabs === 'function') initManuscriptsTabs();
            if (typeof loadMyPublishedContent === 'function') loadMyPublishedContent();
            break;
        case 'data':
            if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
                showAppToast('请先登录', 'error');
                showLoginModal();
                showPage('news');
                break;
            }
            if (typeof updateMyStatsPanel === 'function') updateMyStatsPanel();
            if (AppState.user && AppState.user.steamId) {
                if (typeof refreshSteamPlaytime === 'function') refreshSteamPlaytime(false);
                if (typeof loadSteamAchievements === 'function') loadSteamAchievements(false);
            }
            break;
        case 'ai-chat':
            document.body.classList.add('ai-chat-page');
            if (typeof window.mountAiChatPanel === 'function') {
                window.mountAiChatPanel();
            }
            break;
    }
}

// 加载资讯内容
async function loadNewsContent() {
    // 如果文章数据为空，重新加载
    if (AppState.articles.length === 0) {
        await loadArticles();
    }
    // 重新渲染文章列表
    renderArticles(AppState.articles);
}

// 加载角色内容（始终按 AppState 重绘，避免曾误画「暂无角色」占位后 children 非空而跳过重绘）
function loadCharactersContent() {
    if (!elements.charactersGrid) return;
    renderCharacters(AppState.characters);
}

// 加载用户内容（从服务端同步 Steam 等字段，仅读库不写 Steam）
async function loadUserContent() {
    if (!AppState.isLoggedIn || !AppState.user) return;
    await syncUserSteamFromServer();
    refreshMyArticleStats();
    refreshMyComboStats();
    updateMyStatsPanel();
}

// 加载角色数据（从管理端 /api/characters）；options.silent 为 true 时不使用全屏 loading（用于首屏 init）
async function loadCharacters(options = {}) {
    const silent = options.silent === true;
    try {
        console.log('开始加载角色数据，API地址:', `${AppState.managementApiUrl}/api/characters`);
        if (!silent) showLoading();

        const response = await fetch(`${AppState.managementApiUrl}/api/characters`);
        console.log('角色API响应状态:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }

        const result = await response.json();
        console.log('角色API返回数据:', result);

        if (result.code === 200 && result.data) {
            AppState.characters = result.data;
        } else {
            console.warn('获取角色数据失败，API返回:', result);
            AppState.characters = [];
        }
    } catch (error) {
        console.error('获取角色数据时发生错误:', error);
        AppState.characters = [];
    } finally {
        if (!silent) hideLoading();
    }
}

// 加载文章数据；options.silent 为 true 时不使用全屏 loading（用于首屏 init）
async function loadArticles(options = {}) {
    const silent = options.silent === true;
    try {
        console.log('开始加载文章数据，API地址:', `${AppState.apiBaseUrl}/api/articles/all`);
        if (!silent) showLoading();
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // 如果已登录，添加认证头
        if (AppState.isLoggedIn && AppState.user && AppState.user.token) {
            headers['Authorization'] = `Bearer ${AppState.user.token}`;
        }
        
        const response = await fetch(`${AppState.apiBaseUrl}/api/articles/all`, {
            headers: headers
        });
        console.log('API响应状态:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API返回数据:', result);
        
        if (result.code === 200 && result.data) {
            console.log('成功获取文章数据，数量:', result.data.length);
            // 直接使用后端返回的数据，不需要转换
            AppState.articles = result.data;
            console.log('文章数据:', AppState.articles);
            if (AppState.isLoggedIn && AppState.user) {
                refreshMyArticleStats();
            }
        } else {
            console.warn('获取文章数据失败，API返回:', result);
            AppState.articles = [];
            if (AppState.isLoggedIn && AppState.user) {
                refreshMyArticleStats();
            }
        }
    } catch (error) {
        console.error('获取文章数据时发生错误:', error);
        console.error('错误详情:', error.message);
        AppState.articles = [];
        if (AppState.isLoggedIn && AppState.user) {
            refreshMyArticleStats();
        }
    } finally {
        if (!silent) hideLoading();
    }
}

/** 资讯卡片作者头像：空串/无效相对路径时走默认图；非 /images 的站内路径需带管理端域名（OSS 一般为绝对地址） */
function resolveArticleAuthorAvatarUrl(raw) {
    if (raw == null) return '/images/CSel3_LargePortTianhuo.png';
    const s = String(raw).trim();
    if (!s) return '/images/CSel3_LargePortTianhuo.png';
    if (/^https?:\/\//i.test(s) || s.startsWith('data:')) return s;
    if (s.startsWith('/')) {
        if (s.startsWith('/images/')) return s;
        const base = (typeof AppState !== 'undefined' && AppState.managementApiUrl) ? AppState.managementApiUrl.replace(/\/$/, '') : '';
        return base ? (base + s) : s;
    }
    return s;
}

function filterArticlesByQuery(query, source) {
    const list = Array.isArray(source) ? source : AppState.articles;
    const q = (query || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) => {
        const title = String(a && a.title != null ? a.title : '').toLowerCase();
        const sum = String(a && a.summary != null ? a.summary : '').toLowerCase();
        const auth = String(a && a.author != null ? a.author : '').toLowerCase();
        return title.includes(q) || sum.includes(q) || auth.includes(q);
    });
}

function updateArticleSearchClearButton() {
    const input = document.getElementById('articleSearchInput');
    const btn = document.getElementById('articleSearchClear');
    if (!btn) return;
    const show = !!(input && input.value.trim().length > 0);
    btn.style.display = show ? 'flex' : 'none';
}

function applyArticleGridSearchFilter(base) {
    const listSource = Array.isArray(base) ? base : AppState.articles;
    const input = document.getElementById('articleSearchInput');
    const q = input && input.value.trim() ? input.value.trim() : '';
    const list = q ? filterArticlesByQuery(q, listSource) : listSource;
    renderArticleGrid(list, q);
    updateArticleSearchClearButton();
}

/** 网格卡片交错入场（尊重 prefers-reduced-motion） */
function runGridStaggerAnimation(container, itemSelector) {
    if (!container || !itemSelector) return;
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }
    const nodes = container.querySelectorAll(itemSelector);
    nodes.forEach((el, i) => {
        el.classList.remove('u-stagger-in');
        el.style.animationDelay = '';
    });
    requestAnimationFrame(() => {
        nodes.forEach((el, i) => {
            el.style.animationDelay = `${Math.min(i, 16) * 42}ms`;
            el.classList.add('u-stagger-in');
        });
    });
}

function renderArticleGrid(articles, searchQuery) {
    if (!elements.articlesGrid) return;
    const q = (searchQuery || '').trim();
    if (articles.length === 0) {
        elements.articlesGrid.innerHTML = q
            ? `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h3 class="empty-title">未找到相关资讯</h3>
                <p class="empty-desc">试试其他关键词，或点击清除搜索</p>
            </div>`
            : `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-newspaper"></i>
                </div>
                <h3 class="empty-title">暂无文章</h3>
                <p class="empty-desc">还没有发布任何文章</p>
            </div>`;
        return;
    }

    elements.articlesGrid.innerHTML = articles.map(article => {
        const avatarUrl = resolveArticleAuthorAvatarUrl(article.author_avatar_url || article.authorAvatarUrl);
        const authorName = article.author || '匿名';
        const createdRaw = getArticleCreatedAt(article);
        const timeLabel = formatArticlePublishTime(createdRaw);
        const timeAbs = createdRaw ? formatDate(createdRaw) : '';
        const timeHtml = timeLabel
            ? `<time class="article-card-time" datetime="${String(createdRaw).replace(/"/g, '&quot;')}" title="${timeAbs}">${timeLabel}</time>`
            : '';
        return `
        <div class="article-card article-card--glass" onclick="showArticle(${article.id})">
            <div class="article-card-media">
                <img src="${article.cover_url || '/images/default-article.jpg'}" alt="" class="article-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="article-cover-placeholder" style="display: none;">
                    <i class="fas fa-image"></i>
                    <span>暂无图片</span>
                </div>
                <div class="article-card-glass">
                    <div class="article-card-author">
                        <img src="${avatarUrl}" alt="" class="article-author-avatar" width="40" height="40" loading="lazy" onerror="this.onerror=null;this.src='/images/CSel3_LargePortTianhuo.png'">
                        <div class="article-card-author-meta">
                            <span class="article-author-name">${authorName}</span>
                            ${timeHtml}
                        </div>
                    </div>
                    <h3 class="article-title article-card-title">${article.title}</h3>
                    <p class="article-excerpt article-card-summary">${article.summary || '暂无摘要'}</p>
                </div>
            </div>
        </div>`;
    }).join('');
    runGridStaggerAnimation(elements.articlesGrid, '.article-card');
}

function articleIsPinned(a) {
    if (!a) return false;
    const v = a.is_pinned != null ? a.is_pinned : a.isPinned;
    return v === 1 || v === true || v === '1';
}

// 渲染文章列表（热门轮播始终用全量 AppState.articles；下方网格支持搜索过滤）
function renderArticles(articlesForGrid) {
    if (!elements.articlesGrid) return;
    const base = Array.isArray(articlesForGrid) ? articlesForGrid : AppState.articles;
    renderHotNews(AppState.articles);
    renderPinnedNews(AppState.articles);
    applyArticleGridSearchFilter(base);
}

function renderPinnedNews(articles) {
    const el = document.getElementById('pinnedNewsList');
    if (!el) return;
    const list = (Array.isArray(articles) ? articles : [])
        .filter(articleIsPinned)
        .slice()
        .sort((a, b) => {
            const ta = Date.parse(a.created_at || a.createdAt || 0) || 0;
            const tb = Date.parse(b.created_at || b.createdAt || 0) || 0;
            return tb - ta;
        })
        .slice(0, 3);
    const esc = (v) => String(v == null ? '' : v).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (list.length === 0) {
        el.innerHTML = '<div class="pinned-news-empty">暂无置顶内容<br><span style="font-size:0.82em;opacity:0.85">管理员可在后台将资讯设为置顶（最多展示 3 条）</span></div>';
        return;
    }
    el.innerHTML = list.map((a) => {
        const title = esc(a.title || '未命名');
        const author = esc(a.author || '匿名');
        const cover = a.cover_url || a.coverUrl || '/images/default-article.jpg';
        const timeLabel = formatArticlePublishTime(getArticleCreatedAt(a));
        const metaLine = timeLabel ? `${author} · ${timeLabel}` : author;
        return `<div class="pinned-news-item" role="button" tabindex="0" onclick="showArticle(${a.id})">
            <img class="pinned-news-thumb" src="${cover}" alt="" loading="lazy" onerror="this.src='/images/default-article.jpg'">
            <div class="pinned-news-text">
                <div class="pinned-news-item-title">${title}</div>
                <div class="pinned-news-item-meta">${metaLine}</div>
            </div>
        </div>`;
    }).join('');
}

function renderHotNews(articles) {
    const wrap = document.getElementById('hotNewsWrap');
    const slider = document.getElementById('hotNewsSlider');
    const dots = document.getElementById('hotNewsDots');
    if (!wrap || !slider || !dots) return;

    if (AppState.hotNewsTimerId) {
        clearInterval(AppState.hotNewsTimerId);
        AppState.hotNewsTimerId = null;
    }

    const pinnedIds = new Set(
        (Array.isArray(articles) ? articles : []).filter(articleIsPinned).map((a) => a.id)
    );
    const top = (Array.isArray(articles) ? articles : [])
        .filter((a) => !pinnedIds.has(a.id))
        .slice()
        .sort((a, b) => {
            const va = Number(a && (a.view_count ?? a.viewCount ?? 0)) || 0;
            const vb = Number(b && (b.view_count ?? b.viewCount ?? 0)) || 0;
            return vb - va;
        })
        .slice(0, 3);

    if (top.length === 0) {
        wrap.style.display = 'none';
        slider.innerHTML = '';
        dots.innerHTML = '';
        return;
    }

    // 保持当前索引（避免外部触发 renderHotNews 时把轮播瞬间拉回第 1 页）
    const currentIdx = typeof AppState.hotNewsIndex === 'number' ? AppState.hotNewsIndex : 0;
    const idxToShow = Math.max(0, Math.min(currentIdx, top.length - 1));
    AppState.hotNewsIndex = idxToShow;

    const esc = (v) => String(v == null ? '' : v).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    wrap.style.display = 'flex';
    const prevBtn = document.getElementById('hotNewsPrev');
    const nextBtn = document.getElementById('hotNewsNext');
    if (prevBtn && nextBtn) {
        const multi = top.length > 1;
        prevBtn.style.visibility = multi ? 'visible' : 'hidden';
        nextBtn.style.visibility = multi ? 'visible' : 'hidden';
        prevBtn.disabled = !multi;
        nextBtn.disabled = !multi;
    }
    const slidesHtml = top.map((a, idx) => {
        const avatar = resolveArticleAuthorAvatarUrl(a.author_avatar_url || a.authorAvatarUrl);
        const author = esc(a.author || '匿名');
        const title = esc(a.title || '未命名资讯');
        const cover = a.cover_url || '/images/default-article.jpg';
        const view = Number(a && (a.view_count ?? a.viewCount ?? 0)) || 0;
        const timeLabel = formatArticlePublishTime(getArticleCreatedAt(a));
        const timePart = timeLabel ? ` · ${timeLabel}` : '';
        return `<div class="hot-news-item ${idx === idxToShow ? 'active' : ''}" data-idx="${idx}" role="group" aria-roledescription="slide" aria-label="${idx + 1} / ${top.length}" onclick="showArticle(${a.id})">
            <img src="${cover}" alt="" class="hot-news-cover" onerror="this.src='/images/default-article.jpg'">
            <div class="hot-news-overlay">
                <img src="${avatar}" alt="" class="hot-news-author-avatar" onerror="this.onerror=null;this.src='/images/CSel3_LargePortTianhuo.png'">
                <div class="hot-news-meta">
                    <div class="hot-news-author">${author} · ${view} 阅读${timePart}</div>
                    <div class="hot-news-title">${title}</div>
                </div>
            </div>
        </div>`;
    }).join('');
    slider.innerHTML = slidesHtml;

    dots.innerHTML = top.map((_, idx) =>
        `<button class="hot-news-dot ${idx === idxToShow ? 'active' : ''}" type="button" onclick="setHotNewsIndex(${idx})"></button>`
    ).join('');

    if (top.length > 1) {
        AppState.hotNewsTimerId = setInterval(() => {
            setHotNewsIndex((AppState.hotNewsIndex + 1) % top.length);
        }, 3800);
    }
}

function setHotNewsIndex(nextIndex) {
    const items = Array.from(document.querySelectorAll('.hot-news-item'));
    const dotEls = Array.from(document.querySelectorAll('.hot-news-dot'));
    if (items.length === 0) return;
    const idx = Math.max(0, Math.min(nextIndex, items.length - 1));
    dotEls.forEach((el, i) => el.classList.toggle('active', i === idx));
    AppState.hotNewsIndex = idx;
    items.forEach((el, i) => el.classList.toggle('active', i === idx));
}

function stepHotNews(delta) {
    const items = document.querySelectorAll('.hot-news-item');
    if (!items.length) return;
    const n = items.length;
    setHotNewsIndex((AppState.hotNewsIndex + Number(delta) + n) % n);
}

// 渲染角色列表（从管理端返回的数据）
function renderCharacters(characters) {
    if (!elements.charactersGrid) return;
    
    if (!characters || characters.length === 0) {
        elements.charactersGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-users"></i>
                </div>
                <h3 class="empty-title">暂无角色</h3>
                <p class="empty-desc">管理员端还没有配置角色数据</p>
            </div>
        `;
        return;
    }

    elements.charactersGrid.innerHTML = characters.map(character => `
        <div class="character-card" onclick="showCharacter(${character.id})">
            <div class="character-avatar-container">
                <img src="${character.avatarUrl || '/images/CSel3_LargePortTianhuo.png'}" alt="${character.nameZh || character.nameEn}" class="character-avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="character-avatar-placeholder" style="display: none;">
                    <i class="fas fa-user"></i>
                </div>
            </div>
            <h3 class="character-name">${character.nameZh || character.nameEn}</h3>
        </div>
    `).join('');
    runGridStaggerAnimation(elements.charactersGrid, '.character-card');
}

// 显示角色详情（从管理端 /api/characters/{id} 加载完整教程）
async function showCharacter(characterId) {
    try {
        showLoading();

        const response = await fetch(`${AppState.managementApiUrl}/api/characters/${characterId}`);
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }

        const result = await response.json();
        if (result.code !== 200 || !result.data) {
            alert(result.msg || '获取角色详情失败');
            return;
        }

        const data = result.data;
        const character = data.character;
        const moves = data.moves || [];
        const userCombos = data.userCombos || [];

        const characterContent = document.getElementById('characterContent');
        // 顶部标题已隐藏，角色名仅在第一张卡片中展示

        if (characterContent) {
            const movesListHtml = moves.length === 0 && !character.moveListImageUrl
                ? '<p class="moves-empty">暂无招式数据</p>'
                : moves.map(move => `
                                <div class="move-item">
                                    <h4 class="move-name">${move.nameZh || move.nameEn || '未命名招式'}</h4>
                                    <p class="move-input">${move.inputCommand || ''}</p>
                                    <p class="move-desc">${move.description || ''}</p>
                                </div>
                            `).join('');

            const escHtml = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const escAttr = (v) => escHtml(v).replace(/"/g, '&quot;');
            const userCombosListHtml = userCombos.length === 0
                ? '<p class="character-combos-empty">暂无玩家连段</p>'
                : userCombos.map((combo) => {
                    const videoUrl = combo.video_url || combo.videoUrl || '';
                    const fileUrl = combo.comboFileUrl || combo.combo_file_url || '';
                    const authorName = combo.authorName || combo.author_name || '玩家';
                    const authorAvatar = combo.authorAvatar || combo.author_avatar || '/images/CSel3_LargePortTianhuo.png';
                    const damageVal = combo.damageTotal ?? combo.damage_total;
                    const titleText = combo.title || '未命名连段';
                    const headline = `${damageVal != null ? `${damageVal}伤-` : ''}${titleText}`;
                    let tfhcDownloadName = 'combo.tfhc';
                    if (titleText && String(titleText).trim()) {
                        tfhcDownloadName = String(titleText).replace(/[/\\\\?%*:|"<>]/g, '_').trim().slice(0, 80) + '.tfhc';
                    }
                    return `
                                <div class="combo-item user-combo-item">
                                    <div class="user-combo-main">
                                        <div class="user-combo-author">
                                        <div class="user-combo-avatar-wrap">
                                            <img src="${authorAvatar}" alt="" class="user-combo-avatar" onerror="this.onerror=null;this.src='/images/CSel3_LargePortTianhuo.png'">
                                        </div>
                                            <span class="user-combo-author-name">${escHtml(authorName)}</span>
                                        </div>
                                        <div class="user-combo-headline">${escHtml(headline)}</div>
                                    </div>
                                    <div class="user-combo-actions-row">
                                        ${fileUrl ? `
                                        <a href="${fileUrl}" class="user-combo-download-link" target="_blank" rel="noopener noreferrer" download="${tfhcDownloadName.replace(/"/g, '')}">
                                            <i class="fas fa-download"></i> 下载连段文件
                                        </a>
                                        ` : '<span class="user-combo-download-link user-combo-download-link--disabled">暂无连段文件</span>'}
                                        ${videoUrl ? `
                                        <button type="button" class="user-combo-watch-btn user-combo-text-action" data-video-url="${escAttr(videoUrl)}" data-video-title="${escAttr(titleText)}">
                                            <i class="fas fa-play"></i> 观看视频
                                        </button>
                                        ` : '<span class="user-combo-watch-btn user-combo-watch-btn--disabled">暂无视频</span>'}
                                    </div>
                                </div>
                            `;
                }).join('');
            characterContent.innerHTML = `
                <div class="character-detail character-detail--tutorial-dark">
                    <div class="character-tutorial-layout">
                        <div class="character-tutorial-pane character-tutorial-pane--left" aria-label="角色信息、背景故事与出招表">
                            <div class="character-tutorial-main">
                                <div class="character-dark-card character-card-bio">
                                    <div class="character-bio-row">
                                        <div class="character-bio-avatar">
                                            <img src="${character.avatarUrl || '/images/CSel3_LargePortTianhuo.png'}" alt="${character.nameZh || character.nameEn}" onerror="this.style.opacity='0.3';">
                                        </div>
                                        <div class="character-bio-meta">
                                            <div class="character-name-zh">${character.nameZh || '—'}</div>
                                            <div class="character-name-en">${character.nameEn || ''}</div>
                                            <p class="character-difficulty-line">${character.difficultyLevel != null ? `难度：${character.difficultyLevel}/5` : '难度：—'}</p>
                                        </div>
                                        <div class="character-bio-intro">
                                            <p>${character.intro || '暂无介绍'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div class="character-dark-card">
                                    <h3 class="dark-card-title">背景故事</h3>
                                    <p class="dark-card-body">${character.background || '暂无背景故事'}</p>
                                </div>
                            </div>

                            <div class="character-moves-sidebar character-dark-card" aria-label="出招表">
                                <h3 class="dark-card-title">出招表</h3>
                                ${character.moveListImageUrl ? `
                                <div class="move-list-image-wrap">
                                    <img src="${character.moveListImageUrl}" alt="出招表" class="move-list-image">
                                </div>
                                ` : ''}
                                <div class="moves-list">
                                    ${movesListHtml}
                                </div>
                            </div>
                        </div>

                        <aside class="character-tutorial-pane character-tutorial-pane--right character-combos-pane" aria-label="玩家连段">
                            <h3 class="moves-sidebar-title">玩家连段</h3>
                            <div class="combo-list user-combo-list">
                                ${userCombosListHtml}
                            </div>
                        </aside>
                    </div>
                </div>
            `;
        }
        if (characterContent) {
            characterContent.querySelectorAll('.user-combo-watch-btn[data-video-url]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const videoUrl = btn.getAttribute('data-video-url') || '';
                    const videoTitle = btn.getAttribute('data-video-title') || '连段视频';
                    if (!videoUrl) return;
                    openComboVideoPlayer(videoUrl, videoTitle);
                });
            });
        }

        elements.characterModal.setAttribute('data-current-character-id', character.id);
        elements.characterModal.style.display = 'block';
    } catch (error) {
        console.error('获取角色详情时发生错误:', error);
        alert('获取角色详情失败，请稍后重试');
    } finally {
        hideLoading();
    }
}

function openComboVideoPlayer(videoUrl, title) {
    const escAttr = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const safeTitle = String(title || '连段视频').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const modal = document.getElementById('comboModal');
    const titleEl = document.getElementById('comboTitle');
    const contentEl = document.getElementById('comboContent');
    if (!modal || !titleEl || !contentEl || !videoUrl) return;
    titleEl.textContent = safeTitle;
    contentEl.innerHTML = `
        <div class="combo-video-player-wrap">
            <video class="combo-video-player" src="${escAttr(videoUrl)}" controls autoplay preload="metadata" playsinline></video>
        </div>
    `;
    modal.style.display = 'block';
}

/** 简单字符串哈希，用于同一文章内稳定的「伪随机」跨度 */
function strHash(str) {
    let h = 5381;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) + h) ^ s.charCodeAt(i);
    }
    return h >>> 0;
}

function isArticleMediaOnlyBlock(el) {
    if (!el || el.nodeType !== 1) return false;
    const t = el.tagName;
    if (t === 'IMG' || t === 'VIDEO') return true;
    if (t === 'FIGURE') return !!(el.querySelector('img, video'));
    if (t === 'P') {
        const text = el.textContent.replace(/\s/g, '');
        if (text !== '') return false;
        const kids = el.children;
        if (kids.length !== 1) return false;
        const c = kids[0];
        return c.tagName === 'IMG' || c.tagName === 'VIDEO' || c.tagName === 'FIGURE';
    }
    return false;
}

function extractArticleMediaNode(node) {
    if (node.tagName === 'IMG' || node.tagName === 'VIDEO') return node;
    if (node.tagName === 'FIGURE') return node;
    if (node.tagName === 'P') {
        const fig = node.querySelector('figure');
        if (fig) {
            fig.remove();
            node.remove();
            return fig;
        }
        const m = node.querySelector('img, video');
        if (m) {
            m.remove();
            node.remove();
            return m;
        }
    }
    return null;
}

function mergeArticleMediaMasonryGroup(container, nodes, articleId, seedBase) {
    const wrap = document.createElement('div');
    wrap.className = 'article-image-masonry';
    wrap.setAttribute('aria-label', '正文图片组');
    container.insertBefore(wrap, nodes[0]);
    nodes.forEach((node) => {
        const placed = extractArticleMediaNode(node);
        if (placed) wrap.appendChild(placed);
    });
    Array.from(wrap.children).forEach((cell, idx) => {
        const h = strHash(`${articleId}:${idx}:${seedBase}`);
        const colSpan = 3 + (h % 4);
        const rowSpan = 1 + ((h >>> 3) % 2);
        cell.style.gridColumn = `span ${colSpan}`;
        cell.style.gridRow = `span ${rowSpan}`;
    });
}

/**
 * 正文中「连续 2 张及以上」的独立图片/视频块合并为网格，用 dense 流 + 伪随机跨度填满行；
 * 单张仍走原有 CSS 自适应。仅处理 .article-detail-content 内直接子节点。
 */
function layoutArticleContentImages(rootArticleContentEl, articleId) {
    const container = rootArticleContentEl && rootArticleContentEl.querySelector('.article-detail-content');
    if (!container) return;
    const seedBase = strHash(String(articleId));
    for (let guard = 0; guard < 40; guard++) {
        const ch = Array.from(container.children);
        let from = -1;
        let found = null;
        for (let i = 0; i <= ch.length; i++) {
            const atEnd = i === ch.length;
            const isMedia = !atEnd && isArticleMediaOnlyBlock(ch[i]);
            if (isMedia) {
                if (from < 0) from = i;
            } else {
                if (from >= 0 && i - from >= 2) {
                    found = { from, to: i };
                    break;
                }
                from = -1;
            }
        }
        if (!found) break;
        const slice = ch.slice(found.from, found.to);
        mergeArticleMediaMasonryGroup(container, slice, articleId, seedBase);
    }
}

// 显示文章详情（含点赞、评论）

/**
 * 资讯正文：textarea 存的是纯文本换行 + 可选 <img>。
 * 直接 innerHTML 时换行会被浏览器折叠，这里转义文本并把 \n 变成 <br>，保留 img。
 */
function formatArticleContentHtml(rawContent) {
    const raw = rawContent == null ? '' : String(rawContent);
    if (!raw.trim()) return '<p>暂无内容</p>';
    const escHtml = (v) => String(v == null ? '' : v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    // 只放行内容区插入的 <img ...>；其余当文本处理（含换行）
    const parts = raw.split(/(<img\b[^>]*\/?>)/gi);
    return parts.map((part) => {
        if (/^<img\b/i.test(part)) return part;
        return escHtml(part).replace(/\r\n|\r|\n/g, '<br>');
    }).join('');
}
async function showArticle(articleId) {
    try {
        showLoading();
        const headers = { 'Content-Type': 'application/json' };
        if (AppState.isLoggedIn && AppState.user && AppState.user.token) {
            headers['Authorization'] = `Bearer ${AppState.user.token}`;
        }
        const response = await fetch(`${AppState.apiBaseUrl}/api/articles/${articleId}`, { headers });
        const result = await response.json();
        if (result.code !== 200 || !result.data) {
            alert('获取文章失败');
            return;
        }
        const data = result.data;
        const article = data.article || data;
        const likeCount = data.likeCount != null ? data.likeCount : 0;
        const liked = data.liked === true;

        const articleContent = document.getElementById('articleContent');
        const articleTitle = document.getElementById('articleTitle');
        if (articleTitle) articleTitle.textContent = article.title;

        elements.articleModal.setAttribute('data-article-id', articleId);

        const likeBtnClass = liked ? 'article-like-btn liked' : 'article-like-btn';
        const likeIcon = liked ? 'fas fa-heart' : 'far fa-heart';
        if (articleContent) {
            const escHtml = (v) => String(v == null ? '' : v)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            const coverUrl = article.cover_url || article.coverUrl || '/images/default-article.jpg';
            const authorAvatarUrl = article.author_avatar_url || article.authorAvatarUrl || '/images/CSel3_LargePortTianhuo.png';
            const authorName = article.author || '匿名';
            const createdRaw = getArticleCreatedAt(article);
            const timeLabel = formatArticlePublishTime(createdRaw);
            const timeAbs = createdRaw ? formatDate(createdRaw) : '';
            const timeMetaHtml = timeLabel
                ? `<div class="article-detail-time" title="${escHtml(timeAbs)}"><i class="far fa-clock"></i> ${escHtml(timeLabel)}</div>`
                : '';
            const summaryText = article.summary || article.excerpt || '暂无摘要';
            const contentHtml = formatArticleContentHtml(article.content);
            articleContent.innerHTML = `
                <div class="article-modal-split">
                    <aside class="article-modal-pane article-modal-pane--comments" aria-label="评论">
                        <div class="article-comments-section article-comments-section--pane">
                            <h4 class="comments-title">评论</h4>
                            <div class="article-comment-editor">
                                <textarea
                                    id="articleCommentContent"
                                    class="article-comment-textarea"
                                    placeholder="${AppState.isLoggedIn ? '写下你的评论…' : '登录后即可评论'}"
                                ></textarea>
                                <div id="articleCommentReplyHint" class="article-comment-reply-hint" style="display:none;">
                                    <span>回复 <span class="reply-hint-name"></span></span>
                                    <button type="button" class="link-btn" id="articleCommentReplyCancelBtn">取消</button>
                                </div>
                                <input type="hidden" id="articleCommentParentId" value="">
                                <input type="file" id="articleCommentImageInput" accept="image/*" class="article-comment-image-input">
                                <div class="article-comment-actions">
                                    <label for="articleCommentImageInput" class="article-comment-image-btn" title="上传图片">
                                        <i class="fas fa-image"></i>
                                    </label>
                                    <button type="button" class="btn btn-primary btn-sm article-comment-submit-btn" id="submitArticleCommentBtn">发布</button>
                                </div>
                            </div>
                            <div id="articleCommentList" class="comment-list"></div>
                        </div>
                    </aside>
                    <div class="article-modal-pane article-modal-pane--article" aria-label="资讯正文">
                        <div class="article-detail">
                            <div class="article-detail-cover-wrap">
                                <div class="article-detail-cover-bg" style="background-image:url('${String(coverUrl).replace(/'/g, "%27")}')" aria-hidden="true"></div>
                                <img src="${coverUrl}" alt="${escHtml(article.title)}" class="article-detail-cover-img" onerror="this.src='/images/default-article.jpg'">
                                <div class="article-detail-glassbar">
                                    <div class="article-detail-author">
                                        <img src="${authorAvatarUrl}" alt="" class="article-detail-author-avatar" onerror="this.onerror=null;this.src='/images/CSel3_LargePortTianhuo.png'">
                                        <div class="article-detail-author-text">
                                            <div class="article-detail-author-name">${escHtml(authorName)}</div>
                                            ${timeMetaHtml}
                                        </div>
                                    </div>
                                    <div class="article-detail-title-wrap">
                                        <h2 class="article-detail-title-right">${escHtml(article.title)}</h2>
                                    </div>
                                </div>
                            </div>
                            <div class="article-detail-summary">${escHtml(summaryText)}</div>
                            <div class="article-detail-content">${contentHtml}</div>
                            <div class="article-actions">
                                <button type="button" class="${likeBtnClass}" id="articleLikeBtn" data-liked="${liked}" data-count="${likeCount}">
                                    <i class="${likeIcon}"></i> <span class="like-count">${likeCount}</span> 点赞
                                </button>
                                <button type="button" class="btn btn-outline btn-sm" id="articleReportBtn" style="margin-left:10px;">
                                    举报
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            layoutArticleContentImages(articleContent, articleId);
        }

        lockBodyScroll();
        elements.articleModal.style.display = 'block';

        // 头部小按钮（点赞/举报）
        const headerLikeBtn = document.getElementById('articleHeaderLikeBtn');
        const headerLikeCount = document.getElementById('articleHeaderLikeCount');
        const headerReportBtn = document.getElementById('articleHeaderReportBtn');
        if (headerLikeBtn) {
            headerLikeBtn.dataset.liked = liked;
            const headerIcon = headerLikeBtn.querySelector('i');
            if (headerIcon) headerIcon.className = liked ? 'fas fa-heart' : 'far fa-heart';
            if (headerLikeCount) headerLikeCount.textContent = likeCount;
        }
        // 使用 onclick，避免 showArticle 被多次调用时重复绑定事件
        if (headerLikeBtn) headerLikeBtn.onclick = () => toggleArticleLike(articleId);
        if (headerReportBtn) headerReportBtn.onclick = () => showArticleReportDialog(articleId);

        document.getElementById('articleLikeBtn').addEventListener('click', () => toggleArticleLike(articleId));
        document.getElementById('articleReportBtn').addEventListener('click', () => showArticleReportDialog(articleId));
        document.getElementById('submitArticleCommentBtn').addEventListener('click', () => submitArticleComment(articleId));
        const replyCancelBtn = document.getElementById('articleCommentReplyCancelBtn');
        if (replyCancelBtn) replyCancelBtn.addEventListener('click', clearCommentReplyTarget);
        const commentTextarea = document.getElementById('articleCommentContent');
        const commentImageInput = document.getElementById('articleCommentImageInput');
        if (commentTextarea) {
            const resize = () => {
                commentTextarea.style.height = 'auto';
                const h = Math.min(commentTextarea.scrollHeight, 220);
                commentTextarea.style.height = `${h}px`;
            };
            commentTextarea.oninput = resize;
            resize();
        }
        if (commentImageInput) commentImageInput.value = '';
        await loadArticleComments(articleId);
    } catch (error) {
        console.error('获取文章详情时发生错误:', error);
        alert('获取文章详情失败');
    } finally {
        hideLoading();
    }
}

function showArticleReportDialog(articleId) {
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
        showLoginRequiredHint();
        return;
    }
    const existing = document.getElementById('articleReportDialogOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'articleReportDialogOverlay';
    overlay.className = 'article-report-overlay';
    overlay.innerHTML = `
        <div class="article-report-dialog" role="dialog" aria-modal="true" aria-label="举报资讯">
            <div class="article-report-header">
                <div class="article-report-title">举报资讯</div>
                <button type="button" class="article-report-close" id="articleReportCloseBtn" aria-label="关闭">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="article-report-body">
                <div class="article-report-field">
                    <div class="article-report-label">举报理由</div>
                    <select id="articleReportReasonSelect" class="article-report-select">
                        <option value="" selected disabled>请选择举报原因</option>
                        <option value="copyright">侵权</option>
                        <option value="porn">色情低俗</option>
                        <option value="spam">违规引流</option>
                        <option value="illegal">涉嫌诈骗</option>
                        <option value="abuse">政治敏感</option>
                        <option value="other">其他</option>
                    </select>
                </div>
                <div class="article-report-field">
                    <div class="article-report-label">详细描述（可选）</div>
                    <textarea id="articleReportContentTextarea" class="article-report-textarea" rows="5" placeholder="补充说明，尽量提供具体信息"></textarea>
                </div>
            </div>
            <div class="article-report-actions">
                <button type="button" class="btn btn-outline" id="articleReportCancelBtn">取消</button>
                <button type="button" class="btn btn-primary" id="articleReportSubmitBtn">
                    <i class="fas fa-paper-plane"></i> 提交
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
        const el = document.getElementById('articleReportDialogOverlay');
        if (el) el.remove();
    };

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });
    const closeBtn = document.getElementById('articleReportCloseBtn');
    const cancelBtn = document.getElementById('articleReportCancelBtn');
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (cancelBtn) cancelBtn.addEventListener('click', close);

    const submitBtn = document.getElementById('articleReportSubmitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            const reasonEl = document.getElementById('articleReportReasonSelect');
            const contentEl = document.getElementById('articleReportContentTextarea');
            const reason = reasonEl ? reasonEl.value : 'other';
            const content = contentEl ? contentEl.value.trim() : '';
            close();
            reportArticle(articleId, reason, content);
        });
    }
}

async function reportArticle(articleId, reason, content) {
    try {
        const response = await fetch(`${AppState.apiBaseUrl}/api/articles/${articleId}/report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AppState.user.token}`
            },
            body: JSON.stringify({ reason, content })
        });
        const text = await response.text();
        let result = {};
        try {
            result = text ? JSON.parse(text) : {};
        } catch (parseErr) {
            alert('举报失败：服务器返回非 JSON（HTTP ' + response.status + '）');
            return;
        }
        if (result.code === 200) {
            alert('举报成功');
        } else {
            alert(result.msg || result.message || ('举报失败（HTTP ' + response.status + '）'));
        }
    } catch (e) {
        alert('举报失败，请检查网络或登录状态');
    }
}

function showCommentReportDialog(commentId) {
    if (!commentId) return;
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
        showLoginRequiredHint();
        return;
    }
    const existing = document.getElementById('commentReportDialogOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'commentReportDialogOverlay';
    overlay.className = 'article-report-overlay';
    overlay.innerHTML = `
        <div class="article-report-dialog" role="dialog" aria-modal="true" aria-label="举报评论">
            <div class="article-report-header">
                <div class="article-report-title">举报评论</div>
                <button type="button" class="article-report-close" id="commentReportCloseBtn" aria-label="关闭">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="article-report-body">
                <div class="article-report-field">
                    <div class="article-report-label">举报理由</div>
                    <select id="commentReportReasonSelect" class="article-report-select">
                        <option value="" selected disabled>请选择举报原因</option>
                        <option value="copyright">侵权</option>
                        <option value="porn">色情低俗</option>
                        <option value="spam">违规引流</option>
                        <option value="fraud">涉嫌诈骗</option>
                        <option value="politics">政治敏感</option>
                        <option value="other">其他</option>
                    </select>
                </div>
                <div class="article-report-field">
                    <div class="article-report-label">详细描述（可选）</div>
                    <textarea id="commentReportContentTextarea" class="article-report-textarea" rows="5" placeholder="补充说明，尽量提供具体信息"></textarea>
                </div>
            </div>
            <div class="article-report-actions">
                <button type="button" class="btn btn-outline" id="commentReportCancelBtn">取消</button>
                <button type="button" class="btn btn-primary" id="commentReportSubmitBtn">
                    <i class="fas fa-paper-plane"></i> 提交
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
        const el = document.getElementById('commentReportDialogOverlay');
        if (el) el.remove();
    };

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });
    const closeBtn = document.getElementById('commentReportCloseBtn');
    const cancelBtn = document.getElementById('commentReportCancelBtn');
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (cancelBtn) cancelBtn.addEventListener('click', close);

    const submitBtn = document.getElementById('commentReportSubmitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            const reasonEl = document.getElementById('commentReportReasonSelect');
            const contentEl = document.getElementById('commentReportContentTextarea');
            const reason = reasonEl ? reasonEl.value : '';
            const content = contentEl ? contentEl.value.trim() : '';
            if (!reason) {
                alert('请选择举报原因');
                return;
            }
            close();
            reportComment(commentId, reason, content);
        });
    }
}

async function reportComment(commentId, reason, content) {
    if (!commentId) return;
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
        showLoginRequiredHint();
        return;
    }
    try {
        const response = await fetch(`${AppState.apiBaseUrl}/api/articles/comments/${commentId}/report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AppState.user.token}`
            },
            body: JSON.stringify({ reason, content })
        });
        const text = await response.text();
        let result = {};
        try {
            result = text ? JSON.parse(text) : {};
        } catch (parseErr) {
            alert('举报失败：服务器返回非 JSON（HTTP ' + response.status + '）');
            return;
        }
        if (result.code === 200) {
            alert('举报成功');
        } else {
            alert(result.msg || result.message || ('举报失败（HTTP ' + response.status + '）'));
        }
    } catch (e) {
        alert('举报失败，请检查网络或登录状态');
    }
}

// 点赞/取消点赞
async function toggleArticleLike(articleId) {
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
        showLoginRequiredHint();
        return;
    }
    try {
        const response = await fetch(`${AppState.apiBaseUrl}/api/articles/${articleId}/like`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${AppState.user.token}` }
        });
        const result = await response.json();
        if (result.code === 200 && result.data) {
            const btn = document.getElementById('articleLikeBtn');
            const icon = btn ? btn.querySelector('i') : null;
            const countEl = document.querySelector('.like-count');
            const headerLikeBtn = document.getElementById('articleHeaderLikeBtn');
            const headerIcon = headerLikeBtn ? headerLikeBtn.querySelector('i') : null;
            const headerCountEl = document.getElementById('articleHeaderLikeCount');
            if (btn) {
                btn.dataset.liked = result.data.liked;
                btn.classList.toggle('liked', result.data.liked);
                if (icon) icon.className = result.data.liked ? 'fas fa-heart' : 'far fa-heart';
            }
            if (countEl) countEl.textContent = result.data.likeCount;

            if (headerLikeBtn) {
                headerLikeBtn.dataset.liked = result.data.liked;
                if (headerIcon) headerIcon.className = result.data.liked ? 'fas fa-heart' : 'far fa-heart';
            }
            if (headerCountEl) headerCountEl.textContent = result.data.likeCount;
        } else {
            alert(result.msg || '操作失败');
        }
    } catch (e) {
        alert('点赞失败，请稍后重试');
    }
}

// 加载文章评论列表（Bilibili 风格：一级全显，楼中楼默认 2 条可展开）
async function loadArticleComments(articleId) {
    const listEl = document.getElementById('articleCommentList');
    if (!listEl) return;
    try {
        const response = await fetch(`${AppState.apiBaseUrl}/api/articles/${articleId}/comments`);
        const result = await response.json();
        const comments = (result.code === 200 && result.data) ? result.data : [];
        listEl.innerHTML = renderCommentTree(comments);
        bindCommentListEvents(listEl, articleId);
    } catch (e) {
        listEl.innerHTML = '<p class="comment-empty">评论加载失败</p>';
    }
}

function bindCommentListEvents(listEl, articleId) {
    if (!listEl) return;
    listEl.querySelectorAll('.comment-reply-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const parentId = btn.getAttribute('data-parent-id');
            const replyName = btn.getAttribute('data-reply-name') || '';
            const parentEl = document.getElementById('articleCommentParentId');
            if (parentEl) parentEl.value = parentId || '';
            const hint = document.getElementById('articleCommentReplyHint');
            const textarea = document.getElementById('articleCommentContent');
            if (hint) {
                hint.style.display = 'flex';
                const nameSpan = hint.querySelector('.reply-hint-name');
                if (nameSpan) nameSpan.textContent = replyName || '用户';
            }
            if (textarea) {
                textarea.placeholder = replyName ? `回复 @${replyName}` : '回复评论…';
                textarea.focus();
            }
        });
    });
    listEl.querySelectorAll('.comment-report-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const commentId = btn.getAttribute('data-comment-id');
            if (!commentId) return;
            showCommentReportDialog(parseInt(commentId, 10));
        });
    });
    listEl.querySelectorAll('.comment-expand-replies').forEach(btn => {
        btn.addEventListener('click', () => {
            const rootId = btn.getAttribute('data-root-id');
            const box = listEl.querySelector(`.comment-replies[data-root-id="${rootId}"]`);
            if (!box) return;
            const expanded = box.classList.toggle('is-expanded');
            const total = parseInt(btn.getAttribute('data-total') || '0', 10);
            if (expanded) {
                btn.textContent = '收起回复';
            } else {
                btn.textContent = `展开更多回复（${Math.max(0, total - 2)}）`;
            }
        });
    });
}

function clearCommentReplyTarget() {
    const parentEl = document.getElementById('articleCommentParentId');
    if (parentEl) parentEl.value = '';
    const hint = document.getElementById('articleCommentReplyHint');
    if (hint) hint.style.display = 'none';
    const textarea = document.getElementById('articleCommentContent');
    if (textarea) textarea.placeholder = AppState.isLoggedIn ? '写下你的评论…' : '登录后即可评论';
}

function renderCommentTree(comments) {
    if (!comments || comments.length === 0) return '<p class="comment-empty">暂无评论</p>';
    return comments.map(c => renderRootComment(c)).join('');
}

function formatCommentContentHtml(rawContent, escHtml, escAttr) {
    const imgRe = /\[\[img:([^\]]+)\]\]/g;
    let contentHtml = '';
    let last = 0;
    let m = null;
    const raw = rawContent || '';
    while ((m = imgRe.exec(raw)) !== null) {
        const textPart = raw.slice(last, m.index);
        contentHtml += escHtml(textPart).replace(/\n/g, '<br>');
        const imgUrl = m[1];
        contentHtml += `<img class="comment-image" src="${escAttr(imgUrl)}" alt="" loading="lazy" onerror="this.style.display='none';">`;
        last = m.index + m[0].length;
    }
    contentHtml += escHtml(raw.slice(last)).replace(/\n/g, '<br>');
    return contentHtml;
}

function renderRootComment(c) {
    const escHtml = (v) => String(v == null ? '' : v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const escAttr = (v) => escHtml(v).replace(/"/g, '&quot;');
    const avatar = (c.authorAvatar || '/images/CSel3_LargePortTianhuo.png');
    const time = c.created_at ? formatDate(c.created_at) : (c.createdAt ? formatDate(c.createdAt) : '');
    const author = escHtml(c.authorName || '用户');
    const contentHtml = formatCommentContentHtml(c.content, escHtml, escAttr);
    const replies = Array.isArray(c.replies) ? c.replies : [];
    const rootId = c.id;
    let repliesHtml = '';
    if (replies.length) {
        const visible = replies.slice(0, 2).map(r => renderReplyComment(r, rootId, escHtml, escAttr)).join('');
        const hidden = replies.slice(2).map(r => renderReplyComment(r, rootId, escHtml, escAttr)).join('');
        const expandBtn = replies.length > 2
            ? `<button type="button" class="comment-expand-replies link-btn" data-root-id="${rootId}" data-total="${replies.length}">展开更多回复（${replies.length - 2}）</button>`
            : '';
        repliesHtml = `
            <div class="comment-replies" data-root-id="${rootId}">
                ${visible}
                <div class="comment-replies-more">${hidden}</div>
                ${expandBtn}
            </div>`;
    }
    return `
        <div class="comment-item comment-item--root" data-comment-id="${c.id}">
            <div class="comment-avatar-wrap">
                <img src="${avatar}" alt="" class="comment-avatar" onerror="this.onerror=null;this.src='/images/CSel3_LargePortTianhuo.png'">
            </div>
            <div class="comment-body">
                <span class="comment-author">${author}</span>
                <span class="comment-time">${time}</span>
                <p class="comment-content">${contentHtml}</p>
                <div class="comment-actions">
                    <button type="button" class="comment-reply-btn link-btn" data-parent-id="${c.id}" data-reply-name="${escAttr(c.authorName || '用户')}">回复</button>
                    <button type="button" class="comment-report-btn link-btn" data-comment-id="${c.id}">举报</button>
                </div>
                ${repliesHtml}
            </div>
        </div>`;
}

function renderReplyComment(r, rootId, escHtml, escAttr) {
    const avatar = (r.authorAvatar || '/images/CSel3_LargePortTianhuo.png');
    const time = r.created_at ? formatDate(r.created_at) : (r.createdAt ? formatDate(r.createdAt) : '');
    const author = escHtml(r.authorName || '用户');
    const contentHtml = formatCommentContentHtml(r.content, escHtml, escAttr);
    const parentId = r.parentId != null ? r.parentId : r.parent_id;
    const replyToName = r.replyToAuthorName || r.reply_to_author_name || '';
    // 回复非一级评论时显示「回复 @用户」
    const showDirected = parentId != null && String(parentId) !== String(rootId) && replyToName;
    const directedHtml = showDirected
        ? `<span class="comment-reply-to">回复 <span class="comment-reply-to-name">@${escHtml(replyToName)}</span></span>`
        : '';
    return `
        <div class="comment-item comment-item--reply" data-comment-id="${r.id}">
            <div class="comment-avatar-wrap comment-avatar-wrap--sm">
                <img src="${avatar}" alt="" class="comment-avatar" onerror="this.onerror=null;this.src='/images/CSel3_LargePortTianhuo.png'">
            </div>
            <div class="comment-body">
                <span class="comment-author">${author}</span>
                ${directedHtml}
                <span class="comment-time">${time}</span>
                <p class="comment-content">${contentHtml}</p>
                <div class="comment-actions">
                    <button type="button" class="comment-reply-btn link-btn" data-parent-id="${r.id}" data-reply-name="${escAttr(r.authorName || '用户')}">回复</button>
                    <button type="button" class="comment-report-btn link-btn" data-comment-id="${r.id}">举报</button>
                </div>
            </div>
        </div>`;
}

async function submitArticleComment(articleId) {
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
        showLoginRequiredHint();
        return;
    }
    const contentEl = document.getElementById('articleCommentContent');
    const parentIdEl = document.getElementById('articleCommentParentId');
    const rawText = contentEl && contentEl.value ? contentEl.value.trim() : '';
    const imageInputEl = document.getElementById('articleCommentImageInput');
    const imageFile = imageInputEl && imageInputEl.files ? imageInputEl.files[0] : null;
    // 文本允许为空，但必须至少提供文本或图片
    if (!rawText && !imageFile) {
        alert('请输入评论内容或先上传图片');
        return;
    }
    const parentId = parentIdEl && parentIdEl.value ? parentIdEl.value : null;
    try {
        let commentContent = rawText;
        if (imageFile) {
            const imgUrl = await uploadImageFileAndGetUrl(imageFile);
            if (!imgUrl) {
                alert('图片上传失败，请稍后重试');
                return;
            }
            commentContent = commentContent ? `${commentContent}\n[[img:${imgUrl}]]` : `[[img:${imgUrl}]]`;
        }
        const body = { content: commentContent };
        if (parentId) body.parentId = parseInt(parentId, 10);
        const response = await fetch(`${AppState.apiBaseUrl}/api/articles/${articleId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AppState.user.token}`
            },
            body: JSON.stringify(body)
        });
        const result = await response.json();
        if (result.code === 200) {
            if (result.msg) {
                alert(result.msg);
            }
            if (contentEl) {
                contentEl.value = '';
                // 让评论框回到初始高度
                if (contentEl.style) contentEl.style.height = 'auto';
            }
            if (imageInputEl) imageInputEl.value = '';
            clearCommentReplyTarget();
            await loadArticleComments(articleId);
        } else {
            alert(result.msg || '评论失败');
        }
    } catch (e) {
        alert('评论失败，请检查网络或登录状态');
    }
}


/** 同步未登录入口页：未登录只显示 authEntry，登录后恢复导航与内容 */
function applyAuthEntryGate() {
    const authed = !!(AppState.isLoggedIn && AppState.user);
    try {
        document.documentElement.classList.toggle('tfhers-authed', authed);
        setAppTopActionsVisible(authed);
        if (authed) syncTopUserAvatar();
        document.title = '蹄斗族群助手';
    } catch (e) { /* ignore */ }
    const overlay = document.getElementById('authEntryOverlay');
    if (overlay) {
        overlay.style.display = authed ? 'none' : 'flex';
        overlay.setAttribute('aria-hidden', authed ? 'true' : 'false');
    }
    if (!authed) {
        try {
            document.body.classList.remove('ai-chat-page', 'ai-chat-page--gated', 'lobby-page', 'rooms-page--gated');
        } catch (e) { /* ignore */ }
        if (typeof showAuthEntryActions === 'function') {
            // 退出登录回到入口时重置为按钮步（若当前已在表单步则保留也可；退出时重置更清晰）
            // 仅在从已登录切到未登录时重置——用 dataset 标记
        }
        if (elements.loginModal) elements.loginModal.style.display = 'none';
        if (elements.registerModal) elements.registerModal.style.display = 'none';
    }
}

function showAboutTfhers() {
    /* 改为悬停提示，不再弹窗 */
}

function closeAboutTfhers() {
    /* no-op */
}

// 显示登录模态框
function isAuthEntryVisible() {
    const overlay = document.getElementById('authEntryOverlay');
    if (!overlay) return false;
    if (document.documentElement.classList.contains('tfhers-authed')) return false;
    try {
        const style = window.getComputedStyle(overlay);
        return style.display !== 'none' && style.visibility !== 'hidden';
    } catch (e) {
        return overlay.style.display !== 'none';
    }
}

function setAuthEntryStep(step) {
    const map = {
        actions: document.getElementById('authEntryStepActions'),
        login: document.getElementById('authEntryStepLogin'),
        register: document.getElementById('authEntryStepRegister')
    };
    Object.keys(map).forEach((key) => {
        const el = map[key];
        if (!el) return;
        const active = key === step;
        el.classList.toggle('is-active', active);
        if (active) {
            el.hidden = false;
            el.removeAttribute('hidden');
        } else {
            el.hidden = true;
            el.setAttribute('hidden', '');
        }
    });
    if (elements.loginModal) elements.loginModal.style.display = 'none';
    if (elements.registerModal) elements.registerModal.style.display = 'none';
}

function showAuthEntryActions() {
    setAuthEntryStep('actions');
}

// 显示登录：入口卡片内展开（非全屏弹窗）
function showLoginModal() {
    applyAuthEntryGate();
    if (!AppState.isLoggedIn) {
        setAuthEntryStep('login');
        const userInput = document.getElementById('loginUsername');
        if (userInput) setTimeout(() => userInput.focus(), 0);
        return;
    }
    if (elements.loginModal) elements.loginModal.style.display = 'block';
}

// 关闭登录
function closeLoginModal() {
    if (!AppState.isLoggedIn) {
        showAuthEntryActions();
        return;
    }
    if (elements.loginModal) elements.loginModal.style.display = 'none';
}

/**
 * 未登录时的轻提示：感叹号 + 请先登录
 * - 点击遮罩/按钮关闭
 * - 自动 1.2s 关闭
 */
function showLoginRequiredHint() {
    // 全站未登录门开启时，直接弹出登录框
    if (!AppState.isLoggedIn) {
        applyAuthEntryGate();
        showLoginModal();
        return;
    }

    try {
        const old = document.getElementById('loginRequiredHintOverlay');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'loginRequiredHintOverlay';
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.zIndex = '4000';
        overlay.style.background = 'rgba(0,0,0,0.45)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.padding = '20px';

        const box = document.createElement('div');
        box.style.width = 'min(360px, 92vw)';
        box.style.background = 'rgba(26,26,26,0.96)';
        box.style.border = '1px solid rgba(255,255,255,0.12)';
        box.style.borderRadius = '14px';
        box.style.boxShadow = '0 18px 50px rgba(0,0,0,0.45)';
        box.style.padding = '16px 14px';
        box.style.display = 'flex';
        box.style.alignItems = 'center';
        box.style.gap = '12px';

        box.innerHTML = `
            <div style="width:36px;height:36px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:rgba(255,107,107,0.14);border:1px solid rgba(255,107,107,0.32);flex:0 0 auto;">
                <i class="fas fa-exclamation" style="color: var(--accent-primary);"></i>
            </div>
            <div style="display:flex;flex-direction:column;gap:2px;min-width:0;">
                <div style="font-weight:800;color:var(--text-primary);line-height:1.2;">请先登录</div>
                <div style="color:var(--text-secondary);font-size:0.9rem;line-height:1.2;">登录后才能进行点赞、举报和评论</div>
            </div>
            <button type="button" id="loginRequiredHintOkBtn" style="margin-left:auto;appearance:none;border:none;background:rgba(255,255,255,0.08);color:var(--text-primary);border-radius:10px;padding:8px 10px;cursor:pointer;flex:0 0 auto;">知道了</button>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const close = () => {
            const el = document.getElementById('loginRequiredHintOverlay');
            if (el) el.remove();
        };
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
        const okBtn = document.getElementById('loginRequiredHintOkBtn');
        if (okBtn) okBtn.onclick = close;

        window.setTimeout(close, 1200);
    } catch (e) {
        alert('请先登录');
    }
}

// 显示注册模态框
function showRegisterModal() {
    applyAuthEntryGate();
    if (!AppState.isLoggedIn) {
        setAuthEntryStep('register');
        const userInput = document.getElementById('regUsername');
        if (userInput) setTimeout(() => userInput.focus(), 0);
        return;
    }
    if (elements.registerModal) elements.registerModal.style.display = 'block';
}

// 关闭注册
function closeRegisterModal() {
    if (!AppState.isLoggedIn) {
        showAuthEntryActions();
        return;
    }
    if (elements.registerModal) elements.registerModal.style.display = 'none';
}

// 切换到注册
function switchToRegister() {
    closeLoginModal();
    showRegisterModal();
}

// 切换到登录
function switchToLogin() {
    closeRegisterModal();
    showLoginModal();
}

// 打开文章详情等模态框时锁定背景页面滚动，避免出现“偶尔能滑动整个页面”的问题
function lockBodyScroll() {
    if (AppState.modalBodyScrollLocked) return;
    AppState.modalBodyScrollPrevOverflow = document.body.style.overflow;
    AppState.modalBodyScrollLocked = true;
    document.body.style.overflow = 'hidden';
}

function unlockBodyScroll() {
    if (!AppState.modalBodyScrollLocked) return;
    document.body.style.overflow = AppState.modalBodyScrollPrevOverflow || '';
    AppState.modalBodyScrollLocked = false;
}

function pauseVideosIn(container) {
    if (!container) return;
    container.querySelectorAll('video').forEach((v) => {
        try {
            v.pause();
            v.removeAttribute('src');
            v.load();
        } catch (err) { /* ignore */ }
    });
}

// 关闭连段视频弹窗（独立 modal，不含资讯点赞/举报）
function closeComboModal() {
    const contentEl = document.getElementById('comboContent');
    pauseVideosIn(contentEl);
    const modal = document.getElementById('comboModal');
    if (modal) modal.style.display = 'none';
}

// 关闭角色模态框
function closeCharacterModal() {
    closeComboModal();
    elements.characterModal.style.display = 'none';
}

// 关闭文章模态框
function closeArticleModal() {
    const ac = document.getElementById('articleContent');
    pauseVideosIn(ac);
    elements.articleModal.style.display = 'none';
    unlockBodyScroll();
}

// 关闭所有模态框
function closeAllModals() {
    closeLoginModal();
    closeRegisterModal();
    closeComboModal();
    closeCharacterModal();
    closeArticleModal();
    closeCreateArticleModal();
    closeCreateComboModal();
    unlockBodyScroll();
}

// 处理登录

function apiErrorMessage(result, response, fallback) {
    if (result && (result.msg || result.message || result.error)) {
        return result.msg || result.message || result.error;
    }
    if (response && response.status) {
        return (fallback || '请求失败') + '（HTTP ' + response.status + '）';
    }
    return fallback || '请求失败';
}


/** 登录成功后若首屏未加载过内容，则补一次初始化 */
async function bootstrapAppAfterAuth() {
    applyAuthEntryGate();
    if (!AppState._contentBootstrapped) {
        await loadCharacters({ silent: true });
        await loadArticles({ silent: true });
        renderArticles(AppState.articles);
        renderCharacters(AppState.characters);
        AppState._contentBootstrapped = true;
    } else {
        await loadArticles();
        renderArticles(AppState.articles);
    }
    const initialPage = getPageIdFromRouting();
    showPage(initialPage || 'news');
    if (typeof normalizeIndexTabInUrl === 'function') {
        normalizeIndexTabInUrl(initialPage || 'news');
    }
    if ((initialPage || 'news') === 'ai-chat' && typeof window.mountAiChatPanel === 'function') {
        window.mountAiChatPanel();
    }
    if ((initialPage || 'news') === 'lobby' && typeof loadLobbyContent === 'function') {
        loadLobbyContent();
    }
}


function setAuthSubmitLoading(btn, loading, busyText) {
    if (!btn) return;
    if (loading) {
        if (!btn.dataset.idleHtml) btn.dataset.idleHtml = btn.innerHTML;
        btn.disabled = true;
        btn.classList.add('is-loading');
        const label = busyText || '...';
        btn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i><span>' + label + '</span>';
    } else {
        btn.disabled = false;
        btn.classList.remove('is-loading');
        if (btn.dataset.idleHtml) btn.innerHTML = btn.dataset.idleHtml;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('loginSubmitBtn');
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        alert('请输入用户名和密码');
        return;
    }
    
    try {
        setAuthSubmitLoading(submitBtn, true, '登录中…');
        const response = await fetch(`${AppState.managementApiUrl}/api/user/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            AppState.isLoggedIn = true;
            AppState.user = result.data;
            console.log('登录成功，用户数据:', AppState.user);
            console.log('用户头像URL:', AppState.user.avatarUrl);
            updateUserInterface();
            closeLoginModal();
            closeAboutTfhers();
            await bootstrapAppAfterAuth();
        } else {
            alert('登录失败：' + apiErrorMessage(result, response, '登录失败'));
        }
    } catch (error) {
        console.error('登录错误:', error);
        alert('登录失败，请检查网络连接');
    } finally {
        setAuthSubmitLoading(submitBtn, false);
    }
}

// 绑定 Steam（用户端）
async function bindSteam() {
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
        showLoginRequiredHint();
        return;
    }
    try {
        showLoading();
        const resp = await fetch(`${AppState.managementApiUrl}/api/user/steam/login-url`, {
            headers: {
                'Authorization': `Bearer ${AppState.user.token}`
            }
        });
        const result = await resp.json();
        if (result.code === 200 && result.data && result.data.url) {
            window.location.href = result.data.url;
        } else {
            alert(result.msg || '获取 Steam 绑定地址失败');
        }
    } catch (e) {
        console.error('绑定 Steam 出错', e);
        alert('绑定 Steam 出错，请稍后重试');
    } finally {
        hideLoading();
    }
}

// 解除 Steam 绑定（用户端）
async function unbindSteam() {
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
        showLoginRequiredHint();
        return;
    }
    if (!confirm('确定要解除 Steam 绑定吗？解除后将清空 Steam 头像、时长等信息。')) {
        return;
    }
    try {
        showLoading();
        const resp = await fetch(`${AppState.managementApiUrl}/api/user/steam/unbind`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AppState.user.token}`
            }
        });
        const result = await resp.json();
        if (result.code === 200) {
            // 清空本地状态与缓存
            AppState.user.steamId = null;
            AppState.user.steamPersonaName = null;
            AppState.user.steamAvatarUrl = null;
            AppState.user.steamPlaytimeMinutes = null;
            AppState.user.steamLevel = null;
            AppState.user.steamAchievementsCount = 0;
            AppState.user.steamAchievementsTotal = 0;
            AppState.user.steamAchievements = { achieved: 0, total: 0 };
            localStorage.setItem('user', JSON.stringify(AppState.user));
            applySteamPanelUI();
            if (typeof refreshSettingsBindPanel === 'function') refreshSettingsBindPanel();
            updateMyStatsPanel();
        } else {
            alert(result.msg || '解除绑定失败');
        }
    } catch (e) {
        console.error('解除绑定失败', e);
        alert('解除绑定失败，请检查网络');
    } finally {
        hideLoading();
    }
}

/**
 * 根据 AppState.user 渲染「我的」页 Steam 卡片（数据来自登录/Profile/上次刷新，不请求 Steam）
 * @param {object} [opts]
 * @param {string} [opts.syncError] 手动刷新失败时的提示文案
 * @param {boolean} [opts.skipLoadAchievements] 为 true 时不触发成就接口（由调用方再 force 拉取）
 */
function applySteamPanelUI(opts = {}) {
    const syncError = opts.syncError || '';
    const skipLoadAchievements = !!opts.skipLoadAchievements;
    if (!AppState.isLoggedIn || !AppState.user) return;

    const infoEl = document.getElementById('steamInfo');
    const achvEl = document.getElementById('steamAchievements');
    const steamId = AppState.user.steamId;

    if (infoEl && steamId) {
        const minutes = AppState.user.steamPlaytimeMinutes != null ? Number(AppState.user.steamPlaytimeMinutes) : 0;
        const hours = Math.round((minutes / 60.0) * 10) / 10;
        const persona = AppState.user.steamPersonaName || '';
        const avatarUrlSteam = AppState.user.steamAvatarUrl || '';
        const avatarHtml = avatarUrlSteam
            ? `<img src="${avatarUrlSteam}" alt="Steam头像" class="steam-avatar steam-avatar-large">`
            : '';
        const namePart = persona || 'Steam 用户';
        const errHtml = syncError
            ? `<div class="steam-sync-hint steam-sync-hint--err">${String(syncError).replace(/</g, '&lt;')}</div>`
            : '';
        infoEl.innerHTML =
            `<div class="steam-profile-row">
                ${avatarHtml}
                <div class="steam-profile-meta">
                    <span>Steam：${namePart}（ID: ${steamId}）</span>
                    <span>蹄斗族群总游戏时长：${hours} 小时</span>
                </div>
            </div>${errHtml}`;
        if (!skipLoadAchievements) {
            loadSteamAchievements(false);
        }
    } else {
        if (infoEl) infoEl.textContent = '尚未绑定 Steam 账号';
        if (achvEl) achvEl.innerHTML = '';
    }

    const bindBtn = document.getElementById('bindSteamButton');
    const unbindBtn = document.getElementById('unbindSteamButton');
    const refreshBtn = document.getElementById('refreshSteamPlaytimeButton');
    if (bindBtn) bindBtn.style.display = steamId ? 'none' : 'inline-flex';
    if (unbindBtn) unbindBtn.style.display = steamId ? 'inline-flex' : 'none';
    if (refreshBtn) refreshBtn.disabled = !steamId;
    if (typeof refreshSettingsBindPanel === 'function') refreshSettingsBindPanel();
    if (typeof updateMyStatsPanel === 'function') updateMyStatsPanel();
}

/** 从 /api/user/profile 合并用户与 Steam 缓存字段（仅数据库） */
async function syncUserSteamFromServer() {
    if (!AppState.user || !AppState.user.token) return;
    try {
        const r = await fetch(`${AppState.managementApiUrl}/api/user/profile`, {
            headers: { 'Authorization': `Bearer ${AppState.user.token}` }
        });
        const j = await r.json();
        if (j.code !== 200 || !j.data) return;
        const d = j.data;
        ['username', 'nickname', 'email', 'phone', 'avatarUrl', 'signature'].forEach((k) => {
            if (d[k] !== undefined && d[k] !== null) {
                AppState.user[k] = d[k];
            }
        });
        if ('steamId' in d) AppState.user.steamId = d.steamId;
        if ('steamPersonaName' in d) AppState.user.steamPersonaName = d.steamPersonaName;
        if ('steamAvatarUrl' in d) AppState.user.steamAvatarUrl = d.steamAvatarUrl;
        if ('steamPlaytimeMinutes' in d) AppState.user.steamPlaytimeMinutes = d.steamPlaytimeMinutes;
        if ('steamLevel' in d) AppState.user.steamLevel = d.steamLevel;
        if ('steamAchievementsCount' in d || 'steamAchievementsTotal' in d) {
            const ac = d.steamAchievementsCount;
            const at = d.steamAchievementsTotal;
            if (!AppState.user.steamAchievements) AppState.user.steamAchievements = { achieved: 0, total: 0 };
            if (typeof ac === 'number') {
                AppState.user.steamAchievementsCount = ac;
                AppState.user.steamAchievements.achieved = ac;
            }
            if (typeof at === 'number') {
                AppState.user.steamAchievementsTotal = at;
                AppState.user.steamAchievements.total = at;
            }
        }

        localStorage.setItem('user', JSON.stringify(AppState.user));

        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar && AppState.user.avatarUrl) {
            userAvatar.src = AppState.user.avatarUrl;
        }
        syncTopUserAvatar(AppState.user && AppState.user.avatarUrl);
        const userName = document.getElementById('userName');
        if (userName) userName.textContent = AppState.user.nickname || AppState.user.username;
        const userSignature = document.getElementById('userSignature');
        if (userSignature) userSignature.textContent = AppState.user.signature || '这个人很懒，还没有个性签名';

        applySteamPanelUI();
    } catch (e) {
        console.warn('同步用户资料失败', e);
    }
}

async function loadSteamAchievements(forceRefresh = false) {
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) return;
    if (!AppState.user.steamId) return;
    const myEl = document.getElementById('steamAchievements');
    const dataEl = document.getElementById('dataAchievementsList');
    try {
        const url = `${AppState.managementApiUrl}/api/user/steam/achievements${forceRefresh ? '?force=1' : ''}`;
        const resp = await fetch(url, {
            headers: { 'Authorization': `Bearer ${AppState.user.token}` }
        });
        const result = await resp.json();
        if (result.code === 200 && result.data) {
            AppState._lastSteamAchievementsData = result.data;
            renderSteamAchievements(result.data);
        } else {
            if (myEl) myEl.innerHTML = '';
            if (dataEl) dataEl.innerHTML = '';
            const cnt = document.getElementById('dataAchvCount');
            if (cnt) cnt.textContent = '';
        }
    } catch (e) {
        console.error('加载 Steam 成就失败', e);
    }
}

function formatSteamUnlockTime(unlockTime) {
    if (unlockTime == null || unlockTime === '' || Number(unlockTime) <= 0) return '';
    const n = Number(unlockTime);
    if (!Number.isFinite(n) || n <= 0) return '';
    // Steam unlocktime is unix seconds
    const d = new Date(n > 1e12 ? n : n * 1000);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
}

function renderSteamAchievements(data) {
    const achvEl = document.getElementById('steamAchievements');
    const dataEl = document.getElementById('dataAchievementsList');
    const total = data.total || 0;
    const achieved = data.achieved || 0;
    if (AppState.user) {
        AppState.user.steamAchievements = { achieved, total };
        AppState.user.steamAchievementsCount = achieved;
        AppState.user.steamAchievementsTotal = total;
    }
    const rawList = Array.isArray(data.achievements) ? data.achievements : [];

    const cntEl = document.getElementById('dataAchvCount');
    if (cntEl) cntEl.textContent = total ? (`已获得 ${achieved}/${total}`) : '';

    if (!total) {
        if (achvEl) achvEl.innerHTML = `<div class="achv-empty">暂无成就数据</div>`;
        if (dataEl) dataEl.innerHTML = `<div class="achv-empty">暂无成就数据</div>`;
        if (typeof updateMyStatsPanel === 'function') updateMyStatsPanel();
        return;
    }

    if (AppState.user && typeof AppState.user.steamAchievementsExpanded !== 'boolean') {
        AppState.user.steamAchievementsExpanded = false;
    }
    const expanded = !!(AppState.user && AppState.user.steamAchievementsExpanded);

    const list = rawList.slice().sort((a, b) => {
        const aAch = ('achieved' in (a || {})) ? (a.achieved ? 1 : 0) : 1;
        const bAch = ('achieved' in (b || {})) ? (b.achieved ? 1 : 0) : 1;
        if (aAch !== bAch) return bAch - aAch;
        const aKey = (a && (a.name || a.apiName)) ? String(a.name || a.apiName) : '';
        const bKey = (b && (b.name || b.apiName)) ? String(b.name || b.apiName) : '';
        return aKey.localeCompare(bKey, 'zh-Hans-CN', { numeric: true, sensitivity: 'base' });
    });

    const COLLAPSED_LIMIT = 12;
    const visibleList = expanded ? list : list.slice(0, COLLAPSED_LIMIT);

    // 「我的」页：紧凑卡片（兼容保留）
    if (achvEl) {
        const itemsHtml = visibleList.length
            ? `<div class="achv-grid achv-grid--all">
                ${visibleList.map(a => {
                    const isAchieved = ('achieved' in (a || {})) ? !!a.achieved : true;
                    const icon = isAchieved ? (a.icon || a.iconGray || '') : (a.iconGray || a.icon || '');
                    const name = a.name || a.apiName || '未知成就';
                    const iconHtml = icon ? `<img class="achv-icon" src="${icon}" alt="">` : '';
                    const cls = isAchieved ? 'achv-item achv-item--achieved' : 'achv-item achv-item--locked';
                    return `<div class="${cls}" title="${(a.desc || '').replace(/"/g, '&quot;')}">
                        ${iconHtml}
                        <div class="achv-name">${name}</div>
                    </div>`;
                }).join('')}
            </div>`
            : `<div class="achv-empty">暂无成就数据</div>`;
        const canToggle = list.length > COLLAPSED_LIMIT;
        const toggleText = expanded ? '收起' : '展开';
        const toggleHtml = canToggle
            ? `<button type="button" class="achv-toggle" id="achvToggleBtn">${toggleText}</button>`
            : `<span>共 ${list.length} 项</span>`;
        achvEl.innerHTML = `
            <div class="achv-summary">
                <span>成就：已获得 ${achieved}/${total}</span>
                ${toggleHtml}
            </div>
            ${itemsHtml}
        `;
        const btn = document.getElementById('achvToggleBtn');
        if (btn) {
            btn.onclick = () => {
                if (AppState.user) {
                    AppState.user.steamAchievementsExpanded = !AppState.user.steamAchievementsExpanded;
                }
                renderSteamAchievements(data);
            };
        }
    }

    // 数据页：完整列表（名称、图标、解锁/未解锁、解锁时间）
    if (dataEl) {
        if (AppState.user && typeof AppState.user.dataAchievementsExpanded !== 'boolean') {
            AppState.user.dataAchievementsExpanded = true; // 数据页默认展开
        }
        const dataExpanded = !!(AppState.user && AppState.user.dataAchievementsExpanded);
        const DATA_LIMIT = 24;
        const dataVisible = dataExpanded ? list : list.slice(0, DATA_LIMIT);
        const dataItems = dataVisible.map(a => {
            const isAchieved = ('achieved' in (a || {})) ? !!a.achieved : true;
            const icon = isAchieved ? (a.icon || a.iconGray || '') : (a.iconGray || a.icon || '');
            const name = a.name || a.apiName || '未知成就';
            const desc = (a.desc || '').trim();
            const unlock = isAchieved ? formatSteamUnlockTime(a.unlockTime) : '';
            const iconHtml = icon ? `<img class="achv-icon" src="${icon}" alt="">` : '<div class="achv-icon" aria-hidden="true"></div>';
            const cls = isAchieved ? 'achv-item achv-item--achieved' : 'achv-item achv-item--locked';
            const status = isAchieved ? (unlock ? `解锁于 ${unlock}` : '已解锁') : '未解锁';
            return `<div class="${cls}">
                ${iconHtml}
                <div class="achv-meta">
                    <div class="achv-name">${name}</div>
                    ${desc ? `<div class="achv-desc">${desc}</div>` : ''}
                    <div class="achv-unlock">${status}</div>
                </div>
            </div>`;
        }).join('');
        const canToggleData = list.length > DATA_LIMIT;
        const toggleData = canToggleData
            ? `<button type="button" class="achv-toggle" id="dataAchvToggleBtn">${dataExpanded ? '收起' : '展开全部'}</button>`
            : '';
        dataEl.innerHTML = `
            <div class="achv-summary">
                <span>共 ${list.length} 项</span>
                ${toggleData}
            </div>
            <div class="achv-list">${dataItems}</div>
        `;
        const dbtn = document.getElementById('dataAchvToggleBtn');
        if (dbtn) {
            dbtn.onclick = () => {
                if (AppState.user) {
                    AppState.user.dataAchievementsExpanded = !AppState.user.dataAchievementsExpanded;
                }
                renderSteamAchievements(data);
            };
        }
    }

    if (typeof updateMyStatsPanel === 'function') updateMyStatsPanel();
}



// 刷新 Steam 游戏时长显示
// forceRefresh=true：用户点击刷新，带 ?force=1 跳过后端 TTL，始终请求 Steam
async function refreshSteamPlaytime(forceRefresh = false) {
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) return;
    const infoEl = document.getElementById('steamInfo');
    const refreshBtn = document.getElementById('refreshSteamPlaytimeButton');
    try {
        if (refreshBtn) {
            refreshBtn.disabled = true;
            // 兼容“按钮文字”和“图标按钮”两种写法
            refreshBtn.innerHTML = refreshBtn.classList.contains('steam-refresh-btn')
                ? '<i class="fas fa-sync-alt fa-spin"></i>'
                : '<i class="fas fa-sync-alt fa-spin"></i> 刷新中...';
        }
        const playtimeUrl = `${AppState.managementApiUrl}/api/user/steam/playtime${forceRefresh ? '?force=1' : ''}`;
        const resp = await fetch(playtimeUrl, {
            headers: {
                'Authorization': `Bearer ${AppState.user.token}`
            }
        });
        const result = await resp.json();
        if (result.code === 200 && result.data) {
            const persona = result.data.personaName || '';
            const avatarUrl = result.data.avatarUrl || '';
            const steamId = result.data.steamId;
            AppState.user.steamId = steamId;
            AppState.user.steamPersonaName = persona || AppState.user.steamPersonaName;
            AppState.user.steamAvatarUrl = avatarUrl || AppState.user.steamAvatarUrl;
            AppState.user.steamPlaytimeMinutes = result.data.playtime_minutes;
            if (result.data.steamLevel != null) AppState.user.steamLevel = result.data.steamLevel;
            localStorage.setItem('user', JSON.stringify(AppState.user));
            applySteamPanelUI({ skipLoadAchievements: true });
            loadSteamAchievements(true);
            updateMyStatsPanel();
        } else if (result.code === 400) {
            AppState.user.steamId = null;
            AppState.user.steamPersonaName = null;
            AppState.user.steamAvatarUrl = null;
            AppState.user.steamPlaytimeMinutes = null;
            AppState.user.steamLevel = null;
            if (AppState.user.steamAchievements) AppState.user.steamAchievements = { achieved: 0, total: 0 };
            localStorage.setItem('user', JSON.stringify(AppState.user));
            applySteamPanelUI();
        } else {
            if (AppState.user && AppState.user.steamId) {
                applySteamPanelUI({ syncError: '本次未能从 Steam 更新，已显示上次保存的数据' });
            } else if (infoEl) {
                infoEl.textContent = 'Steam 数据刷新失败，请稍后重试';
            }
        }
    } catch (e) {
        console.error('刷新 Steam 时长失败', e);
        if (AppState.user && AppState.user.steamId) {
            applySteamPanelUI({ syncError: '网络异常，已显示上次保存的数据' });
        } else if (infoEl) {
            infoEl.textContent = 'Steam 数据刷新失败，请检查网络';
        }
    } finally {
        if (refreshBtn) {
            refreshBtn.disabled = !(AppState.user && AppState.user.steamId);
            refreshBtn.innerHTML = refreshBtn.classList.contains('steam-refresh-btn')
                ? '<i class="fas fa-sync-alt"></i>'
                : '刷新游戏时长';
        }
    }
}

// 处理注册
async function handleRegister(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('registerSubmitBtn');
    
    const formData = new FormData();
    formData.append('username', document.getElementById('regUsername').value);
    formData.append('nickname', document.getElementById('regNickname').value);
    formData.append('password', document.getElementById('regPassword').value);
    formData.append('email', document.getElementById('regEmail').value);
    
    if (!formData.get('username') || !formData.get('nickname') || !formData.get('password')) {
        alert('请填写必填字段');
        return;
    }
    
    try {
        setAuthSubmitLoading(submitBtn, true, '注册中…');
        const response = await fetch(`${AppState.managementApiUrl}/api/user/register`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            console.log('注册成功，用户数据:', result.data);
            const username = formData.get('username');
            const password = formData.get('password');
            // 注册成功后直接登录进站，不弹提示
            const loginResp = await fetch(`${AppState.managementApiUrl}/api/user/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const loginResult = await loginResp.json();
            if (loginResult.code === 200) {
                AppState.isLoggedIn = true;
                AppState.user = loginResult.data;
                updateUserInterface();
                closeRegisterModal();
                closeLoginModal();
                closeAboutTfhers();
                await bootstrapAppAfterAuth();
            } else {
                closeRegisterModal();
                showLoginModal();
                if (document.getElementById('loginUsername')) document.getElementById('loginUsername').value = username;
            }
        } else {
            alert('注册失败：' + apiErrorMessage(result, response, '注册失败'));
        }
    } catch (error) {
        console.error('注册错误:', error);
        alert('注册失败，请检查网络连接');
    } finally {
        setAuthSubmitLoading(submitBtn, false);
    }
}

// 登出
async function logout() {
    // 停止 Steam 时长自动轮询
    if (AppState.steamPlaytimeIntervalId) {
        clearInterval(AppState.steamPlaytimeIntervalId);
        AppState.steamPlaytimeIntervalId = null;
    }

    AppState.isLoggedIn = false;
    AppState.user = null;
    localStorage.removeItem('user');
    updateUserInterface();
    if (typeof showAuthEntryActions === 'function') showAuthEntryActions();
    
    if (AppState.currentPage === 'lobby' && typeof loadLobbyContent === 'function') {
        loadLobbyContent();
    }
    
    // 重新加载文章数据（因为现在未登录用户也能查看文章）
    await loadArticles();
    renderArticles(AppState.articles);
    
    alert('已退出登录');
}

// 检查登录状态
function checkLoginStatus() {
    // 这里可以从localStorage或cookie中检查登录状态
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        AppState.user = JSON.parse(savedUser);
        AppState.isLoggedIn = true;
        updateUserInterface();
    } else {
        AppState.isLoggedIn = false;
        AppState.user = null;
        updateUserInterface();
    }
}

function showProfileSettings() {
    openProfileSettings();
}

/** ---------- 个人设置 ---------- */
let profileSettingsOriginal = null;
let appToastTimer = null;

function showAppToast(message, type) {
    const el = document.getElementById('appToast');
    if (!el) {
        alert(message);
        return;
    }
    el.textContent = message;
    el.className = 'app-toast show' + (type ? ' ' + type : '');
    if (appToastTimer) clearTimeout(appToastTimer);
    appToastTimer = setTimeout(() => {
        el.classList.remove('show');
    }, 2800);
}

/** 站点风格确认弹窗，返回 Promise<boolean> */
function showAppConfirm(options) {
    const opts = options || {};
    const title = opts.title || '确认操作';
    const message = opts.message || '确定要继续吗？';
    const confirmText = opts.confirmText || '确定';
    const cancelText = opts.cancelText || '取消';
    const danger = !!opts.danger;

    return new Promise((resolve) => {
        const modal = document.getElementById('appConfirmModal');
        if (!modal) {
            resolve(window.confirm(message));
            return;
        }
        const titleEl = document.getElementById('appConfirmTitle');
        const msgEl = document.getElementById('appConfirmMessage');
        const okBtn = document.getElementById('appConfirmOkBtn');
        const cancelBtn = document.getElementById('appConfirmCancelBtn');
        const closeBtn = document.getElementById('appConfirmCloseBtn');
        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        if (okBtn) {
            okBtn.textContent = confirmText;
            okBtn.className = 'btn ' + (danger ? 'btn-secondary' : 'btn-primary') + ' app-confirm-ok';
        }
        if (cancelBtn) cancelBtn.textContent = cancelText;

        const cleanup = (result) => {
            modal.classList.remove('show');
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
            modal.onclick = null;
            if (okBtn) okBtn.onclick = null;
            if (cancelBtn) cancelBtn.onclick = null;
            if (closeBtn) closeBtn.onclick = null;
            document.removeEventListener('keydown', onKey);
            resolve(result);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') cleanup(false);
        };

        if (okBtn) okBtn.onclick = () => cleanup(true);
        if (cancelBtn) cancelBtn.onclick = () => cleanup(false);
        if (closeBtn) closeBtn.onclick = () => cleanup(false);
        modal.onclick = (e) => { if (e.target === modal) cleanup(false); };
        document.addEventListener('keydown', onKey);

        modal.style.display = 'flex';
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        if (okBtn) okBtn.focus();
    });
}

function openProfileSettings() {
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
        showAppToast('请先登录', 'error');
        showLoginModal();
        return;
    }
    // 设置已改为独立页面（不再用模态框作为主入口）
    fillProfileSettingsForm(AppState.user);
    if (typeof loadNotifyPrefsIntoForm === 'function') loadNotifyPrefsIntoForm();
    if (typeof loadThemePrefsIntoForm === 'function') loadThemePrefsIntoForm();
    if (typeof refreshSettingsBindPanel === 'function') refreshSettingsBindPanel();
    refreshProfileIntoSettings();
    showPage('settings');
    try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        window.scrollTo(0, 0);
    }
}

function closeProfileSettings() {
    const modal = document.getElementById('profileSettingsModal');
    if (!modal) return;
    if (typeof closeAvatarCropModal === 'function') {
        const cropModal = document.getElementById('avatarCropModal');
        if (cropModal && (cropModal.classList.contains('show') || cropModal.style.display === 'block')) {
            closeAvatarCropModal();
        }
    }
    modal.classList.remove('show');
    modal.style.display = 'none';
    if (typeof unlockBodyScroll === 'function') unlockBodyScroll();
    const fileInput = document.getElementById('settingsAvatarFile');
    if (fileInput) fileInput.value = '';
}

function switchSettingsTab(tab) {
    // legacy aliases → account
    if (tab === 'basic' || tab === 'avatar' || tab === 'password') tab = 'account';
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-settings-tab') === tab);
    });
    document.querySelectorAll('.settings-tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    const map = {
        account: 'settingsAccountTab',
        notify: 'settingsNotifyTab',
        bind: 'settingsBindTab',
        content: 'settingsContentTab',
        basic: 'settingsAccountTab',
        avatar: 'settingsAccountTab',
        password: 'settingsAccountTab'
    };
    const panel = document.getElementById(map[tab] || 'settingsAccountTab');
    if (panel) panel.classList.add('active');
    const modalContent = document.querySelector('#profileSettingsModal .profile-settings-modal-content');
    if (modalContent) {
        modalContent.classList.toggle('settings-wide', tab === 'content');
    }
    if (tab === 'content' && typeof loadMyPublishedContent === 'function') {
        loadMyPublishedContent();
    }
    if (tab === 'bind' && typeof refreshSettingsBindPanel === 'function') {
        refreshSettingsBindPanel();
    }
}

function fillProfileSettingsForm(user) {
    if (!user) return;
    profileSettingsOriginal = {
        nickname: user.nickname || '',
        email: user.email || '',
        phone: user.phone || '',
        signature: user.signature || '',
        avatarUrl: user.avatarUrl || '/images/CSel3_LargePortTianhuo.png'
    };
    const usernameEl = document.getElementById('settingsUsername');
    const nicknameEl = document.getElementById('settingsNickname');
    const emailEl = document.getElementById('settingsEmail');
    const phoneEl = document.getElementById('settingsPhone');
    const signatureEl = document.getElementById('settingsSignature');
    const avatarEl = document.getElementById('settingsCurrentAvatar');
    if (usernameEl) usernameEl.value = user.username || '';
    if (nicknameEl) nicknameEl.value = profileSettingsOriginal.nickname;
    if (emailEl) emailEl.value = profileSettingsOriginal.email;
    if (phoneEl) phoneEl.value = profileSettingsOriginal.phone;
    if (signatureEl) {
        signatureEl.value = profileSettingsOriginal.signature;
        if (typeof updateSignatureCount === 'function') updateSignatureCount();
    }
    if (avatarEl) avatarEl.src = profileSettingsOriginal.avatarUrl || '/images/CSel3_LargePortTianhuo.png';
}

function updateSignatureCount() {
    const signatureEl = document.getElementById('settingsSignature');
    const countEl = document.getElementById('settingsSignatureCount');
    if (signatureEl && countEl) {
        countEl.textContent = String((signatureEl.value || '').length);
    }
}

async function refreshProfileIntoSettings() {
    try {
        const r = await fetch(`${AppState.managementApiUrl}/api/user/profile`, {
            headers: { 'Authorization': `Bearer ${AppState.user.token}` }
        });
        const result = await r.json();
        if (result.code === 200 && result.data) {
            const d = result.data;
            ['nickname', 'email', 'phone', 'signature', 'avatarUrl', 'username', 'gender', 'birthday', 'coverUrl'].forEach(k => {
                if (k in d && d[k] != null) AppState.user[k] = d[k];
            });
            localStorage.setItem('user', JSON.stringify(AppState.user));
            fillProfileSettingsForm(AppState.user);
            if (typeof updateUserInterface === 'function') updateUserInterface();
        }
    } catch (e) {
        console.warn('刷新个人资料失败', e);
    }
}

function resetProfileBasicForm() {
    if (!profileSettingsOriginal) return;
    const nicknameEl = document.getElementById('settingsNickname');
    const emailEl = document.getElementById('settingsEmail');
    const phoneEl = document.getElementById('settingsPhone');
    const signatureEl = document.getElementById('settingsSignature');
    if (nicknameEl) nicknameEl.value = profileSettingsOriginal.nickname || '';
    if (emailEl) emailEl.value = profileSettingsOriginal.email || '';
    if (phoneEl) phoneEl.value = profileSettingsOriginal.phone || '';
    if (signatureEl) {
        signatureEl.value = profileSettingsOriginal.signature || '';
        updateSignatureCount();
    }
}

function resetProfilePasswordForm() {
    const form = document.getElementById('profilePasswordForm');
    if (form) form.reset();
}

async function saveProfileBasic() {
    if (!AppState.user || !AppState.user.token) {
        showAppToast('请先登录', 'error');
        return;
    }
    const emailEl = document.getElementById('settingsEmail');
    const nicknameEl = document.getElementById('settingsNickname');
    const phoneEl = document.getElementById('settingsPhone');
    const signatureEl = document.getElementById('settingsSignature');
    const email = (emailEl?.value || '').trim();
    // 设置页仅编辑邮箱时，其余字段沿用当前用户资料，避免被空值覆盖
    const nickname = (nicknameEl?.value || AppState.user.nickname || profileSettingsOriginal?.nickname || '').trim();
    const phone = (phoneEl?.value || AppState.user.phone || profileSettingsOriginal?.phone || '').trim();
    const signature = (signatureEl?.value || AppState.user.signature || profileSettingsOriginal?.signature || '').trim();
    if (!nickname) {
        showAppToast('昵称不能为空', 'error');
        return;
    }
    const btn = document.getElementById('saveProfileBasicBtn');
    if (btn) btn.disabled = true;
    try {
        const response = await fetch(`${AppState.managementApiUrl}/api/user/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${AppState.user.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nickname, email, phone, signature })
        });
        const result = await response.json();
        if (result.code === 200) {
            const d = result.data || {};
            AppState.user.nickname = d.nickname != null ? d.nickname : nickname;
            AppState.user.email = d.email != null ? d.email : email;
            AppState.user.phone = d.phone != null ? d.phone : phone;
            AppState.user.signature = d.signature != null ? d.signature : signature;
            if (d.avatarUrl) AppState.user.avatarUrl = d.avatarUrl;
            localStorage.setItem('user', JSON.stringify(AppState.user));
            fillProfileSettingsForm(AppState.user);
            if (typeof updateUserInterface === 'function') updateUserInterface();
            showAppToast('个人信息已保存', 'success');
        } else {
            showAppToast(result.msg || '保存失败', 'error');
        }
    } catch (e) {
        console.error(e);
        showAppToast('保存失败，请稍后重试', 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function saveProfilePassword() {
    if (!AppState.user || !AppState.user.token) {
        showAppToast('请先登录', 'error');
        return;
    }
    const oldPassword = document.getElementById('settingsOldPassword')?.value || '';
    const newPassword = document.getElementById('settingsNewPassword')?.value || '';
    const confirmPassword = document.getElementById('settingsConfirmPassword')?.value || '';
    if (!oldPassword || !newPassword) {
        showAppToast('请填写完整密码信息', 'error');
        return;
    }
    if (newPassword.length < 6) {
        showAppToast('新密码长度不能少于6位', 'error');
        return;
    }
    if (newPassword !== confirmPassword) {
        showAppToast('新密码和确认密码不一致', 'error');
        return;
    }
    const btn = document.getElementById('saveProfilePasswordBtn');
    if (btn) btn.disabled = true;
    try {
        const response = await fetch(`${AppState.managementApiUrl}/api/user/password`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${AppState.user.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ oldPassword, newPassword, confirmPassword })
        });
        const result = await response.json();
        if (result.code === 200) {
            resetProfilePasswordForm();
            showAppToast('密码修改成功', 'success');
        } else {
            showAppToast(result.msg || '修改密码失败', 'error');
        }
    } catch (e) {
        console.error(e);
        showAppToast('修改密码失败，请稍后重试', 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

/** ---------- 头像裁剪（Steam 式：拖拽 + 缩放 → 方形上传） ---------- */
const AvatarCrop = {
    VIEW: 280,
    OUT: 512,
    img: null,
    objectUrl: null,
    natW: 0,
    natH: 0,
    baseScale: 1,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
    bound: false
};

function onSettingsAvatarFileChange(event) {
    const input = event && event.target;
    const file = input && input.files && input.files[0];
    if (!file) return;
    if (!AppState.user || !AppState.user.token) {
        showAppToast('请先登录', 'error');
        if (input) input.value = '';
        return;
    }
    if (!file.type || !file.type.startsWith('image/')) {
        showAppToast('只能上传图片文件', 'error');
        if (input) input.value = '';
        return;
    }
    // 原图可稍大；裁剪后再限制上传体积
    if (file.size > 20 * 1024 * 1024) {
        showAppToast('图片过大，请选择 20MB 以内的图片', 'error');
        if (input) input.value = '';
        return;
    }
    openAvatarCropModal(file);
}

function openAvatarCropModal(file) {
    const modal = document.getElementById('avatarCropModal');
    const imgEl = document.getElementById('avatarCropImage');
    const zoomEl = document.getElementById('avatarCropZoom');
    if (!modal || !imgEl) return;

    closeAvatarCropResources();
    AvatarCrop.objectUrl = URL.createObjectURL(file);
    AvatarCrop.zoom = 1;
    if (zoomEl) zoomEl.value = '100';

    imgEl.onload = function () {
        AvatarCrop.img = imgEl;
        AvatarCrop.natW = imgEl.naturalWidth || imgEl.width;
        AvatarCrop.natH = imgEl.naturalHeight || imgEl.height;
        if (!AvatarCrop.natW || !AvatarCrop.natH) {
            showAppToast('无法读取图片尺寸', 'error');
            closeAvatarCropModal();
            return;
        }
        const vp = document.getElementById('avatarCropViewport');
        if (vp) {
            const rect = vp.getBoundingClientRect();
            if (rect.width > 0) AvatarCrop.VIEW = Math.round(rect.width);
        }
        AvatarCrop.baseScale = Math.max(
            AvatarCrop.VIEW / AvatarCrop.natW,
            AvatarCrop.VIEW / AvatarCrop.natH
        );
        AvatarCrop.zoom = 1;
        // 居中
        const dw = AvatarCrop.natW * AvatarCrop.baseScale * AvatarCrop.zoom;
        const dh = AvatarCrop.natH * AvatarCrop.baseScale * AvatarCrop.zoom;
        AvatarCrop.offsetX = (AvatarCrop.VIEW - dw) / 2;
        AvatarCrop.offsetY = (AvatarCrop.VIEW - dh) / 2;
        clampAvatarCropOffset();
        applyAvatarCropTransform();
        updateAvatarCropPreview();
        bindAvatarCropEvents();
    };
    imgEl.onerror = function () {
        showAppToast('图片加载失败', 'error');
        closeAvatarCropModal();
    };

    modal.classList.add('show');
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    // 先显示再赋 src，保证视口尺寸可读（含缓存图即时 onload）
    imgEl.src = AvatarCrop.objectUrl;
}

function closeAvatarCropResources() {
    const imgEl = document.getElementById('avatarCropImage');
    if (imgEl) {
        imgEl.onload = null;
        imgEl.onerror = null;
        imgEl.removeAttribute('src');
    }
    if (AvatarCrop.objectUrl) {
        try { URL.revokeObjectURL(AvatarCrop.objectUrl); } catch (_) {}
        AvatarCrop.objectUrl = null;
    }
    AvatarCrop.img = null;
}

function closeAvatarCropModal() {
    const modal = document.getElementById('avatarCropModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }
    const viewport = document.getElementById('avatarCropViewport');
    if (viewport) viewport.classList.remove('is-dragging');
    AvatarCrop.dragging = false;
    closeAvatarCropResources();
    const fileInput = document.getElementById('settingsAvatarFile');
    if (fileInput) fileInput.value = '';
    const btn = document.getElementById('confirmAvatarCropBtn');
    if (btn) btn.disabled = false;
}

function displayScale() {
    return AvatarCrop.baseScale * AvatarCrop.zoom;
}

function clampAvatarCropOffset() {
    const s = displayScale();
    const dw = AvatarCrop.natW * s;
    const dh = AvatarCrop.natH * s;
    const minX = AvatarCrop.VIEW - dw;
    const minY = AvatarCrop.VIEW - dh;
    // 图片必须始终盖住裁剪框
    if (dw <= AvatarCrop.VIEW) {
        AvatarCrop.offsetX = (AvatarCrop.VIEW - dw) / 2;
    } else {
        AvatarCrop.offsetX = Math.min(0, Math.max(minX, AvatarCrop.offsetX));
    }
    if (dh <= AvatarCrop.VIEW) {
        AvatarCrop.offsetY = (AvatarCrop.VIEW - dh) / 2;
    } else {
        AvatarCrop.offsetY = Math.min(0, Math.max(minY, AvatarCrop.offsetY));
    }
}

function applyAvatarCropTransform() {
    const imgEl = document.getElementById('avatarCropImage');
    if (!imgEl || !AvatarCrop.natW) return;
    const s = displayScale();
    const dw = AvatarCrop.natW * s;
    const dh = AvatarCrop.natH * s;
    imgEl.style.width = dw + 'px';
    imgEl.style.height = dh + 'px';
    imgEl.style.transform = `translate(${AvatarCrop.offsetX}px, ${AvatarCrop.offsetY}px)`;
}

function updateAvatarCropPreview() {
    const canvas = document.getElementById('avatarCropPreview');
    if (!canvas || !AvatarCrop.natW) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = displayScale();
    const sx = (-AvatarCrop.offsetX) / s;
    const sy = (-AvatarCrop.offsetY) / s;
    const size = AvatarCrop.VIEW / s;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    try {
        ctx.drawImage(
            document.getElementById('avatarCropImage'),
            sx, sy, size, size,
            0, 0, canvas.width, canvas.height
        );
    } catch (e) {
        console.warn('preview draw failed', e);
    }
}

function setAvatarCropZoomFromSlider(percent) {
    const next = Math.max(1, Math.min(3, (Number(percent) || 100) / 100));
    const oldS = displayScale();
    const cx = AvatarCrop.VIEW / 2;
    const cy = AvatarCrop.VIEW / 2;
    // 以视口中心为锚点缩放
    const imgCX = (cx - AvatarCrop.offsetX) / oldS;
    const imgCY = (cy - AvatarCrop.offsetY) / oldS;
    AvatarCrop.zoom = next;
    const newS = displayScale();
    AvatarCrop.offsetX = cx - imgCX * newS;
    AvatarCrop.offsetY = cy - imgCY * newS;
    clampAvatarCropOffset();
    applyAvatarCropTransform();
    updateAvatarCropPreview();
}

function bindAvatarCropEvents() {
    if (AvatarCrop.bound) return;
    AvatarCrop.bound = true;

    const viewport = document.getElementById('avatarCropViewport');
    const zoomEl = document.getElementById('avatarCropZoom');
    const modal = document.getElementById('avatarCropModal');

    if (viewport) {
        viewport.addEventListener('pointerdown', function (e) {
            if (!AvatarCrop.img) return;
            AvatarCrop.dragging = true;
            AvatarCrop.lastX = e.clientX;
            AvatarCrop.lastY = e.clientY;
            viewport.classList.add('is-dragging');
            try { viewport.setPointerCapture(e.pointerId); } catch (_) {}
            e.preventDefault();
        });
        viewport.addEventListener('pointermove', function (e) {
            if (!AvatarCrop.dragging) return;
            const dx = e.clientX - AvatarCrop.lastX;
            const dy = e.clientY - AvatarCrop.lastY;
            AvatarCrop.lastX = e.clientX;
            AvatarCrop.lastY = e.clientY;
            AvatarCrop.offsetX += dx;
            AvatarCrop.offsetY += dy;
            clampAvatarCropOffset();
            applyAvatarCropTransform();
            updateAvatarCropPreview();
        });
        const endDrag = function (e) {
            if (!AvatarCrop.dragging) return;
            AvatarCrop.dragging = false;
            viewport.classList.remove('is-dragging');
            try { viewport.releasePointerCapture(e.pointerId); } catch (_) {}
        };
        viewport.addEventListener('pointerup', endDrag);
        viewport.addEventListener('pointercancel', endDrag);

        viewport.addEventListener('wheel', function (e) {
            if (!AvatarCrop.img) return;
            e.preventDefault();
            const zoomEl2 = document.getElementById('avatarCropZoom');
            let pct = zoomEl2 ? Number(zoomEl2.value) : AvatarCrop.zoom * 100;
            pct += e.deltaY < 0 ? 8 : -8;
            pct = Math.max(100, Math.min(300, pct));
            if (zoomEl2) zoomEl2.value = String(pct);
            setAvatarCropZoomFromSlider(pct);
        }, { passive: false });
    }

    if (zoomEl) {
        zoomEl.addEventListener('input', function () {
            setAvatarCropZoomFromSlider(zoomEl.value);
        });
    }

    // 仅通过关闭/取消按钮关闭，不响应遮罩点击
}

function getCroppedAvatarBlob() {
    return new Promise(function (resolve, reject) {
        if (!AvatarCrop.natW) {
            reject(new Error('no image'));
            return;
        }
        const s = displayScale();
        const sx = (-AvatarCrop.offsetX) / s;
        const sy = (-AvatarCrop.offsetY) / s;
        const size = AvatarCrop.VIEW / s;
        const canvas = document.createElement('canvas');
        canvas.width = AvatarCrop.OUT;
        canvas.height = AvatarCrop.OUT;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error('canvas unsupported'));
            return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        const imgEl = document.getElementById('avatarCropImage');
        ctx.drawImage(imgEl, sx, sy, size, size, 0, 0, AvatarCrop.OUT, AvatarCrop.OUT);

        const tryJpeg = function (quality) {
            canvas.toBlob(function (blob) {
                if (!blob) {
                    reject(new Error('toBlob failed'));
                    return;
                }
                if (blob.size > 5 * 1024 * 1024 && quality > 0.55) {
                    tryJpeg(quality - 0.1);
                    return;
                }
                resolve(blob);
            }, 'image/jpeg', quality);
        };
        tryJpeg(0.92);
    });
}

async function confirmAvatarCrop() {
    if (!AppState.user || !AppState.user.token) {
        showAppToast('请先登录', 'error');
        return;
    }
    if (!AvatarCrop.natW) {
        showAppToast('请先选择图片', 'error');
        return;
    }
    const btn = document.getElementById('confirmAvatarCropBtn');
    if (btn) btn.disabled = true;
    try {
        const blob = await getCroppedAvatarBlob();
        if (blob.size > 5 * 1024 * 1024) {
            showAppToast('裁剪后仍超过 5MB，请缩小原图后再试', 'error');
            return;
        }
        const formData = new FormData();
        formData.append('file', blob, 'avatar.jpg');
        const response = await fetch(`${AppState.managementApiUrl}/api/user/upload-avatar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${AppState.user.token}` },
            body: formData
        });
        const result = await response.json();
        if (result.code === 200) {
            const avatarUrl = typeof result.data === 'string' ? result.data : (result.data && result.data.avatarUrl);
            if (avatarUrl) {
                AppState.user.avatarUrl = avatarUrl;
                localStorage.setItem('user', JSON.stringify(AppState.user));
                const settingsAvatar = document.getElementById('settingsCurrentAvatar');
                if (settingsAvatar) settingsAvatar.src = avatarUrl;
                const editAvatar = document.getElementById('editProfileAvatar');
                if (editAvatar) editAvatar.src = avatarUrl;
                const profileAvatar = document.getElementById('profileAvatar');
                if (profileAvatar) profileAvatar.src = avatarUrl;
                if (typeof updateUserInterface === 'function') updateUserInterface();
                if (typeof fillProfilePage === 'function') fillProfilePage(AppState.user);
            }
            showAppToast('头像上传成功', 'success');
            closeAvatarCropModal();
        } else {
            showAppToast(result.msg || '头像上传失败', 'error');
        }
    } catch (e) {
        console.error(e);
        showAppToast('头像上传失败', 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

/** 兼容旧调用名：改为触发文件选择 */

/** ---------- 封面裁切（3:1，拖动 + 缩放） ---------- */
const CoverCrop = {
    VIEW_W: 480,
    VIEW_H: 160,
    OUT_W: 1500,
    OUT_H: 500,
    img: null,
    objectUrl: null,
    natW: 0,
    natH: 0,
    baseScale: 1,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
    bound: false
};

function openCoverCropModal(file) {
    const modal = document.getElementById('coverCropModal');
    const imgEl = document.getElementById('coverCropImage');
    const zoomEl = document.getElementById('coverCropZoom');
    if (!modal || !imgEl) return;

    closeCoverCropResources();
    CoverCrop.objectUrl = URL.createObjectURL(file);
    CoverCrop.zoom = 1;
    if (zoomEl) zoomEl.value = '100';

    imgEl.onload = function () {
        CoverCrop.img = imgEl;
        CoverCrop.natW = imgEl.naturalWidth || imgEl.width;
        CoverCrop.natH = imgEl.naturalHeight || imgEl.height;
        if (!CoverCrop.natW || !CoverCrop.natH) {
            showAppToast('\u65e0\u6cd5\u8bfb\u53d6\u56fe\u7247\u5c3a\u5bf8', 'error');
            closeCoverCropModal();
            return;
        }
        const vp = document.getElementById('coverCropViewport');
        if (vp) {
            const rect = vp.getBoundingClientRect();
            if (rect.width > 0) {
                CoverCrop.VIEW_W = Math.round(rect.width);
                CoverCrop.VIEW_H = Math.round(rect.height);
            }
        }
        CoverCrop.baseScale = Math.max(
            CoverCrop.VIEW_W / CoverCrop.natW,
            CoverCrop.VIEW_H / CoverCrop.natH
        );
        CoverCrop.zoom = 1;
        const dw = CoverCrop.natW * CoverCrop.baseScale * CoverCrop.zoom;
        const dh = CoverCrop.natH * CoverCrop.baseScale * CoverCrop.zoom;
        CoverCrop.offsetX = (CoverCrop.VIEW_W - dw) / 2;
        CoverCrop.offsetY = (CoverCrop.VIEW_H - dh) / 2;
        clampCoverCropOffset();
        applyCoverCropTransform();
        updateCoverCropPreview();
        bindCoverCropEvents();
    };
    imgEl.onerror = function () {
        showAppToast('\u56fe\u7247\u52a0\u8f7d\u5931\u8d25', 'error');
        closeCoverCropModal();
    };

    modal.classList.add('show');
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    imgEl.src = CoverCrop.objectUrl;
}

function closeCoverCropResources() {
    const imgEl = document.getElementById('coverCropImage');
    if (imgEl) {
        imgEl.onload = null;
        imgEl.onerror = null;
        imgEl.removeAttribute('src');
    }
    if (CoverCrop.objectUrl) {
        try { URL.revokeObjectURL(CoverCrop.objectUrl); } catch (_) {}
        CoverCrop.objectUrl = null;
    }
    CoverCrop.img = null;
}

function closeCoverCropModal() {
    const modal = document.getElementById('coverCropModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }
    const viewport = document.getElementById('coverCropViewport');
    if (viewport) viewport.classList.remove('is-dragging');
    CoverCrop.dragging = false;
    closeCoverCropResources();
    const fileInput = document.getElementById('editProfileCoverFile');
    if (fileInput) fileInput.value = '';
    const btn = document.getElementById('confirmCoverCropBtn');
    if (btn) btn.disabled = false;
}

function coverDisplayScale() {
    return CoverCrop.baseScale * CoverCrop.zoom;
}

function clampCoverCropOffset() {
    const s = coverDisplayScale();
    const dw = CoverCrop.natW * s;
    const dh = CoverCrop.natH * s;
    const minX = CoverCrop.VIEW_W - dw;
    const minY = CoverCrop.VIEW_H - dh;
    if (dw <= CoverCrop.VIEW_W) {
        CoverCrop.offsetX = (CoverCrop.VIEW_W - dw) / 2;
    } else {
        CoverCrop.offsetX = Math.min(0, Math.max(minX, CoverCrop.offsetX));
    }
    if (dh <= CoverCrop.VIEW_H) {
        CoverCrop.offsetY = (CoverCrop.VIEW_H - dh) / 2;
    } else {
        CoverCrop.offsetY = Math.min(0, Math.max(minY, CoverCrop.offsetY));
    }
}

function applyCoverCropTransform() {
    const imgEl = document.getElementById('coverCropImage');
    if (!imgEl || !CoverCrop.natW) return;
    const s = coverDisplayScale();
    const dw = CoverCrop.natW * s;
    const dh = CoverCrop.natH * s;
    imgEl.style.width = dw + 'px';
    imgEl.style.height = dh + 'px';
    imgEl.style.transform = `translate(${CoverCrop.offsetX}px, ${CoverCrop.offsetY}px)`;
}

function updateCoverCropPreview() {
    const canvas = document.getElementById('coverCropPreview');
    if (!canvas || !CoverCrop.natW) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = coverDisplayScale();
    const sx = (-CoverCrop.offsetX) / s;
    const sy = (-CoverCrop.offsetY) / s;
    const sw = CoverCrop.VIEW_W / s;
    const sh = CoverCrop.VIEW_H / s;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    try {
        ctx.drawImage(
            document.getElementById('coverCropImage'),
            sx, sy, sw, sh,
            0, 0, canvas.width, canvas.height
        );
    } catch (e) {
        console.warn('cover preview draw failed', e);
    }
}

function setCoverCropZoomFromSlider(percent) {
    const next = Math.max(1, Math.min(3, (Number(percent) || 100) / 100));
    const oldS = coverDisplayScale();
    const cx = CoverCrop.VIEW_W / 2;
    const cy = CoverCrop.VIEW_H / 2;
    const imgCX = (cx - CoverCrop.offsetX) / oldS;
    const imgCY = (cy - CoverCrop.offsetY) / oldS;
    CoverCrop.zoom = next;
    const newS = coverDisplayScale();
    CoverCrop.offsetX = cx - imgCX * newS;
    CoverCrop.offsetY = cy - imgCY * newS;
    clampCoverCropOffset();
    applyCoverCropTransform();
    updateCoverCropPreview();
}

function bindCoverCropEvents() {
    if (CoverCrop.bound) return;
    CoverCrop.bound = true;

    const viewport = document.getElementById('coverCropViewport');
    const zoomEl = document.getElementById('coverCropZoom');

    if (viewport) {
        viewport.addEventListener('pointerdown', function (e) {
            if (!CoverCrop.img) return;
            CoverCrop.dragging = true;
            CoverCrop.lastX = e.clientX;
            CoverCrop.lastY = e.clientY;
            viewport.classList.add('is-dragging');
            try { viewport.setPointerCapture(e.pointerId); } catch (_) {}
            e.preventDefault();
        });
        viewport.addEventListener('pointermove', function (e) {
            if (!CoverCrop.dragging) return;
            const dx = e.clientX - CoverCrop.lastX;
            const dy = e.clientY - CoverCrop.lastY;
            CoverCrop.lastX = e.clientX;
            CoverCrop.lastY = e.clientY;
            CoverCrop.offsetX += dx;
            CoverCrop.offsetY += dy;
            clampCoverCropOffset();
            applyCoverCropTransform();
            updateCoverCropPreview();
        });
        const endDrag = function (e) {
            if (!CoverCrop.dragging) return;
            CoverCrop.dragging = false;
            viewport.classList.remove('is-dragging');
            try { viewport.releasePointerCapture(e.pointerId); } catch (_) {}
        };
        viewport.addEventListener('pointerup', endDrag);
        viewport.addEventListener('pointercancel', endDrag);

        viewport.addEventListener('wheel', function (e) {
            if (!CoverCrop.img) return;
            e.preventDefault();
            const zoomEl2 = document.getElementById('coverCropZoom');
            let pct = zoomEl2 ? Number(zoomEl2.value) : CoverCrop.zoom * 100;
            pct += e.deltaY < 0 ? 8 : -8;
            pct = Math.max(100, Math.min(300, pct));
            if (zoomEl2) zoomEl2.value = String(pct);
            setCoverCropZoomFromSlider(pct);
        }, { passive: false });
    }

    if (zoomEl) {
        zoomEl.addEventListener('input', function () {
            setCoverCropZoomFromSlider(zoomEl.value);
        });
    }
}

function getCroppedCoverBlob() {
    return new Promise(function (resolve, reject) {
        if (!CoverCrop.natW) {
            reject(new Error('no image'));
            return;
        }
        const s = coverDisplayScale();
        const sx = (-CoverCrop.offsetX) / s;
        const sy = (-CoverCrop.offsetY) / s;
        const sw = CoverCrop.VIEW_W / s;
        const sh = CoverCrop.VIEW_H / s;
        const canvas = document.createElement('canvas');
        canvas.width = CoverCrop.OUT_W;
        canvas.height = CoverCrop.OUT_H;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error('canvas unsupported'));
            return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        const imgEl = document.getElementById('coverCropImage');
        ctx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, CoverCrop.OUT_W, CoverCrop.OUT_H);

        const tryJpeg = function (quality) {
            canvas.toBlob(function (blob) {
                if (!blob) {
                    reject(new Error('toBlob failed'));
                    return;
                }
                if (blob.size > 8 * 1024 * 1024 && quality > 0.55) {
                    tryJpeg(quality - 0.1);
                    return;
                }
                resolve(blob);
            }, 'image/jpeg', quality);
        };
        tryJpeg(0.9);
    });
}

async function confirmCoverCrop() {
    if (!AppState.user || !AppState.user.token) {
        showAppToast('\u8bf7\u5148\u767b\u5f55', 'error');
        return;
    }
    if (!CoverCrop.natW) {
        showAppToast('\u8bf7\u5148\u9009\u62e9\u56fe\u7247', 'error');
        return;
    }
    const btn = document.getElementById('confirmCoverCropBtn');
    if (btn) btn.disabled = true;
    try {
        const blob = await getCroppedCoverBlob();
        if (blob.size > 8 * 1024 * 1024) {
            showAppToast('\u88c1\u526a\u540e\u4ecd\u8d85\u8fc7 8MB\uff0c\u8bf7\u7f29\u5c0f\u539f\u56fe\u540e\u518d\u8bd5', 'error');
            return;
        }
        const formData = new FormData();
        formData.append('file', blob, 'cover.jpg');
        showAppToast('\u6b63\u5728\u4e0a\u4f20\u5c01\u9762\u2026', 'info');
        const response = await fetch(`${AppState.managementApiUrl}/api/user/upload-cover`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${AppState.user.token}` },
            body: formData
        });
        const result = await response.json();
        if (result.code === 200) {
            const url = typeof result.data === 'string' ? result.data : (result.data && result.data.coverUrl);
            if (url) {
                AppState._editCoverUrl = url;
                AppState._editCoverCleared = false;
                AppState.user.coverUrl = url;
                localStorage.setItem('user', JSON.stringify(AppState.user));
                const coverPrev = document.getElementById('editProfileCoverPreview');
                const clearBtn = document.getElementById('editProfileCoverClearBtn');
                if (coverPrev) {
                    coverPrev.style.backgroundImage = `url("${url}")`;
                    coverPrev.classList.add('has-image');
                }
                if (clearBtn) clearBtn.style.display = '';
                if (typeof fillProfilePage === 'function') fillProfilePage(AppState.user);
                showAppToast('\u5c01\u9762\u5df2\u4e0a\u4f20', 'success');
            }
            closeCoverCropModal();
        } else {
            showAppToast(result.msg || '\u5c01\u9762\u4e0a\u4f20\u5931\u8d25', 'error');
        }
    } catch (e) {
        console.error(e);
        showAppToast('\u5c01\u9762\u4e0a\u4f20\u5931\u8d25', 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}


function uploadSettingsAvatar() {
    const input = document.getElementById('settingsAvatarFile');
    if (input) input.click();
}

// 设置弹窗：仅签名字数；关闭只用关闭/取消按钮（不点遮罩、不 Esc）
document.addEventListener('DOMContentLoaded', function () {
    const signatureEl = document.getElementById('settingsSignature');
    if (signatureEl) {
        signatureEl.addEventListener('input', updateSignatureCount);
    }
});



function updateMyStatsPanel() {
    const articleEl = document.getElementById('myArticleCount');
    const comboEl = document.getElementById('myComboCount');
    const achvEl = document.getElementById('myAchievementCount');
    const playtimeEl = document.getElementById('myPlaytimeHours');
    if (articleEl) articleEl.textContent = String(AppState.myStats.articleCount || 0);
    if (comboEl) comboEl.textContent = String(AppState.myStats.comboCount || 0);

    let achieved = 0;
    let total = 0;
    const a = AppState.user && AppState.user.steamAchievements;
    if (a && typeof a.achieved === 'number' && typeof a.total === 'number') {
        achieved = a.achieved;
        total = a.total;
    } else if (AppState.user) {
        if (typeof AppState.user.steamAchievementsCount === 'number') achieved = AppState.user.steamAchievementsCount;
        if (typeof AppState.user.steamAchievementsTotal === 'number') total = AppState.user.steamAchievementsTotal;
    }
    if (achvEl) achvEl.textContent = `${achieved}/${total}`;
    const bar = document.getElementById('myAchievementBar');
    const pctEl = document.getElementById('myAchievementPct');
    const pct = total > 0 ? Math.round((achieved / total) * 1000) / 10 : 0;
    if (bar) bar.style.width = `${Math.min(100, pct)}%`;
    if (pctEl) pctEl.textContent = total > 0 ? `${pct}%` : '';

    if (playtimeEl) {
        const minutes = AppState.user && AppState.user.steamPlaytimeMinutes != null
            ? Number(AppState.user.steamPlaytimeMinutes) : 0;
        const hours = Math.round((minutes / 60.0) * 10) / 10;
        playtimeEl.textContent = `${hours}h`;
    }

    const u = AppState.user;
    // 可选：若「我的」页仍残留段位节点则更新（数据页已移除）
    const tierEl = document.getElementById('myDataTier');
    const scoreEl = document.getElementById('myDataScore');
    const rankEl = document.getElementById('myDataRank');
    if (u && (tierEl || scoreEl || rankEl)) {
        const raw = String(u.tier || u.tierLabel || '').trim().toUpperCase();
        const m = raw.match(/[SABCD]/);
        const letter = m ? m[0] : null;
        if (tierEl) {
            tierEl.textContent = letter || '—';
            tierEl.className = 'my-data-tier tap-tier' + (letter ? (' tier-' + letter) : '');
        }
        if (scoreEl) {
            scoreEl.textContent = (u.rating != null) ? String(u.rating) : '—';
        }
        if (rankEl) {
            const r = u.siteRank;
            const ok = r != null && r !== '' && String(r) !== '—' && String(r).toLowerCase() !== 'null';
            rankEl.textContent = ok ? ('#' + r) : '#—';
        }
    }

    // Steam 卡片：头像 / 名称 / 等级 / 好友代码 / 时长 / 成就
    const boundEl = document.getElementById('myDataSteamBound');
    const unboundEl = document.getElementById('myDataSteamUnbound');
    const refreshBtn = document.getElementById('myDataSteamRefreshBtn');
    const steamId = u && u.steamId;
    if (boundEl && unboundEl) {
        if (steamId) {
            boundEl.style.display = '';
            unboundEl.style.display = 'none';
            if (refreshBtn) refreshBtn.style.display = 'inline-flex';
            const av = document.getElementById('myDataSteamAvatar');
            const nameEl = document.getElementById('myDataSteamName');
            const levelEl = document.getElementById('myDataSteamLevel');
            const friendEl = document.getElementById('myDataSteamFriendCode');
            if (av) {
                const url = u.steamAvatarUrl || '';
                if (url) {
                    av.src = url;
                    av.style.display = '';
                } else {
                    av.removeAttribute('src');
                    av.style.display = 'none';
                }
            }
            if (nameEl) nameEl.textContent = u.steamPersonaName || ('ID ' + steamId);
            if (levelEl) {
                levelEl.textContent = (u.steamLevel != null && u.steamLevel !== '') ? String(u.steamLevel) : '—';
            }
            if (friendEl) {
                // Steam 客户端「好友代码」= AccountID = steamid64 - 76561197960265728
                // Web API 不返回该字段，但可由已存 steamId 直接换算
                try {
                    const sid = BigInt(String(steamId));
                    const accountId = sid - 76561197960265728n;
                    friendEl.textContent = accountId > 0n ? String(accountId) : '—';
                } catch (e) {
                    const n = Number(steamId);
                    friendEl.textContent = (Number.isFinite(n) && n > 76561197960265728)
                        ? String(n - 76561197960265728) : '—';
                }
            }
        } else {
            boundEl.style.display = 'none';
            unboundEl.style.display = '';
            if (refreshBtn) refreshBtn.style.display = 'none';
        }
    }

    if (typeof updateTopAccountPanel === 'function') updateTopAccountPanel();
}

function refreshMyArticleStats() {
    if (!AppState.user) return;
    const names = [AppState.user.nickname, AppState.user.username]
        .map(v => (v || '').toString().trim())
        .filter(Boolean);
    if (!names.length || !Array.isArray(AppState.articles)) {
        AppState.myStats.articleCount = 0;
        updateMyStatsPanel();
        return;
    }
    AppState.myStats.articleCount = AppState.articles.filter(a => {
        const author = (a && a.author ? String(a.author) : '').trim();
        return author && names.some(n => n === author);
    }).length;
    updateMyStatsPanel();
}

async function refreshMyComboStats() {
    if (!AppState.user || !Array.isArray(AppState.characters) || AppState.characters.length === 0) {
        AppState.myStats.comboCount = 0;
        updateMyStatsPanel();
        return;
    }
    const names = [AppState.user.nickname, AppState.user.username]
        .map(v => (v || '').toString().trim())
        .filter(Boolean);
    if (!names.length) {
        AppState.myStats.comboCount = 0;
        updateMyStatsPanel();
        return;
    }
    try {
        const detailResponses = await Promise.all(
            AppState.characters.map(c => fetch(`${AppState.managementApiUrl}/api/characters/${c.id}`).then(r => r.json()).catch(() => null))
        );
        const comboIdSet = new Set();
        detailResponses.forEach(res => {
            const combos = res && res.code === 200 && res.data && Array.isArray(res.data.userCombos) ? res.data.userCombos : [];
            combos.forEach(combo => {
                const author = (combo.authorName || combo.author_name || '').toString().trim();
                const comboId = combo.id != null ? String(combo.id) : '';
                if (comboId && author && names.some(n => n === author)) {
                    comboIdSet.add(comboId);
                }
            });
        });
        AppState.myStats.comboCount = comboIdSet.size;
    } catch (e) {
        console.warn('统计投稿连段失败', e);
    } finally {
        updateMyStatsPanel();
    }
}

// 更新用户界面
function updateUserInterface() {
    applyAuthEntryGate();
    if (AppState.isLoggedIn && AppState.user) {
        if (elements.loginSection) elements.loginSection.style.display = 'none';
        if (elements.userSection) elements.userSection.style.display = 'block';
        
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        const userSignature = document.getElementById('userSignature');
        
        if (userName) userName.textContent = AppState.user.nickname || AppState.user.username;
        if (userSignature) userSignature.textContent = AppState.user.signature || '这个人很懒，还没有个性签名';

        if (typeof refreshMyRatingBadge === 'function') refreshMyRatingBadge();
        if (userAvatar) {
            const avatarUrl = AppState.user.avatarUrl || '/images/CSel3_LargePortTianhuo.png';
            console.log('设置头像URL:', avatarUrl);
            userAvatar.src = avatarUrl;
            syncTopUserAvatar(avatarUrl);
        }
        // Steam：仅展示本地/库中已有数据；同步 Steam API 仅用户点击「刷新」
        applySteamPanelUI();
        const refreshBtn = document.getElementById('refreshSteamPlaytimeButton');
        if (refreshBtn && !refreshBtn.dataset.bound) {
            refreshBtn.addEventListener('click', () => refreshSteamPlaytime(true));
            refreshBtn.dataset.bound = '1';
        }
        refreshMyArticleStats();
        refreshMyComboStats();
        updateMyStatsPanel();
        if (typeof updateTopAccountPanel === 'function') updateTopAccountPanel();
        // 保存到localStorage
        localStorage.setItem('user', JSON.stringify(AppState.user));
    } else {
        if (elements.loginSection) elements.loginSection.style.display = 'block';
        if (elements.userSection) elements.userSection.style.display = 'none';
        localStorage.removeItem('user');
    }
}

// 显示创建文章

/** Sync top-right chrome avatar with profile avatar / AppState */
function syncTopUserAvatar(explicitUrl) {
    const topAvatar = document.getElementById('topUserAvatar');
    const tapAvatar = document.getElementById('tapAvatar');
    const url = explicitUrl
        || (AppState.user && AppState.user.avatarUrl)
        || '/images/CSel3_LargePortTianhuo.png';
    if (topAvatar) topAvatar.src = url;
    if (tapAvatar) tapAvatar.src = url;
}

function setAppTopActionsVisible(visible) {
    const topbar = document.getElementById('appTopbar');
    const bar = document.getElementById('appTopActions');
    const apply = (el) => {
        if (!el) return;
        if (visible) {
            el.hidden = false;
            el.removeAttribute('hidden');
        } else {
            el.hidden = true;
            el.setAttribute('hidden', '');
        }
    };
    apply(topbar);
    apply(bar);
    if (!visible) {
        closeTopPostMenu();
        if (typeof closeTopAccountPanel === 'function') closeTopAccountPanel();
    }
}

function closeTopPostMenu() {
    const wrap = document.querySelector('.top-post-wrap');
    const menu = document.getElementById('topPostMenu');
    const btn = document.getElementById('topPostBtn');
    if (wrap) wrap.classList.remove('is-open');
    if (menu) menu.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
}

function toggleTopPostMenu() {
    const wrap = document.querySelector('.top-post-wrap');
    const menu = document.getElementById('topPostMenu');
    const btn = document.getElementById('topPostBtn');
    if (!wrap || !menu) return;
    const open = !wrap.classList.contains('is-open');
    if (open) {
        wrap.classList.add('is-open');
        menu.hidden = false;
        if (btn) btn.setAttribute('aria-expanded', 'true');
    } else {
        closeTopPostMenu();
    }
}

function refreshSettingsBindPanel() {
    const emailEl = document.getElementById('settingsBindEmail');
    const statusEl = document.getElementById('settingsBindSteamStatus');
    const bindBtn = document.getElementById('settingsBindSteamBtn');
    const unbindBtn = document.getElementById('settingsUnbindSteamBtn');
    const u = AppState.user || {};
    if (emailEl) emailEl.value = u.email || '';
    const bound = !!(u.steamId);
    if (statusEl) {
        if (bound) {
            const name = u.steamPersonaName || u.steamId;
            const mins = u.steamPlaytimeMinutes || 0;
            const hours = Math.round((mins / 60) * 10) / 10;
            statusEl.textContent = '已绑定：' + name + (mins ? (' · ' + hours + 'h') : '');
        } else {
            statusEl.textContent = '未绑定';
        }
    }
    if (bindBtn) bindBtn.style.display = bound ? 'none' : '';
    if (unbindBtn) unbindBtn.style.display = bound ? '' : 'none';
}

function updateTopAccountPanel() {
    const u = AppState.user;
    if (!u) return;
    const nick = document.getElementById('tapNickname');
    const uname = document.getElementById('tapUsername');
    const tier = document.getElementById('tapTier');
    const score = document.getElementById('tapScore');
    const rank = document.getElementById('tapRank');
    if (nick) nick.textContent = u.nickname || u.username || '—';
    if (uname) uname.textContent = '@' + (u.username || '—');
    const ratingVal = (u.rating != null) ? u.rating : null;
    const letter = (function () {
        const raw = String(u.tier || u.tierLabel || '').trim().toUpperCase();
        const m = raw.match(/[SABCD]/);
        return m ? m[0] : null;
    })();
    if (tier) {
        tier.textContent = letter || '—';
        tier.className = 'tap-tier' + (letter ? (' tier-' + letter) : '');
    }
    if (score) score.textContent = (ratingVal != null) ? String(ratingVal) : '—';
    if (rank) {
        const r = u.siteRank;
        const ok = r != null && r !== '' && String(r) !== '—' && String(r).toLowerCase() !== 'null';
        rank.textContent = ok ? ('#' + r) : '#—';
    }
    syncTopUserAvatar();
}

function closeTopAccountPanel() {
    const wrap = document.getElementById('topAvatarWrap');
    const panel = document.getElementById('topAccountPanel');
    const btn = document.getElementById('topAvatarBtn');
    if (wrap) wrap.classList.remove('is-open');
    if (panel) panel.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
}

function openTopAccountPanel() {
    const wrap = document.getElementById('topAvatarWrap');
    const panel = document.getElementById('topAccountPanel');
    const btn = document.getElementById('topAvatarBtn');
    if (!wrap || !panel) return;
    closeTopPostMenu();
    updateTopAccountPanel();
    if (typeof refreshMyRatingBadge === 'function') {
        refreshMyRatingBadge().then(() => updateTopAccountPanel()).catch(() => {});
    }
    wrap.classList.add('is-open');
    panel.hidden = false;
    if (btn) btn.setAttribute('aria-expanded', 'true');
}

function toggleTopAccountPanel() {
    const wrap = document.getElementById('topAvatarWrap');
    if (!wrap) return;
    if (wrap.classList.contains('is-open')) closeTopAccountPanel();
    else openTopAccountPanel();
}

function openManuscriptsFromPanel() {
    closeTopAccountPanel();
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
        if (typeof showAppToast === 'function') showAppToast('请先登录', 'error');
        showLoginModal();
        return;
    }
    showPage('manuscripts');
    try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        window.scrollTo(0, 0);
    }
}

let _manuscriptsTabsBound = false;
function initManuscriptsTabs() {
    const tabs = document.querySelectorAll('.manuscripts-tab[data-ms-tab]');
    if (!tabs.length) return;
    if (_manuscriptsTabsBound) {
        return;
    }
    _manuscriptsTabsBound = true;
    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const kind = tab.getAttribute('data-ms-tab');
            switchManuscriptsTab(kind);
        });
    });
}

function switchManuscriptsTab(kind) {
    const want = kind === 'combos' ? 'combos' : 'articles';
    document.querySelectorAll('.manuscripts-tab[data-ms-tab]').forEach((tab) => {
        const on = tab.getAttribute('data-ms-tab') === want;
        tab.classList.toggle('is-active', on);
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    const artPanel = document.getElementById('msPanelArticles');
    const comboPanel = document.getElementById('msPanelCombos');
    if (artPanel) {
        const show = want === 'articles';
        artPanel.classList.toggle('is-active', show);
        if (show) artPanel.removeAttribute('hidden');
        else artPanel.setAttribute('hidden', '');
    }
    if (comboPanel) {
        const show = want === 'combos';
        comboPanel.classList.toggle('is-active', show);
        if (show) comboPanel.removeAttribute('hidden');
        else comboPanel.setAttribute('hidden', '');
    }
}

function updateManuscriptsTabCounts(articleCount, comboCount) {
    const a = document.getElementById('msArticleTabCount');
    const c = document.getElementById('msComboTabCount');
    if (a) a.textContent = String(articleCount != null ? articleCount : 0);
    if (c) c.textContent = String(comboCount != null ? comboCount : 0);
}

function openDataDetailFromPanel() {
    closeTopAccountPanel();
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
        if (typeof showAppToast === 'function') showAppToast('请先登录', 'error');
        showLoginModal();
        return;
    }
    showPage('data');
    try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        window.scrollTo(0, 0);
    }
}


let _profileHomeTabsBound = false;
function initProfileHomeTabs() {
    const tabs = document.querySelectorAll('.profile-home-tabs [data-ph-tab]');
    if (!tabs.length) return;
    if (_profileHomeTabsBound) return;
    _profileHomeTabsBound = true;
    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const kind = tab.getAttribute('data-ph-tab');
            switchProfileHomeTab(kind);
        });
    });
}

function switchProfileHomeTab(kind) {
    const want = kind === 'combos' ? 'combos' : 'articles';
    document.querySelectorAll('.profile-home-tabs [data-ph-tab]').forEach((tab) => {
        const on = tab.getAttribute('data-ph-tab') === want;
        tab.classList.toggle('is-active', on);
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    const artPanel = document.getElementById('phPanelArticles');
    const comboPanel = document.getElementById('phPanelCombos');
    if (artPanel) {
        const show = want === 'articles';
        artPanel.classList.toggle('is-active', show);
        if (show) artPanel.removeAttribute('hidden');
        else artPanel.setAttribute('hidden', '');
    }
    if (comboPanel) {
        const show = want === 'combos';
        comboPanel.classList.toggle('is-active', show);
        if (show) comboPanel.removeAttribute('hidden');
        else comboPanel.setAttribute('hidden', '');
    }
}

function updateProfileHomeTabCounts(articleCount, comboCount) {
    const a = document.getElementById('phArticleTabCount');
    const c = document.getElementById('phComboTabCount');
    if (a) a.textContent = String(articleCount != null ? articleCount : 0);
    if (c) c.textContent = String(comboCount != null ? comboCount : 0);
}

/** ---------- 个人信息页 / 编辑资料 ---------- */
function openProfilePage() {
    closeTopAccountPanel();
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
        if (typeof showAppToast === 'function') showAppToast('请先登录', 'error');
        showLoginModal();
        return;
    }
    showPage('profile');
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
}

function parseBirthdayParts(birthday) {
    if (!birthday) return null;
    const s = String(birthday).trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

function formatBirthdayMonthDay(birthday) {
    const p = parseBirthdayParts(birthday);
    if (!p) return null;
    return `${p.month}月${p.day}日`;
}

function calcAgeFromBirthday(birthday) {
    const p = parseBirthdayParts(birthday);
    if (!p) return null;
    const now = new Date();
    let age = now.getFullYear() - p.year;
    const md = now.getMonth() + 1 - p.month;
    if (md < 0 || (md === 0 && now.getDate() < p.day)) age -= 1;
    if (age < 0 || age > 150) return null;
    return age;
}

function formatBirthdayDisplay(birthday) {
    const p = parseBirthdayParts(birthday);
    if (!p) return null;
    return {
        birthYm: `${p.year}年${String(p.month).padStart(2, '0')}月`,
        birthday: `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`,
        monthDay: `${p.month}月${p.day}日`,
        age: calcAgeFromBirthday(birthday)
    };
}

function fillProfilePage(user) {
    const u = user || AppState.user;
    if (!u) return;
    const cover = document.getElementById('profileCover');
    const avatar = document.getElementById('profileAvatar');
    const nick = document.getElementById('profileNickname');
    const uname = document.getElementById('profileUsername');
    const bio = document.getElementById('profileBio');
    const facts = document.getElementById('profileFacts');

    const coverUrl = u.coverUrl || '';
    if (cover) {
        if (coverUrl) {
            cover.style.backgroundImage = `url("${coverUrl}")`;
            cover.classList.add('has-image');
        } else {
            cover.style.backgroundImage = '';
            cover.classList.remove('has-image');
        }
    }
    if (avatar) avatar.src = u.avatarUrl || '/images/CSel3_LargePortTianhuo.png';
    if (nick) nick.textContent = u.nickname || u.username || '昵称';
    if (uname) uname.textContent = '@' + (u.username || 'user');
    if (bio) bio.textContent = (u.signature && String(u.signature).trim())
        ? u.signature
        : '这个家伙很懒，还没有自我介绍';

    if (facts) {
        const gender = (u.gender && String(u.gender).trim()) ? String(u.gender).trim() : '—';
        const age = calcAgeFromBirthday(u.birthday);
        const monthDay = formatBirthdayMonthDay(u.birthday);
        const ageText = age != null ? String(age) : '—';
        const bdayText = monthDay || '—';
        facts.innerHTML = [
            `<span>性别 ${gender}</span>`,
            `<span>年龄 ${ageText}</span>`,
            `<span>生日 ${bdayText}</span>`
        ].join('');
    }
}

async function refreshProfilePageFromServer() {
    if (!AppState.user || !AppState.user.token) return;
    try {
        const r = await fetch(`${AppState.managementApiUrl}/api/user/profile`, {
            headers: { 'Authorization': `Bearer ${AppState.user.token}` }
        });
        const result = await r.json();
        if (result.code === 200 && result.data) {
            const d = result.data;
            ['nickname', 'email', 'phone', 'signature', 'avatarUrl', 'username', 'gender', 'coverUrl'].forEach(k => {
                if (k in d && d[k] != null) AppState.user[k] = d[k];
            });
            if ('birthday' in d) {
                AppState.user.birthday = d.birthday != null
                    ? (typeof d.birthday === 'string' ? d.birthday : String(d.birthday))
                    : null;
            }
            localStorage.setItem('user', JSON.stringify(AppState.user));
            fillProfilePage(AppState.user);
            if (typeof updateUserInterface === 'function') updateUserInterface();
            if (typeof updateTopAccountPanel === 'function') updateTopAccountPanel();
        }
    } catch (e) {
        console.warn('刷新个人资料失败', e);
    }
}

function openEditProfileModal() {
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
        showAppToast('请先登录', 'error');
        showLoginModal();
        return;
    }
    const u = AppState.user;
    const nickEl = document.getElementById('editProfileNickname');
    const bioEl = document.getElementById('editProfileBio');
    const genderEl = document.getElementById('editProfileGender');
    const bdayEl = document.getElementById('editProfileBirthday');
    const avatarEl = document.getElementById('editProfileAvatar');
    const coverPrev = document.getElementById('editProfileCoverPreview');
    const clearBtn = document.getElementById('editProfileCoverClearBtn');

    if (nickEl) nickEl.value = u.nickname || '';
    if (bioEl) {
        bioEl.value = u.signature || '';
        const c = document.getElementById('editProfileBioCount');
        if (c) c.textContent = String((bioEl.value || '').length);
    }
    if (genderEl) genderEl.value = u.gender || '保密';
    if (bdayEl) {
        const bd = u.birthday ? String(u.birthday).slice(0, 10) : '';
        bdayEl.value = /^\d{4}-\d{2}-\d{2}$/.test(bd) ? bd : '';
    }
    if (avatarEl) avatarEl.src = u.avatarUrl || '/images/CSel3_LargePortTianhuo.png';

    AppState._editCoverUrl = u.coverUrl || '';
    AppState._editCoverCleared = false;
    if (coverPrev) {
        if (AppState._editCoverUrl) {
            coverPrev.style.backgroundImage = `url("${AppState._editCoverUrl}")`;
            coverPrev.classList.add('has-image');
        } else {
            coverPrev.style.backgroundImage = '';
            coverPrev.classList.remove('has-image');
        }
    }
    if (clearBtn) clearBtn.style.display = AppState._editCoverUrl ? '' : 'none';

    const modal = document.getElementById('editProfileModal');
    if (!modal) return;
    modal.style.display = 'flex';
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    if (typeof lockBodyScroll === 'function') lockBodyScroll();
}

function closeEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    if (typeof unlockBodyScroll === 'function') unlockBodyScroll();
    const af = document.getElementById('editProfileAvatarFile');
    const cf = document.getElementById('editProfileCoverFile');
    if (af) af.value = '';
    if (cf) cf.value = '';
}

function clearEditProfileCover() {
    AppState._editCoverUrl = '';
    AppState._editCoverCleared = true;
    const coverPrev = document.getElementById('editProfileCoverPreview');
    const clearBtn = document.getElementById('editProfileCoverClearBtn');
    if (coverPrev) {
        coverPrev.style.backgroundImage = '';
        coverPrev.classList.remove('has-image');
    }
    if (clearBtn) clearBtn.style.display = 'none';
}

function onEditProfileCoverSelected(ev) {
    const file = ev && ev.target && ev.target.files && ev.target.files[0];
    if (!file) return;
    if (!AppState.user || !AppState.user.token) {
        showAppToast('请先登录', 'error');
        return;
    }
    if (!file.type || !file.type.startsWith('image/')) {
        showAppToast('请选择图片文件', 'error');
        return;
    }
    if (file.size > 20 * 1024 * 1024) {
        showAppToast('封面不能超过 20MB', 'error');
        return;
    }
    if (typeof openCoverCropModal === 'function') {
        openCoverCropModal(file);
    }
    if (ev && ev.target) ev.target.value = '';
}

function onEditProfileAvatarSelected(ev) {
    const file = ev && ev.target && ev.target.files && ev.target.files[0];
    if (!file) return;
    if (typeof openAvatarCropModal === 'function') {
        openAvatarCropModal(file);
    }
    if (ev && ev.target) ev.target.value = '';
}

async function saveEditProfile() {
    if (!AppState.user || !AppState.user.token) {
        showAppToast('请先登录', 'error');
        return;
    }
    const nickEl = document.getElementById('editProfileNickname');
    const bioEl = document.getElementById('editProfileBio');
    const genderEl = document.getElementById('editProfileGender');
    const bdayEl = document.getElementById('editProfileBirthday');
    const nickname = (nickEl && nickEl.value || '').trim();
    const signature = (bioEl && bioEl.value || '').trim();
    const gender = (genderEl && genderEl.value) || '保密';
    const birthdayRaw = (bdayEl && bdayEl.value || '').trim();
    if (!nickname) {
        showAppToast('昵称不能为空', 'error');
        return;
    }
    const body = {
        nickname,
        email: AppState.user.email || '',
        phone: AppState.user.phone || '',
        signature,
        gender,
        birthday: birthdayRaw ? birthdayRaw : 'clear'
    };
    if (AppState._editCoverCleared) {
        body.coverUrl = '';
    } else if (AppState._editCoverUrl) {
        body.coverUrl = AppState._editCoverUrl;
    }

    const btn = document.getElementById('saveEditProfileBtn');
    if (btn) btn.disabled = true;
    try {
        const response = await fetch(`${AppState.managementApiUrl}/api/user/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${AppState.user.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        let result = null;
        try {
            result = await response.json();
        } catch (parseErr) {
            console.warn('profile save JSON parse failed', parseErr);
        }
        const code = result != null ? Number(result.code) : NaN;
        // Server already committed when code===200; do not treat later UI errors as save failure
        if (code === 200 || (response.ok && result && (result.data != null || /成功/.test(String(result.msg || ''))))) {
            const d = (result && result.data) || {};
            try {
                AppState.user.nickname = d.nickname != null ? d.nickname : nickname;
                AppState.user.signature = d.signature != null ? d.signature : signature;
                AppState.user.gender = d.gender != null ? d.gender : gender;
                if (d && 'birthday' in d) {
                    let bd = d.birthday;
                    if (Array.isArray(bd) && bd.length >= 3) {
                        bd = `${bd[0]}-${String(bd[1]).padStart(2, '0')}-${String(bd[2]).padStart(2, '0')}`;
                    } else if (bd != null && typeof bd !== 'string') {
                        bd = String(bd);
                    }
                    AppState.user.birthday = bd || null;
                } else {
                    AppState.user.birthday = birthdayRaw || null;
                }
                if (d && 'coverUrl' in d) {
                    AppState.user.coverUrl = d.coverUrl || '';
                } else if (AppState._editCoverCleared) {
                    AppState.user.coverUrl = '';
                }
                if (d.avatarUrl) AppState.user.avatarUrl = d.avatarUrl;
                localStorage.setItem('user', JSON.stringify(AppState.user));
                if (typeof fillProfilePage === 'function') fillProfilePage(AppState.user);
                if (typeof updateUserInterface === 'function') updateUserInterface();
                if (typeof updateTopAccountPanel === 'function') updateTopAccountPanel();
            } catch (uiErr) {
                console.warn('profile saved but UI refresh failed', uiErr);
            }
            closeEditProfileModal();
            showAppToast('个人资料已保存', 'success');
        } else {
            const msg = (result && (result.msg || result.message)) || '保存失败';
            showAppToast(msg, 'error');
        }
    } catch (e) {
        console.error(e);
        showAppToast('保存失败，请稍后重试', 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}


function initProfilePageUi() {
    const tapNick = document.getElementById('tapNickname');
    if (tapNick && !tapNick.dataset.profileBound) {
        tapNick.dataset.profileBound = '1';
        tapNick.style.cursor = 'pointer';
        tapNick.title = '查看个人信息';
        tapNick.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openProfilePage();
        });
    }
    const userName = document.getElementById('userName');
    if (userName && !userName.dataset.profileBound) {
        userName.dataset.profileBound = '1';
        userName.style.cursor = 'pointer';
        userName.title = '查看个人信息';
        userName.addEventListener('click', (e) => {
            e.preventDefault();
            openProfilePage();
        });
    }
    const bioEl = document.getElementById('editProfileBio');
    if (bioEl && !bioEl.dataset.bound) {
        bioEl.dataset.bound = '1';
        bioEl.addEventListener('input', () => {
            const c = document.getElementById('editProfileBioCount');
            if (c) c.textContent = String((bioEl.value || '').length);
        });
    }
    const avatarFile = document.getElementById('editProfileAvatarFile');
    if (avatarFile && !avatarFile.dataset.bound) {
        avatarFile.dataset.bound = '1';
        avatarFile.addEventListener('change', onEditProfileAvatarSelected);
    }
    const coverFile = document.getElementById('editProfileCoverFile');
    if (coverFile && !coverFile.dataset.bound) {
        coverFile.dataset.bound = '1';
        coverFile.addEventListener('change', onEditProfileCoverSelected);
    }
    const modal = document.getElementById('editProfileModal');
    if (modal && !modal.dataset.bound) {
        modal.dataset.bound = '1';
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeEditProfileModal();
        });
    }
}


function openSettingsFromPanel(tab) {
    closeTopAccountPanel();
    if (typeof openProfileSettings === 'function') {
        openProfileSettings();
    }
}


function initAppTopActions() {
    if (typeof initAppearanceAndNotifyPrefs === 'function') initAppearanceAndNotifyPrefs();
    if (typeof initProfilePageUi === 'function') initProfilePageUi();

    const postBtn = document.getElementById('topPostBtn');
    const menu = document.getElementById('topPostMenu');
    const msgBtn = document.getElementById('topMsgBtn');
    const notifyBtn = document.getElementById('topNotifyBtn');
    const avatarBtn = document.getElementById('topAvatarBtn');

    if (postBtn) {
        postBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleTopPostMenu();
        });
    }
    if (menu) {
        menu.addEventListener('click', (e) => {
            const item = e.target.closest('[data-post]');
            if (!item) return;
            e.preventDefault();
            const kind = item.getAttribute('data-post');
            closeTopPostMenu();
            if (kind === 'article') {
                showCreateArticle();
            } else if (kind === 'combo') {
                showCreateCombo();
            }
        });
    }
    // 私信 / 通知：暂未实现，静默 no-op
    if (msgBtn) {
        msgBtn.addEventListener('click', (e) => {
            e.preventDefault();
        });
    }
    if (notifyBtn) {
        notifyBtn.addEventListener('click', (e) => {
            e.preventDefault();
        });
    }
    if (avatarBtn) {
        avatarBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeTopPostMenu();
            toggleTopAccountPanel();
        });
    }

    const tapData = document.getElementById('tapDataBtn');
    const tapManu = document.getElementById('tapManuscriptsBtn');
    const tapSet = document.getElementById('tapSettingsBtn');
    if (tapData) {
        tapData.addEventListener('click', (e) => {
            e.preventDefault();
            openDataDetailFromPanel();
        });
    }
    if (tapManu) {
        tapManu.addEventListener('click', (e) => {
            e.preventDefault();
            openManuscriptsFromPanel();
        });
    }
    if (tapSet) {
        tapSet.addEventListener('click', (e) => {
            e.preventDefault();
            openSettingsFromPanel('account');
        });
    }
    const tapFeedback = document.getElementById('tapFeedbackBtn');
    if (tapFeedback) {
        tapFeedback.addEventListener('click', (e) => {
            e.preventDefault();
            openFeedbackModal();
        });
    }
    const tapLogout = document.getElementById('tapLogoutBtn');
    if (tapLogout) {
        tapLogout.addEventListener('click', (e) => {
            e.preventDefault();
            closeTopAccountPanel();
            if (typeof logout === 'function') logout();
        });
    }

    document.addEventListener('click', (e) => {
        const postWrap = document.querySelector('.top-post-wrap');
        if (postWrap && postWrap.classList.contains('is-open') && !postWrap.contains(e.target)) {
            closeTopPostMenu();
        }
        const avWrap = document.getElementById('topAvatarWrap');
        if (avWrap && avWrap.classList.contains('is-open') && !avWrap.contains(e.target)) {
            closeTopAccountPanel();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeTopPostMenu();
            closeTopAccountPanel();
            if (typeof closeFeedbackModal === 'function') closeFeedbackModal();
        }
    });

    setAppTopActionsVisible(!!(AppState.isLoggedIn && AppState.user));
    syncTopUserAvatar();
}

function showCreateArticle() {
    if (!AppState.isLoggedIn) {
        showLoginRequiredHint();
        return;
    }
    const modal = document.getElementById('createArticleModal');
    const form = document.getElementById('createArticleForm');
    if (form) {
        form.reset();
    }
    const coverUrlEl = document.getElementById('userArticleCoverUrl');
    const coverPreview = document.getElementById('userArticleCoverPreview');
    const coverPreviewImg = document.getElementById('userArticleCoverPreviewImg');
    const coverInput = document.getElementById('userArticleCoverImage');
    if (coverUrlEl) coverUrlEl.value = '';
    if (coverPreview) coverPreview.style.display = 'none';
    if (coverPreviewImg) coverPreviewImg.src = '';
    if (coverInput) coverInput.value = '';
    if (modal) {
        modal.style.display = 'block';
    }
}

// 关闭创建文章模态框
function closeCreateArticleModal() {
    const modal = document.getElementById('createArticleModal');
    if (modal) modal.style.display = 'none';
}

// 打开发布连段弹窗（从角色详情进入，传入当前角色 id）
function openCreateComboModal(characterId) {
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
        showLoginRequiredHint();
        return;
    }
    const modal = document.getElementById('createComboModal');
    const form = document.getElementById('createComboForm');
    if (form) form.reset();
    populateCreateComboCharacterOptions(characterId || '');
    document.getElementById('createComboCharacterId').value = characterId || '';
    document.getElementById('createComboFileUrl').value = '';
    document.getElementById('createComboVideoUrl').value = '';
    const fn = document.getElementById('createComboFileName');
    const vn = document.getElementById('createComboVideoName');
    if (fn) fn.textContent = '';
    if (vn) vn.textContent = '';
    if (modal) modal.style.display = 'block';
}

function closeCreateComboModal() {
    const modal = document.getElementById('createComboModal');
    if (modal) modal.style.display = 'none';
}

function populateCreateComboCharacterOptions(selectedId) {
    const select = document.getElementById('createComboCharacterSelect');
    const hidden = document.getElementById('createComboCharacterId');
    if (!select) return;
    const selected = selectedId != null ? String(selectedId) : '';
    const options = (AppState.characters || []).map(c => {
        const id = c && c.id != null ? String(c.id) : '';
        const name = (c && (c.nameZh || c.nameEn)) ? (c.nameZh || c.nameEn) : `角色 ${id}`;
        return `<option value="${id}" ${id === selected ? 'selected' : ''}>${name}</option>`;
    }).join('');
    select.innerHTML = `<option value="">请选择角色</option>${options}`;
    if (hidden) hidden.value = selected || select.value || '';
}

async function uploadComboFileAndSet(file, urlInputId, nameSpanId) {
    if (!file.name || !file.name.toLowerCase().endsWith('.tfhc')) {
        alert('仅支持 .tfhc 连段文件');
        return;
    }
    const formData = new FormData();
    formData.append('file', file);
    try {
        showLoading();
        const response = await fetch(`${AppState.managementApiUrl}/api/file/upload/combo-file`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.code === 200 && result.data && result.data.url) {
            document.getElementById(urlInputId).value = result.data.url;
            const span = document.getElementById(nameSpanId);
            if (span) span.textContent = result.data.originalName || '已上传';
        } else {
            alert('上传失败：' + (result.msg || '未知错误'));
        }
    } catch (e) {
        console.error('连段文件上传错误', e);
        alert('上传失败，请检查网络或管理端(8081)是否可访问');
    } finally {
        hideLoading();
    }
}

async function uploadComboVideoAndSet(file, urlInputId, nameSpanId) {
    if (!file.type.startsWith('video/')) {
        alert('请选择视频文件');
        return;
    }
    const formData = new FormData();
    formData.append('file', file);
    try {
        showLoading();
        const response = await fetch(`${AppState.managementApiUrl}/api/file/upload/combo-video`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.code === 200 && result.data && result.data.url) {
            document.getElementById(urlInputId).value = result.data.url;
            const span = document.getElementById(nameSpanId);
            if (span) span.textContent = result.data.originalName || '已上传';
        } else {
            alert('视频上传失败：' + (result.msg || '未知错误'));
        }
    } catch (e) {
        console.error('连段视频上传错误', e);
        alert('视频上传失败，请检查网络或管理端(8081)是否可访问');
    } finally {
        hideLoading();
    }
}

async function submitCreateCombo() {
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
        showLoginRequiredHint();
        return;
    }
    const characterId = document.getElementById('createComboCharacterId').value;
    const title = document.getElementById('createComboTitle').value.trim();
    const damage = document.getElementById('createComboDamage').value;
    const description = document.getElementById('createComboDescription').value.trim();
    const videoUrl = document.getElementById('createComboVideoUrl').value.trim();
    const comboFileUrl = document.getElementById('createComboFileUrl').value.trim();
    if (!characterId) {
        alert('请选择角色');
        return;
    }
    if (!title) {
        alert('请输入连段名称');
        return;
    }
    if (!videoUrl) {
        alert('请上传连段视频');
        return;
    }
    const payload = {
        characterId: parseInt(characterId, 10),
        title,
        description: description || null,
        damageTotal: damage ? parseInt(damage, 10) : 0,
        videoUrl,
        comboFileUrl: comboFileUrl || null
    };
    try {
        showLoading();
        const response = await fetch(`${AppState.managementApiUrl}/api/combos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AppState.user.token}`
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.code === 200) {
            alert('提交成功，等待管理员审核通过后将在该角色下展示。');
            closeCreateComboModal();
            loadMyPublishedContent();
            refreshMyComboStats();
        } else {
            alert('提交失败：' + (result.msg || '未知错误'));
        }
    } catch (e) {
        alert('提交失败，请检查网络');
    } finally {
        hideLoading();
    }
}

// 提交创建文章
async function submitCreateArticle() {
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
        showLoginRequiredHint();
        return;
    }

    const title = document.getElementById('createArticleTitle').value.trim();
    const summary = document.getElementById('createArticleSummary').value.trim();
    const content = document.getElementById('createArticleContent').value.trim();

    if (!title) {
        alert('请输入资讯标题');
        return;
    }
    if (!content) {
        alert('请输入资讯内容');
        return;
    }

    const articleData = {
        title: title,
        author: AppState.user.nickname || AppState.user.username || '匿名用户',
        summary: summary || '',
        coverUrl: (document.getElementById('userArticleCoverUrl') && document.getElementById('userArticleCoverUrl').value) || '',
        content: content,
        viewCount: 0
    };

    try {
        showLoading();

        const response = await fetch(`${AppState.managementApiUrl}/api/articles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AppState.user.token}`
            },
            body: JSON.stringify(articleData)
        });

        const result = await response.json();

        if (result.code === 200) {
            alert('发布成功！');
            closeCreateArticleModal();
            loadMyPublishedContent();
            // 重新加载资讯列表
            await loadArticles();
            renderArticles(AppState.articles);
            // 切回资讯页
            showPage('news');
        } else {
            alert('发布失败：' + (result.msg || '未知错误'));
        }
    } catch (error) {
        console.error('发布资讯失败:', error);
        alert('发布资讯失败，请检查网络连接');
    } finally {
        hideLoading();
    }
}

// 用户端上传资讯封面并显示预览
async function uploadUserArticleCoverAndPreview(file) {
    if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
    }
    const formData = new FormData();
    formData.append('file', file);
    try {
        showLoading();
        const response = await fetch(`${AppState.managementApiUrl}/api/file/upload/article-cover`, {
            method: 'POST',
            headers: {
                'Authorization': AppState.user && AppState.user.token ? `Bearer ${AppState.user.token}` : ''
            },
            body: formData
        });
        const result = await response.json();
        if (result.code === 200 && result.data && result.data.url) {
            const url = result.data.url;
            const urlEl = document.getElementById('userArticleCoverUrl');
            const preview = document.getElementById('userArticleCoverPreview');
            const previewImg = document.getElementById('userArticleCoverPreviewImg');
            if (urlEl) urlEl.value = url;
            if (previewImg) previewImg.src = url;
            if (preview) preview.style.display = 'block';
        } else {
            alert('封面上传失败：' + (result.msg || '未知错误'));
        }
    } catch (error) {
        console.error('封面上传失败:', error);
        alert('封面上传失败，请检查网络连接');
    } finally {
        hideLoading();
    }
}

// 用户端上传正文图片并插入到textarea
async function uploadUserContentImageAndInsert(file, textareaId) {
    if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
    }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('图片大小不能超过5MB');
        return;
    }

    const textarea = document.getElementById(textareaId);
    if (!textarea) return;

    try {
        showLoading();

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${AppState.managementApiUrl}/api/file/upload/article-content`, {
            method: 'POST',
            headers: {
                'Authorization': AppState.user && AppState.user.token ? `Bearer ${AppState.user.token}` : ''
            },
            body: formData
        });

        const result = await response.json();
        if (result.code === 200 && result.data && result.data.url) {
            const url = result.data.url;
            const start = textarea.selectionStart || textarea.value.length;
            const end = textarea.selectionEnd || textarea.value.length;
            const before = textarea.value.substring(0, start);
            const after = textarea.value.substring(end);
            const insertText = `\n<img src="${url}" alt="" />\n`;
            textarea.value = before + insertText + after;
            const newPos = before.length + insertText.length;
            textarea.selectionStart = textarea.selectionEnd = newPos;
            textarea.focus();
            alert('图片已插入到正文');
        } else {
            alert('正文图片上传失败：' + (result.msg || '未知错误'));
        }
    } catch (error) {
        console.error('正文图片上传失败:', error);
        alert('正文图片上传失败，请检查网络连接');
    } finally {
        hideLoading();
    }
}

// 通用：上传图片文件并返回可访问 URL（用于评论图片）
async function uploadImageFileAndGetUrl(file) {
    if (!file || !file.type || !file.type.startsWith('image/')) return null;
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('图片大小不能超过 5MB');
        return null;
    }
    try {
        showLoading();
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${AppState.managementApiUrl}/api/file/upload/article-content`, {
            method: 'POST',
            headers: {
                'Authorization': AppState.user && AppState.user.token ? `Bearer ${AppState.user.token}` : ''
            },
            body: formData
        });
        const result = await response.json();
        if (result.code === 200 && result.data && result.data.url) return result.data.url;
        return null;
    } catch (e) {
        console.error('图片上传失败', e);
        return null;
    } finally {
        hideLoading();
    }
}

// 显示创建连段
function showCreateCombo() {
    if (!AppState.isLoggedIn) {
        showLoginModal();
        return;
    }
    openCreateComboModal('');
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

/** 资讯发布时间：相对时间 + title 绝对时间；兼容 created_at / createdAt */
function getArticleCreatedAt(article) {
    if (!article) return '';
    return article.created_at || article.createdAt || article.publish_time || article.publishTime || '';
}

function formatArticlePublishTime(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return String(dateString);
        const now = Date.now();
        const diff = Math.max(0, now - date.getTime());
        const sec = Math.floor(diff / 1000);
        if (sec < 60) return '刚刚';
        const min = Math.floor(sec / 60);
        if (min < 60) return min + '分钟前';
        const hour = Math.floor(min / 60);
        if (hour < 24) return hour + '小时前';
        const day = Math.floor(hour / 24);
        if (day < 7) return day + '天前';
        if (day < 30) return Math.floor(day / 7) + '周前';
        return formatDate(dateString);
    } catch (e) {
        return String(dateString);
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

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);



/** 管理端 / 同源 API 基址：资讯走 apiBaseUrl，连段走 managementApiUrl（生产多为空=同源） */
function myContentApiBase(kind) {
    // 资讯 / 连段均在 management（8081）
    return (AppState.managementApiUrl || '').replace(/\/$/, '');
}

function myContentAuthHeaders() {
    const h = { 'Content-Type': 'application/json' };
    if (AppState.user && AppState.user.token) {
        h['Authorization'] = 'Bearer ' + AppState.user.token;
    }
    return h;
}

const MY_COMBO_STATUS = { pending: '待审核', approved: '已通过', rejected: '已拒绝' };

window.__profileHomeText = {loginManage:'\u767b\u5f55\u540e\u53ef\u7ba1\u7406',loginView:'\u767b\u5f55\u540e\u53ef\u67e5\u770b\u4f5c\u54c1',loading:'\u52a0\u8f7d\u4e2d\u2026',noArticles:'\u6682\u65e0\u53d1\u5e03\u7684\u8d44\u8baf',noTitle:'\u65e0\u6807\u9898',reads:'\u9605\u8bfb',view:'\u67e5\u770b',del:'\u5220\u9664',noCombos:'\u6682\u65e0\u6295\u7a3f\u7684\u8fde\u6bb5',unnamedCombo:'\u672a\u547d\u540d\u8fde\u6bb5',charPrefix:'\u89d2\u8272#',emptyArtTitle:'\u8fd8\u6ca1\u6709\u8d44\u8baf\u4f5c\u54c1',emptyArtDesc:'\u53d1\u5e03\u8d44\u8baf\u540e\uff0c\u4f1a\u5c55\u793a\u5728\u8fd9\u91cc',emptyComboTitle:'\u8fd8\u6ca1\u6709\u8fde\u6bb5\u4f5c\u54c1',emptyComboDesc:'\u6295\u7a3f\u8fde\u6bb5\u901a\u8fc7\u540e\uff0c\u4f1a\u5c55\u793a\u5728\u8fd9\u91cc',comboLabel:'\u8fde\u6bb5',loadFail:'\u52a0\u8f7d\u5931\u8d25'};
async function loadMyPublishedContent() {
    const manageArtEls = [
        document.getElementById('myArticlesList'),
        document.getElementById('settingsMyArticlesList'),
        document.getElementById('manuscriptsArticlesList')
    ].filter(Boolean);
    const manageComboEls = [
        document.getElementById('myCombosList'),
        document.getElementById('settingsMyCombosList'),
        document.getElementById('manuscriptsCombosList')
    ].filter(Boolean);
    const showcaseArtEl = document.getElementById('profileArticlesList');
    const showcaseComboEl = document.getElementById('profileCombosList');
    const setAll = (els, html) => { els.forEach(el => { el.innerHTML = html; }); };
    const setOne = (el, html) => { if (el) el.innerHTML = html; };
    const T = window.__profileHomeText;
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
        setAll(manageArtEls, '<div class="my-content-empty">' + T.loginManage + '</div>');
        setAll(manageComboEls, '<div class="my-content-empty">' + T.loginManage + '</div>');
        setOne(showcaseArtEl, '<div class="profile-works-empty">' + T.loginView + '</div>');
        setOne(showcaseComboEl, '<div class="profile-works-empty">' + T.loginView + '</div>');
        return;
    }
    setAll(manageArtEls, '<div class="my-content-empty">' + T.loading + '</div>');
    setAll(manageComboEls, '<div class="my-content-empty">' + T.loading + '</div>');
    setOne(showcaseArtEl, '<div class="profile-works-empty">' + T.loading + '</div>');
    setOne(showcaseComboEl, '<div class="profile-works-empty">' + T.loading + '</div>');
    try {
        const [aResp, cResp] = await Promise.all([
            fetch(myContentApiBase('article') + '/api/articles/mine', { headers: myContentAuthHeaders() }),
            fetch(myContentApiBase('combo') + '/api/combos/mine', { headers: myContentAuthHeaders() })
        ]);
        const aData = await aResp.json().catch(() => null);
        const cData = await cResp.json().catch(() => null);
        const articles = (aData && aData.code === 200 && Array.isArray(aData.data)) ? aData.data : [];
        const combos = (cData && cData.code === 200 && Array.isArray(cData.data)) ? cData.data : [];
        AppState.myStats.articleCount = articles.length;
        AppState.myStats.comboCount = combos.length;
        updateMyStatsPanel();
        if (typeof updateManuscriptsTabCounts === 'function') updateManuscriptsTabCounts(articles.length, combos.length);
        if (typeof updateProfileHomeTabCounts === 'function') updateProfileHomeTabCounts(articles.length, combos.length);
        let manageArtHtml;
        if (!articles.length) manageArtHtml = '<div class="my-content-empty">' + T.noArticles + '</div>';
        else manageArtHtml = articles.map(function (a) {
            const id = a.id;
            const title = (a.title || T.noTitle).toString();
            const created = (a.createdAt || a.created_at || '').toString().replace('T', ' ').slice(0, 16);
            const views = a.viewCount != null ? a.viewCount : (a.view_count != null ? a.view_count : 0);
            const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return '<div class="my-content-item" data-id="' + id + '"><div class="my-content-item-main"><div class="my-content-item-title">' + safeTitle + '</div><div class="my-content-item-meta">' + created + ' \u00b7 ' + views + ' ' + T.reads + '</div></div><div class="my-content-item-actions"><button type="button" class="btn btn-outline btn-sm" onclick="showArticle(' + id + ')">' + T.view + '</button><button type="button" class="btn btn-secondary btn-sm" onclick="deleteMyArticle(' + id + ')">' + T.del + '</button></div></div>';
        }).join('');
        setAll(manageArtEls, manageArtHtml);
        let manageComboHtml;
        if (!combos.length) manageComboHtml = '<div class="my-content-empty">' + T.noCombos + '</div>';
        else manageComboHtml = combos.map(function (c) {
            const id = c.id;
            const title = (c.title || T.unnamedCombo).toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const ch = (c.characterName || c.character_name || (T.charPrefix + (c.characterId || ''))).toString().replace(/</g, '&lt;');
            const st = c.status || '';
            const stLabel = MY_COMBO_STATUS[st] || st;
            const video = (c.videoUrl || c.video_url || '').toString().replace(/'/g, "\\'");
            const created = (c.createdAt || c.created_at || '').toString().replace('T', ' ').slice(0, 16);
            const viewBtn = video ? '<button type="button" class="btn btn-outline btn-sm" onclick="openComboVideoPlayer(\'' + video + '\', \'' + title.replace(/'/g, "\\'") + '\')">' + T.view + '</button>' : '';
            return '<div class="my-content-item" data-id="' + id + '"><div class="my-content-item-main"><div class="my-content-item-title">' + title + '<span class="my-content-status ' + st + '">' + stLabel + '</span></div><div class="my-content-item-meta">' + ch + (created ? ' \u00b7 ' + created : '') + '</div></div><div class="my-content-item-actions">' + viewBtn + '<button type="button" class="btn btn-secondary btn-sm" onclick="deleteMyCombo(' + id + ')">' + T.del + '</button></div></div>';
        }).join('');
        setAll(manageComboEls, manageComboHtml);
        let showcaseArtHtml;
        if (!articles.length) showcaseArtHtml = '<div class="profile-works-empty"><div class="profile-works-empty-title">' + T.emptyArtTitle + '</div><p class="profile-works-empty-desc">' + T.emptyArtDesc + '</p></div>';
        else showcaseArtHtml = articles.map(function (a) {
            const id = a.id;
            const title = (a.title || T.noTitle).toString().replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            const summary = (a.summary || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const created = (a.createdAt || a.created_at || '').toString().replace('T', ' ').slice(0, 16);
            const views = a.viewCount != null ? a.viewCount : (a.view_count != null ? a.view_count : 0);
            const cover = (a.cover_url || a.coverUrl || '/images/default-article.jpg').toString().replace(/"/g, '&quot;');
            const metaBits = [];
            if (created) metaBits.push(created);
            metaBits.push(views + ' ' + T.reads);
            return '<article class="profile-work-card" role="button" tabindex="0" data-id="' + id + '" onclick="showArticle(' + id + ')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();showArticle(' + id + ');}"><div class="profile-work-cover"><img src="' + cover + '" alt="" loading="lazy" onerror="this.onerror=null;this.src=\'/images/default-article.jpg\'"></div><div class="profile-work-body"><h3 class="profile-work-title">' + title + '</h3>' + (summary ? '<p class="profile-work-summary">' + summary + '</p>' : '') + '<p class="profile-work-meta">' + metaBits.join(' \u00b7 ') + '</p></div></article>';
        }).join('');
        setOne(showcaseArtEl, showcaseArtHtml);
        let showcaseComboHtml;
        if (!combos.length) showcaseComboHtml = '<div class="profile-works-empty"><div class="profile-works-empty-title">' + T.emptyComboTitle + '</div><p class="profile-works-empty-desc">' + T.emptyComboDesc + '</p></div>';
        else showcaseComboHtml = combos.map(function (c) {
            const id = c.id;
            const rawTitle = (c.title || T.unnamedCombo).toString();
            const title = rawTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            const ch = (c.characterName || c.character_name || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const created = (c.createdAt || c.created_at || '').toString().replace('T', ' ').slice(0, 16);
            const video = (c.videoUrl || c.video_url || '').toString();
            const cover = (c.coverUrl || c.cover_url || c.thumbnailUrl || c.thumbnail_url || '').toString().replace(/"/g, '&quot;');
            const safeVideo = video.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            const safeTitleJs = rawTitle.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            let clickAttr = '';
            if (video) clickAttr = ' onclick="openComboVideoPlayer(\'' + safeVideo + '\', \'' + safeTitleJs + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();openComboVideoPlayer(\'' + safeVideo + '\', \'' + safeTitleJs + '\');}"';
            const metaBits = [];
            if (ch) metaBits.push(ch);
            if (created) metaBits.push(created);
            const coverHtml = cover ? '<img src="' + cover + '" alt="" loading="lazy" onerror="this.remove()">' : '<div class="profile-work-cover-fallback" aria-hidden="true"><span>' + T.comboLabel + '</span></div>';
            return '<article class="profile-work-card profile-work-card--combo" role="button" tabindex="0" data-id="' + id + '"' + clickAttr + '><div class="profile-work-cover">' + coverHtml + (video ? '<span class="profile-work-play" aria-hidden="true"></span>' : '') + '</div><div class="profile-work-body"><h3 class="profile-work-title">' + title + '</h3>' + (metaBits.length ? '<p class="profile-work-meta">' + metaBits.join(' \u00b7 ') + '</p>' : '') + '</div></article>';
        }).join('');
        setOne(showcaseComboEl, showcaseComboHtml);
    } catch (e) {
        console.warn(T.loadFail, e);
        setAll(manageArtEls, '<div class="my-content-empty">' + T.loadFail + '</div>');
        setAll(manageComboEls, '<div class="my-content-empty">' + T.loadFail + '</div>');
        setOne(showcaseArtEl, '<div class="profile-works-empty">' + T.loadFail + '</div>');
        setOne(showcaseComboEl, '<div class="profile-works-empty">' + T.loadFail + '</div>');
    }
}
async function deleteMyArticle(id) {
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
        showLoginRequiredHint && showLoginRequiredHint();
        return;
    }
    const ok = await showAppConfirm({
        title: '删除资讯',
        message: '确定删除这条资讯吗？删除后不可恢复。',
        confirmText: '删除',
        cancelText: '取消',
        danger: true
    });
    if (!ok) return;
    try {
        const resp = await fetch(myContentApiBase('article') + '/api/articles/' + id, {
            method: 'DELETE',
            headers: myContentAuthHeaders()
        });
        const data = await resp.json().catch(() => null);
        if (data && data.code === 200) {
            if (typeof showAppToast === 'function') showAppToast('已删除资讯', 'success');
            else alert('已删除');
            if (typeof loadArticles === 'function') loadArticles();
            loadMyPublishedContent();
        } else {
            const msg = (data && (data.msg || data.message)) || '删除失败';
            if (typeof showAppToast === 'function') showAppToast(msg, 'error');
            else alert(msg);
        }
    } catch (e) {
        if (typeof showAppToast === 'function') showAppToast('删除失败：' + (e.message || e), 'error');
        else alert('删除失败：' + (e.message || e));
    }
}

async function deleteMyCombo(id) {
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
        showLoginRequiredHint && showLoginRequiredHint();
        return;
    }
    const ok = await showAppConfirm({
        title: '删除连段',
        message: '确定删除这条连段吗？删除后不可恢复。',
        confirmText: '删除',
        cancelText: '取消',
        danger: true
    });
    if (!ok) return;
    try {
        const resp = await fetch(myContentApiBase('combo') + '/api/combos/' + id, {
            method: 'DELETE',
            headers: myContentAuthHeaders()
        });
        const data = await resp.json().catch(() => null);
        if (data && data.code === 200) {
            if (typeof showAppToast === 'function') showAppToast('已删除连段', 'success');
            else alert('已删除');
            loadMyPublishedContent();
            if (typeof refreshMyComboStats === 'function') refreshMyComboStats();
        } else {
            const msg = (data && (data.msg || data.message)) || '删除失败';
            if (typeof showAppToast === 'function') showAppToast(msg, 'error');
            else alert(msg);
        }
    } catch (e) {
        if (typeof showAppToast === 'function') showAppToast('删除失败：' + (e.message || e), 'error');
        else alert('删除失败：' + (e.message || e));
    }
}



function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    const icon = btn && btn.querySelector('i');
    if (icon) {
        icon.classList.toggle('fa-eye', !show);
        icon.classList.toggle('fa-eye-slash', show);
    }
    if (btn) btn.setAttribute('aria-label', show ? '隐藏密码' : '显示密码');
}


/** ---------- 设置页：通知偏好 / 黑暗模式 ---------- */
const NOTIFY_PREFS_KEY = 'tfhers-notify-prefs';
const THEME_PREF_KEY = 'tfhers-theme'; // 'dark' | 'light' ；默认 dark

function getNotifyPrefs() {
    try {
        const raw = localStorage.getItem(NOTIFY_PREFS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return {
                like: parsed.like !== false,
                comment: parsed.comment !== false
            };
        }
    } catch (e) { /* ignore */ }
    return { like: true, comment: true };
}

function saveNotifyPrefs(prefs) {
    try {
        localStorage.setItem(NOTIFY_PREFS_KEY, JSON.stringify(prefs));
    } catch (e) { /* ignore */ }
}

function loadNotifyPrefsIntoForm() {
    const prefs = getNotifyPrefs();
    const likeEl = document.getElementById('settingsNotifyLike');
    const commentEl = document.getElementById('settingsNotifyComment');
    if (likeEl) likeEl.checked = !!prefs.like;
    if (commentEl) commentEl.checked = !!prefs.comment;
}

function bindNotifyPrefsControls() {
    const likeEl = document.getElementById('settingsNotifyLike');
    const commentEl = document.getElementById('settingsNotifyComment');
    const persist = () => {
        saveNotifyPrefs({
            like: !!(likeEl && likeEl.checked),
            comment: !!(commentEl && commentEl.checked)
        });
    };
    if (likeEl && !likeEl.dataset.bound) {
        likeEl.dataset.bound = '1';
        likeEl.addEventListener('change', persist);
    }
    if (commentEl && !commentEl.dataset.bound) {
        commentEl.dataset.bound = '1';
        commentEl.addEventListener('change', persist);
    }
}

function getThemePref() {
    try {
        const v = localStorage.getItem(THEME_PREF_KEY);
        if (v === 'light' || v === 'dark') return v;
    } catch (e) { /* ignore */ }
    return 'dark';
}

function applyThemePref(theme) {
    const mode = theme === 'light' ? 'light' : 'dark';
    const root = document.documentElement;
    if (mode === 'light') {
        root.classList.add('theme-light');
    } else {
        root.classList.remove('theme-light');
    }
    try {
        localStorage.setItem(THEME_PREF_KEY, mode);
    } catch (e) { /* ignore */ }
    const toggle = document.getElementById('settingsDarkMode');
    if (toggle) toggle.checked = (mode === 'dark');
}

function loadThemePrefsIntoForm() {
    const toggle = document.getElementById('settingsDarkMode');
    if (toggle) toggle.checked = (getThemePref() === 'dark');
}

function bindThemePrefsControls() {
    const toggle = document.getElementById('settingsDarkMode');
    if (!toggle || toggle.dataset.bound) return;
    toggle.dataset.bound = '1';
    toggle.addEventListener('change', () => {
        applyThemePref(toggle.checked ? 'dark' : 'light');
    });
}

function initAppearanceAndNotifyPrefs() {
    applyThemePref(getThemePref());
    loadNotifyPrefsIntoForm();
    loadThemePrefsIntoForm();
    bindNotifyPrefsControls();
    bindThemePrefsControls();
}




// ================== 问题反馈 ==================
const FeedbackState = {
    page: 1,
    pageSize: 8,
    total: 0,
    tab: 'submit'
};

function openFeedbackModal() {
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
        if (typeof showLoginRequiredHint === 'function') showLoginRequiredHint();
        return;
    }
    closeTopAccountPanel();
    const modal = document.getElementById('feedbackModal');
    if (!modal) return;
    switchFeedbackTab('submit');
    const form = document.getElementById('feedbackForm');
    if (form) form.reset();
    const cat = document.getElementById('feedbackCategory');
    if (cat) cat.value = 'bug';
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    if (typeof lockBodyScroll === 'function') lockBodyScroll();
}

function closeFeedbackModal() {
    const modal = document.getElementById('feedbackModal');
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }
    if (typeof unlockBodyScroll === 'function') unlockBodyScroll();
}

function switchFeedbackTab(tab) {
    FeedbackState.tab = tab === 'mine' ? 'mine' : 'submit';
    const submitTab = document.getElementById('feedbackTabSubmit');
    const mineTab = document.getElementById('feedbackTabMine');
    const submitPane = document.getElementById('feedbackSubmitPane');
    const minePane = document.getElementById('feedbackMinePane');
    if (submitTab) submitTab.classList.toggle('active', FeedbackState.tab === 'submit');
    if (mineTab) mineTab.classList.toggle('active', FeedbackState.tab === 'mine');
    if (submitPane) submitPane.hidden = FeedbackState.tab !== 'submit';
    if (minePane) minePane.hidden = FeedbackState.tab !== 'mine';
    if (FeedbackState.tab === 'mine') {
        FeedbackState.page = 1;
        loadMyFeedbackList();
    }
}

function feedbackStatusText(status) {
    const map = { 0: '待处理', 1: '处理中', 2: '已处理', 3: '已关闭' };
    return map[status] != null ? map[status] : ('状态' + status);
}

function feedbackCategoryText(cat) {
    const map = { bug: '问题/Bug', suggestion: '功能建议', other: '其他' };
    return map[cat] || cat || '其他';
}

function escapeFeedbackHtml(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

async function submitFeedback() {
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
        if (typeof showLoginRequiredHint === 'function') showLoginRequiredHint();
        return;
    }
    const category = (document.getElementById('feedbackCategory') || {}).value || 'other';
    const title = ((document.getElementById('feedbackTitle') || {}).value || '').trim();
    const content = ((document.getElementById('feedbackContent') || {}).value || '').trim();
    const contact = ((document.getElementById('feedbackContact') || {}).value || '').trim();
    if (!title) {
        showAppToast('请填写标题', 'error');
        return;
    }
    if (!content) {
        showAppToast('请填写详细描述', 'error');
        return;
    }
    const btn = document.getElementById('feedbackSubmitBtn');
    if (btn) btn.disabled = true;
    try {
        if (typeof showLoading === 'function') showLoading();
        const response = await fetch(`${AppState.managementApiUrl}/api/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AppState.user.token}`
            },
            body: JSON.stringify({ category, title, content, contact: contact || null })
        });
        const data = await response.json();
        if (data.code === 200) {
            showAppToast(data.msg || '提交成功', 'success');
            const form = document.getElementById('feedbackForm');
            if (form) form.reset();
            switchFeedbackTab('mine');
        } else {
            showAppToast(data.msg || '提交失败', 'error');
        }
    } catch (e) {
        console.error(e);
        showAppToast('提交失败，请检查网络', 'error');
    } finally {
        if (typeof hideLoading === 'function') hideLoading();
        if (btn) btn.disabled = false;
    }
}

async function loadMyFeedbackList() {
    const listEl = document.getElementById('feedbackMineList');
    const pagerEl = document.getElementById('feedbackMinePager');
    if (!listEl) return;
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
        listEl.innerHTML = '<div class="feedback-empty">请先登录</div>';
        if (pagerEl) pagerEl.innerHTML = '';
        return;
    }
    listEl.innerHTML = '<div class="feedback-empty">加载中…</div>';
    try {
        const page = FeedbackState.page || 1;
        const size = FeedbackState.pageSize || 8;
        const response = await fetch(
            `${AppState.managementApiUrl}/api/feedback/mine?page=${page}&size=${size}`,
            { headers: { 'Authorization': `Bearer ${AppState.user.token}` } }
        );
        const data = await response.json();
        if (data.code !== 200 || !data.data) {
            listEl.innerHTML = `<div class="feedback-empty">${escapeFeedbackHtml(data.msg || '加载失败')}</div>`;
            if (pagerEl) pagerEl.innerHTML = '';
            return;
        }
        const list = data.data.list || [];
        FeedbackState.total = data.data.total != null ? data.data.total : 0;
        if (list.length === 0) {
            listEl.innerHTML = '<div class="feedback-empty">暂无反馈记录，去「提交反馈」告诉我们吧</div>';
        } else {
            listEl.innerHTML = list.map((item) => {
                const status = item.status != null ? Number(item.status) : 0;
                const created = item.createdAt || item.created_at || '';
                const reply = item.adminReply || item.admin_reply || '';
                const repliedAt = item.repliedAt || item.replied_at || '';
                const cat = feedbackCategoryText(item.category);
                let replyHtml = '';
                if (reply) {
                    replyHtml = `<div class="feedback-item-reply">
                        <div class="feedback-item-reply-label">处理结果${repliedAt ? ' · ' + escapeFeedbackHtml(String(repliedAt).replace('T', ' ').substring(0, 19)) : ''}</div>
                        <div class="feedback-item-content">${escapeFeedbackHtml(reply)}</div>
                    </div>`;
                } else if (status === 0 || status === 1) {
                    replyHtml = '<div class="feedback-item-reply"><div class="feedback-item-reply-label">处理结果</div><div class="feedback-item-content" style="color:var(--text-secondary);">暂未回复，请耐心等待</div></div>';
                }
                return `<div class="feedback-item">
                    <div class="feedback-item-head">
                        <div class="feedback-item-title">${escapeFeedbackHtml(item.title || '')}</div>
                        <span class="feedback-status status-${status}">${feedbackStatusText(status)}</span>
                    </div>
                    <div class="feedback-item-meta">${escapeFeedbackHtml(cat)} · ${escapeFeedbackHtml(String(created).replace('T', ' ').substring(0, 19))}</div>
                    <div class="feedback-item-content">${escapeFeedbackHtml(item.content || '')}</div>
                    ${replyHtml}
                </div>`;
            }).join('');
        }
        renderFeedbackMinePager();
    } catch (e) {
        console.error(e);
        listEl.innerHTML = '<div class="feedback-empty">加载失败，请稍后重试</div>';
        if (pagerEl) pagerEl.innerHTML = '';
    }
}

function renderFeedbackMinePager() {
    const pagerEl = document.getElementById('feedbackMinePager');
    if (!pagerEl) return;
    const total = FeedbackState.total || 0;
    const size = FeedbackState.pageSize || 8;
    const page = FeedbackState.page || 1;
    const totalPages = Math.max(1, Math.ceil(total / size));
    if (total <= size) {
        pagerEl.innerHTML = total ? `<span style="font-size:12px;color:var(--text-secondary);">共 ${total} 条</span>` : '';
        return;
    }
    let html = '';
    if (page > 1) {
        html += `<button type="button" class="btn btn-outline btn-sm" onclick="FeedbackState.page=${page - 1};loadMyFeedbackList();">上一页</button>`;
    }
    html += `<span style="font-size:12px;color:var(--text-secondary);">第 ${page} / ${totalPages} 页</span>`;
    if (page < totalPages) {
        html += `<button type="button" class="btn btn-outline btn-sm" onclick="FeedbackState.page=${page + 1};loadMyFeedbackList();">下一页</button>`;
    }
    pagerEl.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
    const submitTab = document.getElementById('feedbackTabSubmit');
    const mineTab = document.getElementById('feedbackTabMine');
    if (submitTab) {
        submitTab.addEventListener('click', () => switchFeedbackTab('submit'));
    }
    if (mineTab) {
        mineTab.addEventListener('click', () => switchFeedbackTab('mine'));
    }
    const feedbackModal = document.getElementById('feedbackModal');
    if (feedbackModal) {
        feedbackModal.addEventListener('click', (e) => {
            if (e.target === feedbackModal) closeFeedbackModal();
        });
    }
});
