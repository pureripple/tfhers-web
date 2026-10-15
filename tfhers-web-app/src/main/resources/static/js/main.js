// 蹄斗族群助手 - 主要JavaScript功能

// 全局状态管理
const AppState = {
    currentPage: 'news',
    isLoggedIn: false,
    user: null,
    characters: [],
    articles: [],
    apiBaseUrl: 'http://localhost:8080', // app API地址
    managementApiUrl: 'http://localhost:8081', // 管理系统API地址

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
    navToggle: document.getElementById('navToggle'),
    navLinks: document.querySelectorAll('.nav-link'),
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
    // 首次进入首页不弹全屏 loading，避免从 AI 助手等页整页跳转时出现连续两次遮罩闪烁
    await loadCharacters({ silent: true });
    checkLoginStatus();
    await loadArticles({ silent: true });
    // 渲染内容
    renderArticles(AppState.articles);
    renderCharacters(AppState.characters);
    const initialPage = getPageIdFromRouting();
    showPage(initialPage);
    normalizeIndexTabInUrl(initialPage);
}

// 设置事件监听器
function setupEventListeners() {
    // 导航切换
    elements.navToggle.addEventListener('click', toggleNavMenu);
    
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
    
    // 头像预览
    const avatarInput = document.getElementById('regAvatar');
    if (avatarInput) {
        avatarInput.addEventListener('change', previewAvatar);
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
    
    // 模态框：不响应点击遮罩关闭，仅保留 Esc（见下方 keydown）
    // 键盘事件
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// 切换导航菜单
function toggleNavMenu() {
    elements.navMenu.classList.toggle('active');
    elements.navToggle.classList.toggle('active');
}

// 关闭导航菜单
function closeNavMenu() {
    elements.navMenu.classList.remove('active');
    elements.navToggle.classList.remove('active');
}

/** 与导航锚点一致：#news、#characters、#my、#ai-chat；非法或空则默认资讯 */
function getPageIdFromHash() {
    const raw = (location.hash || '').replace(/^#/, '').trim();
    if (raw === 'news' || raw === 'characters' || raw === 'my' || raw === 'ai-chat') return raw;
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
        if (tab === 'news' || tab === 'characters' || tab === 'my' || tab === 'ai-chat') return tab;
    } catch (e) { /* ignore */ }
    return getPageIdFromHash();
}

/** 去掉 ?tab=，把地址规范成 path#板块，避免与 hash 双轨冲突 */
function normalizeIndexTabInUrl(pageId) {
    if (pageId !== 'news' && pageId !== 'characters' && pageId !== 'my' && pageId !== 'ai-chat') return;
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
        case 'my':
            loadUserContent();
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
    if (raw == null) return '/images/default-avatar.png';
    const s = String(raw).trim();
    if (!s) return '/images/default-avatar.png';
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
                        <img src="${avatarUrl}" alt="" class="article-author-avatar" width="40" height="40" loading="lazy" onerror="this.onerror=null;this.src='/images/default-avatar.png'">
                        <span class="article-author-name">${authorName}</span>
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
        return `<div class="pinned-news-item" role="button" tabindex="0" onclick="showArticle(${a.id})">
            <img class="pinned-news-thumb" src="${cover}" alt="" loading="lazy" onerror="this.src='/images/default-article.jpg'">
            <div class="pinned-news-text">
                <div class="pinned-news-item-title">${title}</div>
                <div class="pinned-news-item-meta">${author}</div>
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
        return `<div class="hot-news-item ${idx === idxToShow ? 'active' : ''}" data-idx="${idx}" role="group" aria-roledescription="slide" aria-label="${idx + 1} / ${top.length}" onclick="showArticle(${a.id})">
            <img src="${cover}" alt="" class="hot-news-cover" onerror="this.src='/images/default-article.jpg'">
            <div class="hot-news-overlay">
                <img src="${avatar}" alt="" class="hot-news-author-avatar" onerror="this.src='/images/default-avatar.png'">
                <div class="hot-news-meta">
                    <div class="hot-news-author">${author} · ${view} 阅读</div>
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
                    const authorAvatar = combo.authorAvatar || combo.author_avatar || '/images/default-avatar.png';
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
                                            <img src="${authorAvatar}" alt="" class="user-combo-avatar" onerror="this.src='/images/default-avatar.png'">
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
            const authorAvatarUrl = article.author_avatar_url || article.authorAvatarUrl || '/images/default-avatar.png';
            const authorName = article.author || '匿名';
            const summaryText = article.summary || article.excerpt || '暂无摘要';
            const contentHtml = article.content || '<p>暂无内容</p>';
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
                                <img src="${coverUrl}" alt="${escHtml(article.title)}" class="article-detail-cover-img" onerror="this.src='/images/default-article.jpg'">
                                <div class="article-detail-glassbar">
                                    <div class="article-detail-author">
                                        <img src="${authorAvatarUrl}" alt="" class="article-detail-author-avatar" onerror="this.src='/images/default-avatar.png'">
                                        <div class="article-detail-author-name">${escHtml(authorName)}</div>
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

// 加载文章评论列表
async function loadArticleComments(articleId) {
    const listEl = document.getElementById('articleCommentList');
    if (!listEl) return;
    try {
        const response = await fetch(`${AppState.apiBaseUrl}/api/articles/${articleId}/comments`);
        const result = await response.json();
        const comments = (result.code === 200 && result.data) ? result.data : [];
        listEl.innerHTML = renderCommentTree(comments);
        listEl.querySelectorAll('.comment-reply-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const parentId = btn.getAttribute('data-parent-id');
                const parentEl = document.getElementById('articleCommentParentId');
                if (parentEl) parentEl.value = parentId || '';
                const textarea = document.getElementById('articleCommentContent');
                if (textarea) { textarea.placeholder = '回复评论…'; textarea.focus(); }
            });
        });
        listEl.querySelectorAll('.comment-report-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const commentId = btn.getAttribute('data-comment-id');
                if (!commentId) return;
                showCommentReportDialog(parseInt(commentId, 10));
            });
        });
    } catch (e) {
        listEl.innerHTML = '<p class="comment-empty">加载评论失败</p>';
    }
}

function renderCommentTree(comments) {
    if (!comments || comments.length === 0) return '<p class="comment-empty">暂无评论</p>';
    return comments.map(c => renderOneComment(c)).join('');
}

function renderOneComment(c) {
    const avatar = (c.authorAvatar || '/images/default-avatar.png');
    const time = c.created_at ? formatDate(c.created_at) : (c.createdAt ? formatDate(c.createdAt) : '');
    const repliesHtml = (c.replies && c.replies.length) ? c.replies.map(r => renderOneComment(r)).join('') : '';
    const escHtml = (v) => String(v == null ? '' : v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const escAttr = (v) => escHtml(v).replace(/"/g, '&quot;');

    // 支持内容中携带的图片 token：[[img:url]]
    const rawContent = c.content || '';
    const imgRe = /\[\[img:([^\]]+)\]\]/g;
    let contentHtml = '';
    let last = 0;
    let m = null;
    while ((m = imgRe.exec(rawContent)) !== null) {
        const textPart = rawContent.slice(last, m.index);
        contentHtml += escHtml(textPart).replace(/\n/g, '<br>');
        const imgUrl = m[1];
        contentHtml += `<img class="comment-image" src="${escAttr(imgUrl)}" alt="" loading="lazy" onerror="this.style.display='none';">`;
        last = m.index + m[0].length;
    }
    contentHtml += escHtml(rawContent.slice(last)).replace(/\n/g, '<br>');
    return `
        <div class="comment-item" data-comment-id="${c.id}">
            <div class="comment-avatar-wrap">
                <img src="${avatar}" alt="" class="comment-avatar" onerror="this.src='/images/default-avatar.png'">
            </div>
            <div class="comment-body">
                <span class="comment-author">${(c.authorName || '用户').replace(/</g, '&lt;')}</span>
                <span class="comment-time">${time}</span>
                <p class="comment-content">${contentHtml}</p>
                <div class="comment-actions">
                    <button type="button" class="comment-reply-btn link-btn" data-parent-id="${c.id}">回复</button>
                    <button type="button" class="comment-report-btn link-btn" data-comment-id="${c.id}">举报</button>
                </div>
                ${repliesHtml ? `<div class="comment-replies">${repliesHtml}</div>` : ''}
            </div>
        </div>
    `;
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
            if (parentIdEl) parentIdEl.value = '';
            if (imageInputEl) imageInputEl.value = '';
            if (contentEl) contentEl.placeholder = '写下你的评论…';
            await loadArticleComments(articleId);
        } else {
            alert(result.msg || '评论失败');
        }
    } catch (e) {
        alert('评论失败，请检查网络或登录状态');
    }
}

// 显示登录模态框
function showLoginModal() {
    if (elements.loginModal) {
        elements.loginModal.style.display = 'block';
    }
}

// 关闭登录模态框
function closeLoginModal() {
    elements.loginModal.style.display = 'none';
}

/**
 * 未登录时的轻提示：感叹号 + 请先登录
 * - 点击遮罩/按钮关闭
 * - 自动 1.2s 关闭
 */
function showLoginRequiredHint() {
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
    elements.registerModal.style.display = 'block';
}

// 关闭注册模态框
function closeRegisterModal() {
    elements.registerModal.style.display = 'none';
}

// 切换到注册模态框
function switchToRegister() {
    closeLoginModal();
    showRegisterModal();
}

// 切换到登录模态框
function switchToLogin() {
    closeRegisterModal();
    showLoginModal();
}

// 头像预览
function previewAvatar(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('avatarPreview');
            const previewImg = document.getElementById('previewImg');
            previewImg.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
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
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        alert('请输入用户名和密码');
        return;
    }
    
    try {
        showLoading();
        
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
            alert('登录成功！');
            
            // 重新加载文章数据（现在需要登录）
            await loadArticles();
            renderArticles(AppState.articles);
            if (AppState.currentPage === 'ai-chat' && typeof window.mountAiChatPanel === 'function') {
                window.mountAiChatPanel();
            }
        } else {
            alert('登录失败：' + result.msg);
        }
    } catch (error) {
        console.error('登录错误:', error);
        alert('登录失败，请检查网络连接');
    } finally {
        hideLoading();
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
            localStorage.setItem('user', JSON.stringify(AppState.user));
            AppState.user.steamAchievements = { achieved: 0, total: 0 };
            applySteamPanelUI();
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
        ['username', 'nickname', 'email', 'phone', 'avatarUrl'].forEach((k) => {
            if (d[k] !== undefined && d[k] !== null) {
                AppState.user[k] = d[k];
            }
        });
        if ('steamId' in d) AppState.user.steamId = d.steamId;
        if ('steamPersonaName' in d) AppState.user.steamPersonaName = d.steamPersonaName;
        if ('steamAvatarUrl' in d) AppState.user.steamAvatarUrl = d.steamAvatarUrl;
        if ('steamPlaytimeMinutes' in d) AppState.user.steamPlaytimeMinutes = d.steamPlaytimeMinutes;

        localStorage.setItem('user', JSON.stringify(AppState.user));

        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar && AppState.user.avatarUrl) {
            userAvatar.src = AppState.user.avatarUrl;
        }
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
    const achvEl = document.getElementById('steamAchievements');
    if (!achvEl) return;
    try {
        const url = `${AppState.managementApiUrl}/api/user/steam/achievements${forceRefresh ? '?force=1' : ''}`;
        const resp = await fetch(url, {
            headers: { 'Authorization': `Bearer ${AppState.user.token}` }
        });
        const result = await resp.json();
        if (result.code === 200 && result.data) {
            renderSteamAchievements(result.data);
        } else {
            achvEl.innerHTML = '';
        }
    } catch (e) {
        console.error('加载 Steam 成就失败', e);
    }
}

function renderSteamAchievements(data) {
    const achvEl = document.getElementById('steamAchievements');
    if (!achvEl) return;
    const total = data.total || 0;
    const achieved = data.achieved || 0;
    if (AppState.user) {
        AppState.user.steamAchievements = { achieved, total };
    }
    const rawList = Array.isArray(data.achievements) ? data.achievements : [];
    if (!total) {
        achvEl.innerHTML = `<div class="achv-empty">暂无成就数据</div>`;
        return;
    }

    // 展开/收起状态（默认收起）
    if (AppState.user && typeof AppState.user.steamAchievementsExpanded !== 'boolean') {
        AppState.user.steamAchievementsExpanded = false;
    }
    const expanded = !!(AppState.user && AppState.user.steamAchievementsExpanded);

    // 排序：点亮的在前；同组内按名称/ApiName 排
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

    const itemsHtml = visibleList.length
        ? `<div class="achv-grid achv-grid--all">
            ${visibleList.map(a => {
                // 兼容旧接口：旧格式没有 achieved 字段，此时列表本身就是“已获得”
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
        ? `<button type="button" class="achv-toggle" id="achvToggleBtn">
                ${toggleText}
           </button>`
        : `<span>共 ${list.length} 个</span>`;
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
    updateMyStatsPanel();
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
            localStorage.setItem('user', JSON.stringify(AppState.user));
            applySteamPanelUI({ skipLoadAchievements: true });
            loadSteamAchievements(true);
            updateMyStatsPanel();
        } else if (result.code === 400) {
            AppState.user.steamId = null;
            AppState.user.steamPersonaName = null;
            AppState.user.steamAvatarUrl = null;
            AppState.user.steamPlaytimeMinutes = null;
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
    
    const formData = new FormData();
    formData.append('username', document.getElementById('regUsername').value);
    formData.append('nickname', document.getElementById('regNickname').value);
    formData.append('password', document.getElementById('regPassword').value);
    formData.append('email', document.getElementById('regEmail').value);
    formData.append('phone', document.getElementById('regPhone').value);
    
    const avatarFile = document.getElementById('regAvatar').files[0];
    if (avatarFile) {
        formData.append('avatar', avatarFile);
    }
    
    if (!formData.get('username') || !formData.get('nickname') || !formData.get('password')) {
        alert('请填写必填字段');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`${AppState.managementApiUrl}/api/user/register`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            console.log('注册成功，用户数据:', result.data);
            alert('注册成功！请登录');
            closeRegisterModal();
            showLoginModal();
        } else {
            alert('注册失败：' + result.msg);
        }
    } catch (error) {
        console.error('注册错误:', error);
        alert('注册失败，请检查网络连接');
    } finally {
        hideLoading();
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
    alert('设置入口：账号与安全、关于（后续可接独立设置页）');
}

function updateMyStatsPanel() {
    const articleEl = document.getElementById('myArticleCount');
    const comboEl = document.getElementById('myComboCount');
    const achvEl = document.getElementById('myAchievementCount');
    const playtimeEl = document.getElementById('myPlaytimeHours');
    if (articleEl) articleEl.textContent = String(AppState.myStats.articleCount || 0);
    if (comboEl) comboEl.textContent = String(AppState.myStats.comboCount || 0);

    if (achvEl) {
        const a = AppState.user && AppState.user.steamAchievements;
        if (a && typeof a.achieved === 'number' && typeof a.total === 'number') {
            achvEl.textContent = `${a.achieved}/${a.total}`;
        } else {
            achvEl.textContent = '0/0';
        }
    }
    if (playtimeEl) {
        const minutes = AppState.user && AppState.user.steamPlaytimeMinutes ? AppState.user.steamPlaytimeMinutes : 0;
        const hours = Math.round((minutes / 60.0) * 10) / 10;
        playtimeEl.textContent = `${hours}h`;
    }
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
    if (AppState.isLoggedIn && AppState.user) {
        elements.loginSection.style.display = 'none';
        elements.userSection.style.display = 'block';
        
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        const userSignature = document.getElementById('userSignature');
        
        if (userName) userName.textContent = AppState.user.nickname || AppState.user.username;
        if (userSignature) userSignature.textContent = AppState.user.signature || '这个人很懒，还没有个性签名';
        if (userAvatar) {
            const avatarUrl = AppState.user.avatarUrl || '/images/default-avatar.png';
            console.log('设置头像URL:', avatarUrl);
            userAvatar.src = avatarUrl;
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
        // 保存到localStorage
        localStorage.setItem('user', JSON.stringify(AppState.user));
    } else {
        elements.loginSection.style.display = 'block';
        elements.userSection.style.display = 'none';
        localStorage.removeItem('user');
    }
}

// 显示创建文章
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