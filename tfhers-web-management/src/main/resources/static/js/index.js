// 蹄斗族群助手 - 后台管理系统JavaScript功能

// 全局状态管理
const AppState = {
    currentPage: 'articles',
    // 文章相关状态
    articles: [],
    filteredArticles: [],
    currentPageNum: 1,
    pageSize: 10,
    totalPages: 0,
    searchKeyword: '',
    deleteArticleId: null,
    editArticleId: null,
    // 角色相关状态
    characters: [],
    // 官方连段管理相关状态
    officialCombos: [],
    selectedOfficialComboCharacterId: null,
    // 用户连段审核
    userCombos: [],
    // 举报审核
    reportsList: [],
    reportsPage: 1,
    reportsPageSize: 10,
    reportsTotal: 0,
    // 举报审核弹窗上下文（资讯举报 or 评论审核合并）
    reportStatusContext: null,
    // 评论审核
    commentReviewList: [],
    commentReviewPage: 1,
    commentReviewPageSize: 10,
    commentReviewTotal: 0,
    // 登录状态
    isLoggedIn: false,
    user: null,
    token: null,
    /** ECharts 实例：Steam 时长统计 */
    steamPlaytimeCharts: { top10: null, histogram: null },
    /** 本站成就解锁率直方图 */
    siteAchievementHistogram: null,
    /** 内容量与待办对比柱状图 */
    overviewKpiChart: null
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

function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

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
    insertAddArticleImageBtn: document.getElementById('insertAddArticleImageBtn'),
    addArticleContentImageInput: document.getElementById('addArticleContentImageInput'),
    editArticleModal: document.getElementById('editArticleModal'),
    editArticleForm: document.getElementById('editArticleForm'),
    confirmEditBtn: document.getElementById('confirmEditBtn'),
    insertEditArticleImageBtn: document.getElementById('insertEditArticleImageBtn'),
    editArticleContentImageInput: document.getElementById('editArticleContentImageInput'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    messageToast: document.getElementById('messageToast'),
    messageText: document.getElementById('messageText'),
    // 角色管理相关元素
    charactersTableBody: document.getElementById('charactersTableBody'),
    characterCount: document.getElementById('characterCount'),
    addCharacterBtn: document.getElementById('addCharacterBtn'),
    refreshCharactersBtn: document.getElementById('refreshCharactersBtn'),
    characterModal: document.getElementById('characterModal'),
    characterForm: document.getElementById('characterForm'),
    characterModalTitle: document.getElementById('characterModalTitle'),
    confirmCharacterSaveBtn: document.getElementById('confirmCharacterSaveBtn'),
    // 官方连段管理相关元素
    officialComboCharacterSelect: document.getElementById('officialComboCharacterSelect'),
    officialCombosTableBody: document.getElementById('officialCombosTableBody'),
    addOfficialComboBtn: document.getElementById('addOfficialComboBtn'),
    refreshOfficialCombosBtn: document.getElementById('refreshOfficialCombosBtn'),
    officialComboModal: document.getElementById('officialComboModal'),
    officialComboForm: document.getElementById('officialComboForm'),
    officialComboModalTitle: document.getElementById('officialComboModalTitle'),
    confirmOfficialComboSaveBtn: document.getElementById('confirmOfficialComboSaveBtn'),
    // 用户连段审核
    userComboStatusFilter: document.getElementById('userComboStatusFilter'),
    userCombosTableBody: document.getElementById('userCombosTableBody'),
    refreshUserCombosBtn: document.getElementById('refreshUserCombosBtn'),
    // 举报审核
    reportStatusFilter: document.getElementById('reportStatusFilter'),
    reportTargetTypeFilter: document.getElementById('reportTargetTypeFilter'),
    reportsTableBody: document.getElementById('reportsTableBody'),
    refreshReportsBtn: document.getElementById('refreshReportsBtn'),
    reportsPagination: document.getElementById('reportsPagination'),
    reportStatusModal: document.getElementById('reportStatusModal'),
    reportStatusModalId: document.getElementById('reportStatusModalId'),
    reportStatusSelect: document.getElementById('reportStatusSelect'),
    reportAdminRemark: document.getElementById('reportAdminRemark'),
    confirmReportStatusBtn: document.getElementById('confirmReportStatusBtn'),
    // 评论审核
    commentReviewStatusFilter: document.getElementById('commentReviewStatusFilter'),
    commentReviewArticleId: document.getElementById('commentReviewArticleId'),
    commentReviewTableBody: document.getElementById('commentReviewTableBody'),
    refreshCommentReviewBtn: document.getElementById('refreshCommentReviewBtn'),
    commentReviewPagination: document.getElementById('commentReviewPagination'),
    commentReviewModal: document.getElementById('commentReviewModal'),
    commentReviewModalId: document.getElementById('commentReviewModalId'),
    commentReviewStatusSelect: document.getElementById('commentReviewStatusSelect'),
    commentReviewAdminRemark: document.getElementById('commentReviewAdminRemark'),
    confirmCommentReviewBtn: document.getElementById('confirmCommentReviewBtn'),
    refreshStatisticsBtn: document.getElementById('refreshStatisticsBtn'),
    // 游戏管理
    syncSteamAchievementSchemaBtn: document.getElementById('syncSteamAchievementSchemaBtn')
};

// 初始化应用
function initApp() {
    checkLoginStatus();
    setupEventListeners();
    loadArticles();
    // 从 URL hash 恢复页面（从用户管理/个人设置点「系统设置」等链接进来时直接显示对应页）
    const hash = window.location.hash.replace(/^#/, '');
    const validPages = ['articles', 'characters', 'user-combos', 'reports', 'comment-review', 'statistics', 'games'];
    const pageId = hash && validPages.includes(hash) ? hash : 'articles';
    showPage(pageId);

    window.addEventListener('hashchange', () => {
        const h = window.location.hash.replace(/^#/, '');
        if (h && validPages.includes(h)) {
            showPage(h);
        }
    });
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
    
    // 刷新按钮（文章）
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

    // 编辑文章确认按钮
    if (elements.confirmEditBtn) {
        elements.confirmEditBtn.addEventListener('click', confirmEditArticle);
    }

    // 新增文章正文插图按钮
    if (elements.insertAddArticleImageBtn && elements.addArticleContentImageInput) {
        elements.insertAddArticleImageBtn.addEventListener('click', () => {
            elements.addArticleContentImageInput.click();
        });
        elements.addArticleContentImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                uploadContentImageAndInsert(file, 'articleContent');
            }
        });
    }

    // 编辑文章正文插图按钮
    if (elements.insertEditArticleImageBtn && elements.editArticleContentImageInput) {
        elements.insertEditArticleImageBtn.addEventListener('click', () => {
            elements.editArticleContentImageInput.click();
        });
        elements.editArticleContentImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                uploadContentImageAndInsert(file, 'editArticleContent');
            }
        });
    }
    
    // 角色管理按钮
    if (elements.addCharacterBtn) {
        elements.addCharacterBtn.addEventListener('click', () => showCharacterModal(null));
    }

    if (elements.refreshCharactersBtn) {
        elements.refreshCharactersBtn.addEventListener('click', () => {
            loadCharacters();
        });
    }

    if (elements.confirmCharacterSaveBtn) {
        elements.confirmCharacterSaveBtn.addEventListener('click', saveCharacter);
    }

    // 用户连段审核
    if (elements.userComboStatusFilter) {
        elements.userComboStatusFilter.addEventListener('change', () => loadUserCombos());
    }
    if (elements.refreshUserCombosBtn) {
        elements.refreshUserCombosBtn.addEventListener('click', () => loadUserCombos());
    }

    // 举报审核
    if (elements.reportStatusFilter) {
        elements.reportStatusFilter.addEventListener('change', () => { AppState.reportsPage = 1; loadReports(); });
    }
    if (elements.reportTargetTypeFilter) {
        elements.reportTargetTypeFilter.addEventListener('change', () => { AppState.reportsPage = 1; loadReports(); });
    }
    if (elements.refreshReportsBtn) {
        elements.refreshReportsBtn.addEventListener('click', () => loadReports());
    }
    if (elements.confirmReportStatusBtn) {
        elements.confirmReportStatusBtn.addEventListener('click', confirmReportStatus);
    }

    if (elements.commentReviewStatusFilter) {
        elements.commentReviewStatusFilter.addEventListener('change', () => {
            AppState.commentReviewPage = 1;
            loadCommentReview();
        });
    }
    if (elements.commentReviewArticleId) {
        elements.commentReviewArticleId.addEventListener('change', () => {
            AppState.commentReviewPage = 1;
            loadCommentReview();
        });
    }
    if (elements.refreshCommentReviewBtn) {
        elements.refreshCommentReviewBtn.addEventListener('click', () => loadCommentReview());
    }
    if (elements.confirmCommentReviewBtn) {
        elements.confirmCommentReviewBtn.addEventListener('click', confirmCommentReview);
    }

    if (elements.refreshStatisticsBtn) {
        elements.refreshStatisticsBtn.addEventListener('click', () => loadStatisticsDashboard());
    }

    // 游戏管理：同步 Steam 全量成就（schema → OSS → DB）
    if (elements.syncSteamAchievementSchemaBtn) {
        elements.syncSteamAchievementSchemaBtn.addEventListener('click', async () => {
            if (!AppState.token) {
                showMessage('请先登录');
                return;
            }
            const lastEl = document.getElementById('steamAchievementSchemaLastSync');
            const upsertedEl = document.getElementById('steamAchievementSchemaUpserted');
            const totalEl = document.getElementById('steamAchievementSchemaTotal');
            try {
                showLoading();
                const r = await fetch('/api/admin/games/steam/achievements/sync', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + AppState.token }
                });
                const j = await r.json();
                if (j.code === 200 && j.data) {
                    if (lastEl) lastEl.textContent = j.data.updatedAt || '刚刚';
                    if (upsertedEl) upsertedEl.textContent = j.data.upserted != null ? String(j.data.upserted) : '—';
                    if (totalEl) totalEl.textContent = j.data.total != null ? String(j.data.total) : '—';
                    showMessage(j.msg || '同步成功');
                } else {
                    showMessage(j.msg || '同步失败');
                }
            } catch (e) {
                console.error('同步成就 schema 失败', e);
                showMessage('同步失败，请稍后重试');
            } finally {
                hideLoading();
            }
        });
    }

    // 图片上传功能
    setupImageUpload();
    
    // 用户菜单
    setupUserMenu();
    
    // 模态框：不响应点击遮罩关闭，仅保留 Esc（见下方 keydown）
    // 键盘事件
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDeleteModal();
            closeAddArticleModal();
            closeCharacterModal();
            closeReportStatusModal();
            closeCommentReviewModal();
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
        'user-combos': '用户连段审核',
        'reports': '举报审核',
        'comment-review': '评论审核',
        'statistics': '数据统计',
        'games': '游戏管理'
    };
    
    if (elements.pageTitle) {
        elements.pageTitle.textContent = pageTitles[pageId] || '后台管理';
    }
    
    // 根据页面加载相应内容
    if (pageId === 'articles') {
        loadArticles();
    } else if (pageId === 'characters') {
        loadCharacters();
    } else if (pageId === 'user-combos') {
        loadUserCombos();
    } else if (pageId === 'reports') {
        loadReports();
    } else if (pageId === 'comment-review') {
        loadCommentReview();
    } else if (pageId === 'statistics') {
        loadStatisticsDashboard();
    } else if (pageId === 'games') {
        // 游戏管理：暂不自动加载
    }

    if (pageId && window.history && window.history.replaceState) {
        try {
            window.history.replaceState(null, '', '#' + pageId);
        } catch (e) { /* ignore */ }
    }
}

/**
 * 数据统计页：先拉取若干 KPI，图表区域预留（后续可接 Chart.js / ECharts）
 */
async function loadStatisticsDashboard() {
    const authHeaders = { 'Authorization': 'Bearer ' + AppState.token };
    const setKpi = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    showLoading();
    try {
        const ar = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.getAll}`, { headers: authHeaders });
        const ard = await ar.json();
        const articleCount = ard.code === 200 && Array.isArray(ard.data) ? ard.data.length : null;
        setKpi('statKpiArticles', articleCount != null ? String(articleCount) : '—');

        const comboRes = await fetch('/api/admin/combos/list?status=pending', { headers: authHeaders });
        const comboData = await comboRes.json();
        const pendingCombos = comboData.code === 200 && Array.isArray(comboData.data) ? comboData.data.length : null;
        setKpi('statKpiCombosPending', pendingCombos != null ? String(pendingCombos) : '—');

        const repRes = await fetch('/api/admin/reports/list?page=1&size=1&status=0', { headers: authHeaders });
        const repData = await repRes.json();
        const repTotal = repData.code === 200 && repData.data && repData.data.total != null ? repData.data.total : null;
        setKpi('statKpiReportsOpen', repTotal != null ? String(repTotal) : '—');

        const cmtRes = await fetch('/api/admin/article-comments/list?page=1&size=1&status=0', { headers: authHeaders });
        const cmtData = await cmtRes.json();
        const cmtTotal = cmtData.code === 200 && cmtData.data && cmtData.data.total != null ? cmtData.data.total : null;
        setKpi('statKpiCommentsPending', cmtTotal != null ? String(cmtTotal) : '—');

        renderOverviewKpiBarChart({
            articles: articleCount,
            combosPending: pendingCombos,
            reportsOpen: repTotal,
            commentsPending: cmtTotal
        });

        const lu = document.getElementById('statisticsLastUpdated');
        if (lu) lu.textContent = new Date().toLocaleString('zh-CN');

        const steamRes = await fetch('/api/admin/statistics/steam-playtime', { headers: authHeaders });
        const steamJson = await steamRes.json();
        if (steamJson.code === 200 && steamJson.data) {
            renderSteamPlaytimeCharts(steamJson.data);
        } else {
            disposeSteamPlaytimeCharts();
            console.warn('Steam 时长统计:', steamJson.msg || steamJson);
        }

        const achSiteRes = await fetch('/api/admin/statistics/steam-achievements-site', { headers: authHeaders });
        const achSiteJson = await achSiteRes.json();
        if (achSiteJson.code === 200 && achSiteJson.data) {
            renderSiteAchievementUnlockTable(achSiteJson.data);
        } else {
            renderSiteAchievementUnlockTable(null, achSiteJson.msg || '加载失败');
        }
    } catch (e) {
        console.error('loadStatisticsDashboard', e);
        showMessage('加载数据统计失败，请稍后重试', 'error');
    } finally {
        hideLoading();
    }
}

function truncateStatLabel(str, maxLen) {
    if (str == null || str === '') return '';
    const s = String(str);
    return s.length <= maxLen ? s : s.slice(0, maxLen) + '…';
}

function disposeSteamPlaytimeCharts() {
    const c = AppState.steamPlaytimeCharts;
    if (c.top10) {
        try { c.top10.dispose(); } catch (e) { /* ignore */ }
        c.top10 = null;
    }
    if (c.histogram) {
        try { c.histogram.dispose(); } catch (e) { /* ignore */ }
        c.histogram = null;
    }
}

function disposeSiteAchievementUnlockHistogram() {
    if (AppState.siteAchievementHistogram) {
        try { AppState.siteAchievementHistogram.dispose(); } catch (e) { /* ignore */ }
        AppState.siteAchievementHistogram = null;
    }
}

function disposeOverviewKpiChart() {
    if (AppState.overviewKpiChart) {
        try { AppState.overviewKpiChart.dispose(); } catch (e) { /* ignore */ }
        AppState.overviewKpiChart = null;
    }
}

/**
 * KPI 概览柱状图（与 loadStatisticsDashboard 拉取的数值一致）
 */
function renderOverviewKpiBarChart(raw) {
    if (typeof echarts === 'undefined') {
        console.warn('ECharts 未加载，跳过概览图');
        return;
    }
    const el = document.getElementById('overviewKpiBarChart');
    if (!el) return;

    const n = (v) => (v != null && !Number.isNaN(Number(v)) ? Number(v) : 0);

    disposeOverviewKpiChart();
    const chart = echarts.init(el);
    AppState.overviewKpiChart = chart;

    const categories = ['资讯总数', '连段待审', '举报待处理', '评论待审'];
    const values = [
        n(raw.articles),
        n(raw.combosPending),
        n(raw.reportsOpen),
        n(raw.commentsPending)
    ];
    const colors = ['#ff7a7a', '#5fd9cc', '#f0b429', '#7eb6ff'];

    chart.setOption({
        backgroundColor: 'transparent',
        textStyle: { color: '#a5a5b0', fontFamily: 'system-ui, "Segoe UI", sans-serif' },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params) => {
                const p = params && params[0];
                return p ? `${p.name}<br/>数量：<b>${p.value}</b>` : '';
            }
        },
        grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
        xAxis: {
            type: 'category',
            data: categories,
            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.12)' } },
            axisLabel: { color: '#a5a5b0', fontSize: 12 }
        },
        yAxis: {
            type: 'value',
            minInterval: 1,
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)', type: 'dashed' } },
            axisLabel: { color: '#6e6e7a' }
        },
        series: [{
            type: 'bar',
            data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: [6, 6, 0, 0] } })),
            barMaxWidth: 48,
            label: { show: true, position: 'top', color: '#f3f3f6', formatter: (p) => p.value }
        }]
    });
}

/**
 * 渲染 Steam 时长 Top10 条形图 + 分段直方图（依赖 ECharts CDN）
 */

const SITE_ACHIEVEMENT_UNLOCK_BIN_LABELS = [
    '0–10%', '10–20%', '20–30%', '30–40%', '40–50%',
    '50–60%', '60–70%', '70–80%', '80–90%', '90–100%'
];

function siteAchievementUnlockRatePercent(row, sampleSize) {
    const n = row.unlockedCount != null ? Number(row.unlockedCount) : 0;
    if (row.ratePercent != null) return Number(row.ratePercent);
    if (sampleSize > 0) return Math.round((n / sampleSize) * 10000) / 100;
    return 0;
}

function siteAchievementUnlockHistogramCounts(list, sampleSize) {
    const counts = new Array(10).fill(0);
    for (const row of list) {
        const pct = siteAchievementUnlockRatePercent(row, sampleSize);
        let idx;
        if (pct >= 100) idx = 9;
        else idx = Math.min(9, Math.max(0, Math.floor(pct / 10)));
        counts[idx]++;
    }
    return counts;
}

/**
 * 数据统计页：本站成就解锁率直方图 + 明细表（/api/admin/statistics/steam-achievements-site）
 */
function renderSiteAchievementUnlockTable(data, errMsg) {
    const tbody = document.getElementById('siteAchievementStatsBody');
    const meta = document.getElementById('siteAchievementStatsMeta');
    const chartEl = document.getElementById('siteAchievementUnlockHistogramChart');
    if (!tbody) return;

    disposeSiteAchievementUnlockHistogram();

    if (!data) {
        tbody.innerHTML = `<tr><td colspan="4" style="color: rgba(255,180,180,0.9);">${escapeHtml(errMsg || '暂无数据')}</td></tr>`;
        if (meta) meta.textContent = '—';
        if (chartEl && typeof echarts !== 'undefined') {
            AppState.siteAchievementHistogram = echarts.init(chartEl);
            AppState.siteAchievementHistogram.setOption({
                title: {
                    text: errMsg || '暂无数据',
                    left: 'center',
                    top: 'middle',
                    textStyle: { color: 'rgba(255,255,255,0.45)', fontSize: 14 }
                },
                xAxis: { show: false },
                yAxis: { show: false },
                series: []
            });
        }
        return;
    }
    const sampleSize = data.sampleSize != null ? Number(data.sampleSize) : 0;
    const note = data.note ? String(data.note) : '';
    if (meta) {
        meta.textContent = `样本用户：${sampleSize} 人${note ? '。' + note : ''}`;
    }
    const list = Array.isArray(data.achievements) ? data.achievements : [];
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="color: rgba(255,255,255,0.5);">暂无成就条目（请先同步全量成就库，并确保有用户已刷新过 Steam 成就缓存）</td></tr>';
        if (chartEl && typeof echarts !== 'undefined') {
            AppState.siteAchievementHistogram = echarts.init(chartEl);
            AppState.siteAchievementHistogram.setOption({
                title: {
                    text: '暂无成就条目',
                    left: 'center',
                    top: 'middle',
                    textStyle: { color: 'rgba(255,255,255,0.45)', fontSize: 14 }
                },
                xAxis: { show: false },
                yAxis: { show: false },
                series: []
            });
        }
        return;
    }

    if (chartEl && typeof echarts !== 'undefined') {
        const counts = siteAchievementUnlockHistogramCounts(list, sampleSize);
        AppState.siteAchievementHistogram = echarts.init(chartEl);
        AppState.siteAchievementHistogram.setOption({
            textStyle: { fontFamily: 'system-ui, "Segoe UI", sans-serif' },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: (params) => {
                    const p = params && params[0];
                    if (!p) return '';
                    return `${p.name}<br/>成就数：${p.value}`;
                }
            },
            grid: { left: '3%', right: '4%', bottom: '14%', top: '8%', containLabel: true },
            xAxis: {
                type: 'category',
                data: SITE_ACHIEVEMENT_UNLOCK_BIN_LABELS,
                axisLabel: { rotate: 28, fontSize: 10, color: '#a5a5b0' },
                axisLine: { lineStyle: { color: 'rgba(255,255,255,0.12)' } }
            },
            yAxis: {
                type: 'value',
                name: '成就数',
                minInterval: 1,
                nameTextStyle: { color: '#6e6e7a' },
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)', type: 'dashed' } },
                axisLabel: { color: '#6e6e7a' }
            },
            series: [{
                type: 'bar',
                data: counts,
                itemStyle: { color: '#9b7ede', borderRadius: [4, 4, 0, 0] },
                label: { show: true, position: 'top', color: '#f3f3f6', formatter: (p) => (p.value > 0 ? p.value : '') }
            }]
        });
    }

    const rows = list.map((row) => {
        const name = row.displayName != null && String(row.displayName).trim() !== ''
            ? escapeHtml(String(row.displayName))
            : '<span style="color:rgba(255,255,255,0.45)">—</span>';
        const api = escapeHtml(String(row.apiName ?? ''));
        const n = row.unlockedCount != null ? Number(row.unlockedCount) : 0;
        const pct = siteAchievementUnlockRatePercent(row, sampleSize);
        return `<tr><td>${name}</td><td style="font-size:12px;word-break:break-all;">${api}</td><td>${n}</td><td>${pct}%</td></tr>`;
    });
    tbody.innerHTML = rows.join('');
}

function renderSteamPlaytimeCharts(data) {
    if (typeof echarts === 'undefined') {
        console.warn('ECharts 未加载，跳过 Steam 图表');
        return;
    }
    const top10 = Array.isArray(data.top10) ? data.top10 : [];
    const histogram = Array.isArray(data.histogram) ? data.histogram : [];

    const elTop = document.getElementById('steamPlaytimeTop10Chart');
    const elHist = document.getElementById('steamPlaytimeHistogramChart');
    if (!elTop || !elHist) return;

    disposeSteamPlaytimeCharts();

    const c = AppState.steamPlaytimeCharts;

    c.top10 = echarts.init(elTop);
    const names = top10.map((r, i) => {
        const label = r.displayName || r.username || ('用户' + (r.userId ?? ''));
        return `${i + 1}. ${truncateStatLabel(label, 14)}`;
    });
    const hours = top10.map(r => {
        if (r.playtimeHours != null) return Number(r.playtimeHours);
        const m = r.playtimeMinutes != null ? Number(r.playtimeMinutes) : 0;
        return Math.round((m / 60) * 10) / 10;
    });

    c.top10.setOption({
        textStyle: { fontFamily: 'system-ui, "Segoe UI", sans-serif' },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params) => {
                const p = params && params[0];
                if (!p) return '';
                const idx = p.dataIndex;
                const row = top10[idx];
                const h = row && row.playtimeHours != null ? row.playtimeHours : p.value;
                const m = row && row.playtimeMinutes != null ? row.playtimeMinutes : Math.round(Number(h) * 60);
                const sid = row && row.steamId != null ? row.steamId : '';
                return `${p.name}<br/>时长：${h} 小时（${m} 分钟）${sid ? '<br/>SteamID：' + sid : ''}`;
            }
        },
        grid: { left: '3%', right: '10%', bottom: '3%', top: '3%', containLabel: true },
        xAxis: { type: 'value', name: '小时', splitLine: { lineStyle: { type: 'dashed' } } },
        yAxis: { type: 'category', data: names.length ? names : ['暂无数据'], inverse: true, axisLabel: { fontSize: 11 } },
        series: [{
            type: 'bar',
            data: names.length ? hours : [0],
            itemStyle: { color: '#e85d5d', borderRadius: [0, 4, 4, 0] },
            label: { show: true, position: 'right', formatter: (p) => (hours[p.dataIndex] != null ? hours[p.dataIndex] + ' h' : '') }
        }]
    });

    c.histogram = echarts.init(elHist);
    const defaultHistLabels = [
        '0–200 小时', '200–400 小时', '400–600 小时', '600–800 小时', '800–1000 小时',
        '1000–1200 小时', '1200–1400 小时', '1400–1600 小时', '1600–1800 小时', '1800–2000 小时', '≥2000 小时'
    ];
    const labels = histogram.length ? histogram.map(h => h.label) : defaultHistLabels;
    const counts = histogram.length ? histogram.map(h => Number(h.count || 0)) : defaultHistLabels.map(() => 0);

    c.histogram.setOption({
        textStyle: { fontFamily: 'system-ui, "Segoe UI", sans-serif' },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '4%', bottom: '18%', top: '10%', containLabel: true },
        xAxis: {
            type: 'category',
            data: labels,
            axisLabel: { rotate: 35, fontSize: 10 }
        },
        yAxis: { type: 'value', name: '人数', minInterval: 1, splitLine: { lineStyle: { type: 'dashed' } } },
        series: [{
            type: 'bar',
            data: counts,
            itemStyle: { color: '#5b8ff9', borderRadius: [4, 4, 0, 0] },
            label: { show: true, position: 'top', formatter: (p) => p.value }
        }]
    });
}

window.addEventListener('resize', () => {
    const c = AppState.steamPlaytimeCharts;
    if (c.top10) try { c.top10.resize(); } catch (e) { /* ignore */ }
    if (c.histogram) try { c.histogram.resize(); } catch (e) { /* ignore */ }
    if (AppState.siteAchievementHistogram) try { AppState.siteAchievementHistogram.resize(); } catch (e) { /* ignore */ }
    if (AppState.overviewKpiChart) try { AppState.overviewKpiChart.resize(); } catch (e) { /* ignore */ }
});

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
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fas fa-inbox" style="font-size: 24px; margin-bottom: 12px; display: block;"></i>
                    ${AppState.searchKeyword ? '没有找到匹配的文章' : '暂无文章数据'}
                </td>
            </tr>
        `;
    } else {
        elements.articlesTableBody.innerHTML = currentArticles.map(article => {
            const isPinned = Number(article.is_pinned) === 1 || article.is_pinned === true;
            const pinTitle = isPinned ? '点击取消置顶' : '点击置顶';
            const pinIcon = isPinned ? 'fa-thumbtack' : 'fa-thumbtack';
            const pinClass = isPinned ? 'action-btn btn-sm article-pin-btn article-pin-btn--on' : 'action-btn btn-sm article-pin-btn';
            return `
            <tr>
                <td>${article.id}</td>
                <td>
                    <div class="article-title-cell">
                        <div class="article-cover" style="width: 40px; height: 40px; margin-right: 8px; border-radius: 4px; overflow: hidden; float: left;">
                            ${article.cover_url ? 
                                `<img src="${article.cover_url}" alt="封面" style="width: 100%; height: 100%; object-fit: cover;">` : 
                                `<div style="width: 100%; height: 100%; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 12px;">无封面</div>`
                            }
                        </div>
                    <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${article.title}">
                        ${article.title}
                        </div>
                    </div>
                </td>
                <td>${article.author || '未知'}</td>
                <td>
                    <div style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${article.summary || ''}">
                        ${article.summary || '暂无摘要'}
                    </div>
                </td>
                <td>${article.view_count || 0}</td>
                <td style="text-align:center;">
                    <button type="button" class="${pinClass}" title="${pinTitle}" onclick="toggleArticlePinned(${article.id}, ${isPinned ? 'true' : 'false'})">
                        <i class="fas ${pinIcon}"></i>
                    </button>
                </td>
                <td>${formatDate(article.created_at)}</td>
                <td>
                    <div class="action-buttons-cell">
                        <button type="button" class="action-btn edit btn-sm" onclick="editArticle(${article.id})" title="编辑">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="action-btn delete btn-sm" onclick="showDeleteModal(${article.id})" title="删除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');
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

// 编辑文章：打开编辑模态框并填充数据
function editArticle(id) {
    if (!elements.editArticleModal || !elements.editArticleForm) return;

    const article = (AppState.articles || []).find(a => a.id === id);
    if (!article) {
        showMessage('未找到该文章数据', 'error');
        return;
    }

    AppState.editArticleId = id;

    // 重置表单
    elements.editArticleForm.reset();
    resetImageUpload('editCoverImageUploadArea', 'editCoverImagePreview', 'editArticleCoverImage', 'editArticleCoverUrl');

    // 填充表单字段（注意 cover_url -> coverUrl）
    document.getElementById('editArticleId').value = article.id;
    document.getElementById('editArticleTitle').value = article.title || '';
    document.getElementById('editArticleAuthor').value = article.author || '';
    document.getElementById('editArticleSummary').value = article.summary || '';
    document.getElementById('editArticleContent').value = article.content || '';
    const editPin = document.getElementById('editArticlePinned');
    if (editPin) {
        editPin.checked = Number(article.is_pinned) === 1 || article.is_pinned === true;
    }

    const coverUrlInput = document.getElementById('editArticleCoverUrl');
    const coverUrl = article.cover_url || article.coverUrl;
    if (coverUrl && coverUrlInput) {
        coverUrlInput.value = coverUrl;
        const uploadArea = document.getElementById('editCoverImageUploadArea');
        const preview = document.getElementById('editCoverImagePreview');
        const previewImg = document.getElementById('editCoverImagePreviewImg');
        if (uploadArea && preview && previewImg) {
            uploadArea.style.display = 'none';
            preview.style.display = 'block';
            previewImg.src = coverUrl;
        }
    }

    elements.editArticleModal.style.display = 'flex';
}

/** 新增文章「作者」默认值：当前管理员（优先真实姓名） */
function getDefaultArticleAuthorName() {
    if (!AppState.user) return '';
    const u = AppState.user;
    const rn = u.realName != null ? String(u.realName).trim() : '';
    if (rn) return rn;
    const un = u.username != null ? String(u.username).trim() : '';
    return un || '';
}

// 显示新增文章模态框
function showAddArticleModal() {
    if (elements.addArticleModal) {
        elements.addArticleModal.style.display = 'flex';
        // 清空表单后，作者默认填当前登录管理员（仍可自行修改）
        if (elements.addArticleForm) {
            elements.addArticleForm.reset();
            const authorInput = document.getElementById('articleAuthor');
            if (authorInput) {
                authorInput.value = getDefaultArticleAuthorName();
            }
        }
    }
}

// 关闭新增文章模态框
function closeAddArticleModal() {
    if (elements.addArticleModal) {
        elements.addArticleModal.style.display = 'none';
        // 清空表单和图片上传状态
        if (elements.addArticleForm) {
            elements.addArticleForm.reset();
        }
        // 重置图片上传组件
        resetImageUpload('coverImageUploadArea', 'coverImagePreview', 'articleCoverImage', 'articleCoverUrl');
    }
}

// 关闭编辑文章模态框（修复：编辑页取消/关闭无效）
function closeEditArticleModal() {
    if (elements.editArticleModal) {
        elements.editArticleModal.style.display = 'none';
    }
    if (elements.editArticleForm) {
        elements.editArticleForm.reset();
    }
    resetImageUpload(
        'editCoverImageUploadArea',
        'editCoverImagePreview',
        'editArticleCoverImage',
        'editArticleCoverUrl'
    );
    AppState.editArticleId = null;
}

// 确认新增文章
async function confirmAddArticle() {
    if (!elements.addArticleForm) return;
    
    // 获取表单数据
    const formData = new FormData(elements.addArticleForm);
    let author = (formData.get('author') || '').toString().trim();
    if (!author) {
        author = getDefaultArticleAuthorName();
    }
    const articleData = {
        title: formData.get('title'),
        author: author,
        summary: formData.get('summary') || '',
        coverUrl: formData.get('coverUrl') || '',
        content: formData.get('content'),
        viewCount: 0,
        isPinned: document.getElementById('articlePinned')?.checked ? 1 : 0
    };
    
    // 验证必填字段
    if (!articleData.title || articleData.title.trim() === '') {
        showMessage('请输入文章标题', 'error');
        return;
    }
    if (!articleData.author || articleData.author.trim() === '') {
        showMessage('请输入作者姓名，或等待加载当前管理员信息后重试', 'error');
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

// 确认编辑文章
async function confirmEditArticle() {
    if (!elements.editArticleForm) return;

    const formData = new FormData(elements.editArticleForm);
    const articleData = {
        id: parseInt(formData.get('id')),
        title: formData.get('title'),
        author: formData.get('author'),
        summary: formData.get('summary') || '',
        coverUrl: formData.get('coverUrl') || '',
        content: formData.get('content'),
        isPinned: document.getElementById('editArticlePinned')?.checked ? 1 : 0
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
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + AppState.token
            },
            body: JSON.stringify(articleData)
        });

        const data = await response.json();

        if (data.code === 200) {
            showMessage('更新文章成功', 'success');
            if (elements.editArticleModal) {
                elements.editArticleModal.style.display = 'none';
            }
            await loadArticles();
        } else {
            showMessage(data.msg || '更新文章失败', 'error');
        }
    } catch (error) {
        console.error('更新文章失败:', error);
        showMessage('更新文章失败，请重试', 'error');
    } finally {
        hideLoading();
    }
}

async function toggleArticlePinned(id, currentlyPinned) {
    if (!AppState.token) {
        showMessage('请先登录', 'error');
        return;
    }
    const next = !currentlyPinned;
    showLoading();
    try {
        const response = await fetch(`${API_CONFIG.baseURL}/${id}/pinned`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + AppState.token
            },
            body: JSON.stringify({ pinned: next })
        });
        const data = await response.json();
        if (data.code === 200) {
            showMessage(data.msg || '已更新置顶', 'success');
            await loadArticles();
        } else {
            showMessage(data.msg || '操作失败', 'error');
        }
    } catch (e) {
        console.error(e);
        showMessage('置顶切换失败', 'error');
    } finally {
        hideLoading();
    }
}

// 显示删除确认模态框（标题从当前列表解析，避免标题特殊字符破坏 onclick）
function showDeleteModal(id) {
    AppState.deleteArticleId = id;
    const list = AppState.filteredArticles && AppState.filteredArticles.length
        ? AppState.filteredArticles
        : (AppState.articles || []);
    const article = list.find((a) => Number(a.id) === Number(id));
    const title = article ? (article.title || '') : '';

    if (elements.deleteArticlePreview) {
        elements.deleteArticlePreview.innerHTML = `
            <h4>${escapeHtml(title)}</h4>
            <p>ID: ${escapeHtml(String(id))}</p>
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
    if (!AppState.token) {
        showMessage('请先登录', 'error');
        return;
    }

    showLoading();

    try {
        const response = await fetch(`${API_CONFIG.baseURL}/${AppState.deleteArticleId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + AppState.token
            }
        });

        let data = null;
        const text = await response.text();
        try {
            data = text ? JSON.parse(text) : null;
        } catch (parseErr) {
            console.error('删除接口非 JSON 响应:', text);
            showMessage(response.ok ? '删除失败：响应格式异常' : `删除失败（HTTP ${response.status}）`, 'error');
            return;
        }

        if (data && data.code === 200) {
            showMessage('删除成功', 'success');
            closeDeleteModal();
            await loadArticles();
        } else {
            const msg = (data && data.msg) || (data && data.message) || '删除失败';
            showMessage(msg, 'error');
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

// 设置图片上传功能
function setupImageUpload() {
    // 新增文章图片上传
    setupSingleImageUpload('articleCoverImage', 'coverImageUploadArea', 'coverImagePreview', 'coverImagePreviewImg', 'removeCoverImage', 'articleCoverUrl', '/api/file/upload/article-cover');
    
    // 编辑文章图片上传
    setupSingleImageUpload('editArticleCoverImage', 'editCoverImageUploadArea', 'editCoverImagePreview', 'editCoverImagePreviewImg', 'removeEditCoverImage', 'editArticleCoverUrl', '/api/file/upload/article-cover');

    // 角色头像上传
    setupSingleImageUpload('characterAvatarImage', 'characterAvatarUploadArea', 'characterAvatarPreview', 'characterAvatarPreviewImg', 'removeCharacterAvatar', 'characterAvatarUrl', '/api/file/upload/avatar');
    // 角色出招表图上传
    setupSingleImageUpload('characterMoveListImage', 'characterMoveListUploadArea', 'characterMoveListPreview', 'characterMoveListPreviewImg', 'removeCharacterMoveList', 'characterMoveListUrl', '/api/file/upload/character-move-list');
}

// 设置单个图片上传组件
function setupSingleImageUpload(fileInputId, uploadAreaId, previewId, previewImgId, removeBtnId, hiddenInputId, uploadUrl) {
    const fileInput = document.getElementById(fileInputId);
    const uploadArea = document.getElementById(uploadAreaId);
    const preview = document.getElementById(previewId);
    const previewImg = document.getElementById(previewImgId);
    const removeBtn = document.getElementById(removeBtnId);
    const hiddenInput = document.getElementById(hiddenInputId);
    
    if (!fileInput || !uploadArea || !preview || !previewImg || !removeBtn || !hiddenInput) {
        return;
    }
    
    // 点击上传区域触发文件选择
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // 文件选择变化
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageUpload(file, uploadArea, preview, previewImg, hiddenInput, uploadUrl);
        }
    });
    
    // 拖拽上传
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                handleImageUpload(file, uploadArea, preview, previewImg, hiddenInput, uploadUrl);
            } else {
                showMessage('请选择图片文件', 'error');
            }
        }
    });
    
    // 移除图片
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeImage(uploadArea, preview, fileInput, hiddenInput);
    });
}

// 处理图片上传
async function handleImageUpload(file, uploadArea, preview, previewImg, hiddenInput, uploadUrl) {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
        showMessage('请选择图片文件', 'error');
        return;
    }
    
    // 验证文件大小（5MB）
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        showMessage('图片大小不能超过5MB', 'error');
        return;
    }
    
    // 显示上传状态
    uploadArea.classList.add('uploading');
    
    try {
        // 创建FormData
        const formData = new FormData();
        formData.append('file', file);
        
        // 上传图片
        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + AppState.token
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.code === 200) {
            // 上传成功，显示预览
            const imageUrl = data.data.url;
            previewImg.src = imageUrl;
            hiddenInput.value = imageUrl;
            
            uploadArea.style.display = 'none';
            preview.style.display = 'block';
            
            showMessage('图片上传成功', 'success');
        } else {
            throw new Error(data.msg || '上传失败');
        }
    } catch (error) {
        console.error('图片上传失败:', error);
        showMessage('图片上传失败：' + error.message, 'error');
        uploadArea.classList.add('error');
        
        // 3秒后移除错误状态
        setTimeout(() => {
            uploadArea.classList.remove('error');
        }, 3000);
    } finally {
        uploadArea.classList.remove('uploading');
    }
}

// 移除图片
function removeImage(uploadArea, preview, fileInput, hiddenInput) {
    uploadArea.style.display = 'block';
    preview.style.display = 'none';
    fileInput.value = '';
    hiddenInput.value = '';
    uploadArea.classList.remove('error');
}

// 重置图片上传组件
function resetImageUpload(uploadAreaId, previewId, fileInputId, hiddenInputId) {
    const uploadArea = document.getElementById(uploadAreaId);
    const preview = document.getElementById(previewId);
    const fileInput = document.getElementById(fileInputId);
    const hiddenInput = document.getElementById(hiddenInputId);
    
    if (uploadArea && preview && fileInput && hiddenInput) {
        uploadArea.style.display = 'block';
        preview.style.display = 'none';
        fileInput.value = '';
        hiddenInput.value = '';
        uploadArea.classList.remove('error', 'uploading', 'dragover');
    }
}

// 上传正文图片并插入到指定textarea中
async function uploadContentImageAndInsert(file, textareaId) {
    // 基本校验
    if (!file.type.startsWith('image/')) {
        showMessage('请选择图片文件', 'error');
        return;
    }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        showMessage('图片大小不能超过5MB', 'error');
        return;
    }

    const textarea = document.getElementById(textareaId);
    if (!textarea) return;

    showLoading();

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/file/upload/article-content', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + AppState.token
            },
            body: formData
        });

        const data = await response.json();

        if (data.code === 200 && data.data && data.data.url) {
            const url = data.data.url;
            // 在当前光标位置插入<img>标签
            const start = textarea.selectionStart || textarea.value.length;
            const end = textarea.selectionEnd || textarea.value.length;
            const before = textarea.value.substring(0, start);
            const after = textarea.value.substring(end);
            const insertText = `\n<img src="${url}" alt="" />\n`;
            textarea.value = before + insertText + after;
            // 将光标移动到插入内容之后
            const newPos = before.length + insertText.length;
            textarea.selectionStart = textarea.selectionEnd = newPos;
            textarea.focus();
            showMessage('正文图片插入成功', 'success');
        } else {
            showMessage(data.msg || '正文图片上传失败', 'error');
        }
    } catch (error) {
        console.error('正文图片上传失败:', error);
        showMessage('正文图片上传失败，请重试', 'error');
    } finally {
        hideLoading();
    }
}

// ================== 官方连段管理相关函数 ==================

// 确保官方连段页面有角色列表可选
async function ensureCharactersLoadedForOfficialCombos() {
    if (!AppState.characters || AppState.characters.length === 0) {
        await loadCharacters();
    }
    fillOfficialComboCharacterSelect();
}

function fillOfficialComboCharacterSelect() {
    if (!elements.officialComboCharacterSelect) return;

    const select = elements.officialComboCharacterSelect;
    const currentValue = select.value;

    // 重建选项
    let optionsHtml = '<option value="">请选择角色</option>';
    (AppState.characters || []).forEach(c => {
        optionsHtml += `<option value="${c.id}">${c.nameZh || c.nameEn || ('角色 ' + c.id)}</option>`;
    });
    select.innerHTML = optionsHtml;

    // 恢复原选择
    if (currentValue) {
        select.value = currentValue;
        AppState.selectedOfficialComboCharacterId = parseInt(currentValue);
        if (AppState.selectedOfficialComboCharacterId) {
            loadOfficialCombos();
        }
    }
}

// 加载某个角色的官方连段
async function loadOfficialCombos() {
    if (!AppState.selectedOfficialComboCharacterId) {
        renderOfficialCombos();
        return;
    }

    showLoading();

    try {
        const response = await fetch(`/api/admin/characters/${AppState.selectedOfficialComboCharacterId}/official-combos`, {
            headers: {
                'Authorization': 'Bearer ' + AppState.token
            }
        });
        const data = await response.json();

        if (data.code === 200) {
            AppState.officialCombos = data.data || [];
            renderOfficialCombos();
        } else {
            showMessage(data.msg || '加载官方连段列表失败', 'error');
        }
    } catch (error) {
        console.error('加载官方连段列表失败:', error);
        showMessage('加载官方连段列表失败，请检查网络', 'error');
    } finally {
        hideLoading();
    }
}

// 渲染官方连段列表
function renderOfficialCombos() {
    if (!elements.officialCombosTableBody) return;

    if (!AppState.selectedOfficialComboCharacterId) {
        elements.officialCombosTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fas fa-info-circle" style="font-size: 20px; margin-bottom: 12px; display: block;"></i>
                    请先在上方选择一个角色
                </td>
            </tr>
        `;
        return;
    }

    if (!AppState.officialCombos || AppState.officialCombos.length === 0) {
        elements.officialCombosTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fas fa-inbox" style="font-size: 24px; margin-bottom: 12px; display: block;"></i>
                    该角色暂无官方连段
                </td>
            </tr>
        `;
        return;
    }

    elements.officialCombosTableBody.innerHTML = AppState.officialCombos.map(combo => `
        <tr>
            <td>${combo.id}</td>
            <td>
                <div style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${combo.title || ''}">
                    ${combo.title || ''}
                </div>
            </td>
            <td>
                <div style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${combo.description || ''}">
                    ${combo.description || '暂无说明'}
                </div>
            </td>
            <td>
                <div style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${combo.videoUrl || ''}">
                    ${combo.videoUrl || ''}
                </div>
            </td>
            <td>${combo.orderIndex != null ? combo.orderIndex : ''}</td>
            <td>
                <div class="action-buttons-cell">
                    <button class="action-btn edit btn-sm" onclick="editOfficialCombo(${combo.id})" title="编辑官方连段">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete btn-sm" onclick="deleteOfficialCombo(${combo.id})" title="删除官方连段">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// 显示官方连段新增/编辑弹窗
function showOfficialComboModal(combo) {
    if (!elements.officialComboModal || !elements.officialComboForm) return;

    if (!AppState.selectedOfficialComboCharacterId) {
        showMessage('请先选择一个角色，再新增官方连段', 'warning');
        return;
    }

    // 重置表单
    elements.officialComboForm.reset();
    document.getElementById('officialComboId').value = '';

    if (combo) {
        if (elements.officialComboModalTitle) {
            elements.officialComboModalTitle.textContent = '编辑官方连段';
        }
        document.getElementById('officialComboId').value = combo.id;
        document.getElementById('officialComboTitle').value = combo.title || '';
        document.getElementById('officialComboDescription').value = combo.description || '';
        document.getElementById('officialComboVideoUrl').value = combo.videoUrl || '';
        if (combo.orderIndex != null) {
            document.getElementById('officialComboOrderIndex').value = combo.orderIndex;
        }
    } else {
        if (elements.officialComboModalTitle) {
            elements.officialComboModalTitle.textContent = '新增官方连段';
        }
    }

    elements.officialComboModal.style.display = 'flex';
}

// 关闭官方连段弹窗
function closeOfficialComboModal() {
    if (!elements.officialComboModal) return;
    elements.officialComboModal.style.display = 'none';
}

// 编辑官方连段
function editOfficialCombo(id) {
    const combo = (AppState.officialCombos || []).find(c => c.id === id);
    if (!combo) {
        showMessage('未找到该官方连段数据', 'error');
        return;
    }
    showOfficialComboModal(combo);
}

// 保存官方连段（新增或更新）
async function saveOfficialCombo() {
    if (!elements.officialComboForm) return;

    const id = document.getElementById('officialComboId').value;
    const title = document.getElementById('officialComboTitle').value.trim();
    const description = document.getElementById('officialComboDescription').value.trim();
    const videoUrl = document.getElementById('officialComboVideoUrl').value.trim();
    const orderIndexValue = document.getElementById('officialComboOrderIndex').value;

    if (!title) {
        showMessage('请输入连段标题', 'error');
        return;
    }
    if (!videoUrl) {
        showMessage('请输入视频链接', 'error');
        return;
    }

    const payload = {
        title: title,
        description: description || null,
        videoUrl: videoUrl,
        orderIndex: orderIndexValue ? parseInt(orderIndexValue) : null
    };

    const isEdit = !!id;
    let url;
    let method;

    if (isEdit) {
        url = `/api/admin/official-combos/${id}`;
        method = 'PUT';
    } else {
        url = `/api/admin/characters/${AppState.selectedOfficialComboCharacterId}/official-combos`;
        method = 'POST';
    }

    showLoading();

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + AppState.token
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.code === 200) {
            showMessage(isEdit ? '更新官方连段成功' : '新增官方连段成功', 'success');
            closeOfficialComboModal();
            await loadOfficialCombos();
        } else {
            showMessage(data.msg || (isEdit ? '更新官方连段失败' : '新增官方连段失败'), 'error');
        }
    } catch (error) {
        console.error('保存官方连段失败:', error);
        showMessage('保存官方连段失败，请重试', 'error');
    } finally {
        hideLoading();
    }
}

// 删除官方连段
async function deleteOfficialCombo(id) {
    const combo = (AppState.officialCombos || []).find(c => c.id === id);
    const title = combo ? (combo.title || ('ID ' + id)) : ('ID ' + id);

    if (!confirm(`确定要删除官方连段「${title}」吗？此操作不可撤销。`)) {
        return;
    }

    showLoading();

    try {
        const response = await fetch(`/api/admin/official-combos/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + AppState.token
            }
        });

        const data = await response.json();

        if (data.code === 200) {
            showMessage('删除官方连段成功', 'success');
            await loadOfficialCombos();
        } else {
            showMessage(data.msg || '删除官方连段失败', 'error');
        }
    } catch (error) {
        console.error('删除官方连段失败:', error);
        showMessage('删除官方连段失败，请重试', 'error');
    } finally {
        hideLoading();
    }
}

// ================== 用户连段审核相关函数 ==================

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? dateStr : d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return dateStr;
    }
}

function getCharacterNameById(characterId) {
    const c = (AppState.characters || []).find(ch => ch.id === characterId);
    return c ? (c.nameZh || c.nameEn || 'ID ' + characterId) : ('ID ' + characterId);
}

async function loadUserCombos() {
    if (!elements.userCombosTableBody) return;
    showLoading();
    try {
        if (!AppState.characters || AppState.characters.length === 0) {
            const charRes = await fetch('/api/admin/characters', { headers: { 'Authorization': 'Bearer ' + AppState.token } });
            const charData = await charRes.json();
            if (charData.code === 200) AppState.characters = charData.data || [];
        }
        const status = elements.userComboStatusFilter ? elements.userComboStatusFilter.value : '';
        const url = status ? `/api/admin/combos/list?status=${encodeURIComponent(status)}` : '/api/admin/combos/list';
        const response = await fetch(url, { headers: { 'Authorization': 'Bearer ' + AppState.token } });
        const data = await response.json();
        if (data.code === 200) {
            AppState.userCombos = data.data || [];
            renderUserCombosTable();
        } else {
            showMessage(data.msg || '加载用户连段列表失败', 'error');
        }
    } catch (error) {
        console.error('加载用户连段失败:', error);
        showMessage('加载用户连段失败，请重试', 'error');
    } finally {
        hideLoading();
    }
}

function renderUserCombosTable() {
    if (!elements.userCombosTableBody) return;
    const list = AppState.userCombos || [];
    const statusText = { pending: '待审核', approved: '已通过', rejected: '已拒绝' };
    if (list.length === 0) {
        elements.userCombosTableBody.innerHTML = '<tr><td colspan="10" class="empty-row">暂无数据</td></tr>';
        return;
    }
    elements.userCombosTableBody.innerHTML = list.map(c => {
        const charName = getCharacterNameById(c.characterId);
        const status = statusText[c.status] || c.status || '-';
        const videoLink = c.videoUrl ? `<a href="${c.videoUrl}" target="_blank" rel="noopener">查看</a>` : '-';
        const fileLink = c.comboFileUrl ? `<a href="${c.comboFileUrl}" target="_blank" rel="noopener">下载</a>` : '-';
        let actions = '';
        if (c.status === 'pending') {
            actions = `<button class="action-btn edit btn-sm" onclick="approveUserCombo(${c.id})" title="通过">通过</button>
                       <button class="action-btn delete btn-sm" onclick="rejectUserCombo(${c.id})" title="拒绝">拒绝</button>`;
        }
        actions += ` <button class="action-btn delete btn-sm" onclick="deleteUserCombo(${c.id})" title="删除">删除</button>`;
        return `<tr>
            <td>${c.id}</td>
            <td>${charName}</td>
            <td><div style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(c.title || '').replace(/"/g, '&quot;')}">${c.title || '-'}</div></td>
            <td>${c.damageTotal != null ? c.damageTotal : '-'}</td>
            <td><div style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(c.description || '').replace(/"/g, '&quot;')}">${c.description || '-'}</div></td>
            <td>${videoLink}</td>
            <td>${fileLink}</td>
            <td>${status}</td>
            <td>${formatDateTime(c.createdAt)}</td>
            <td>${actions}</td>
        </tr>`;
    }).join('');
}

async function approveUserCombo(id) {
    try {
        const response = await fetch(`/api/admin/combos/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AppState.token },
            body: JSON.stringify({ status: 'approved' })
        });
        const data = await response.json();
        if (data.code === 200) {
            showMessage('已通过', 'success');
            loadUserCombos();
        } else {
            showMessage(data.msg || '操作失败', 'error');
        }
    } catch (e) {
        showMessage('操作失败，请重试', 'error');
    }
}

async function rejectUserCombo(id) {
    try {
        const response = await fetch(`/api/admin/combos/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AppState.token },
            body: JSON.stringify({ status: 'rejected' })
        });
        const data = await response.json();
        if (data.code === 200) {
            showMessage('已拒绝', 'success');
            loadUserCombos();
        } else {
            showMessage(data.msg || '操作失败', 'error');
        }
    } catch (e) {
        showMessage('操作失败，请重试', 'error');
    }
}

async function deleteUserCombo(id) {
    const c = (AppState.userCombos || []).find(x => x.id === id);
    const title = c ? (c.title || 'ID ' + id) : ('ID ' + id);
    if (!confirm(`确定要删除用户连段「${title}」吗？此操作不可撤销。`)) return;
    showLoading();
    try {
        const response = await fetch(`/api/admin/combos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + AppState.token }
        });
        const data = await response.json();
        if (data.code === 200) {
            showMessage('删除成功', 'success');
            loadUserCombos();
        } else {
            showMessage(data.msg || '删除失败', 'error');
        }
    } catch (e) {
        showMessage('删除失败，请重试', 'error');
    } finally {
        hideLoading();
    }
}

// ================== 举报审核 ==================
async function loadReports() {
    if (!elements.reportsTableBody) return;
    showLoading();
    try {
        const page = AppState.reportsPage || 1;
        const size = AppState.reportsPageSize || 10;
        const statusFilter = elements.reportStatusFilter ? elements.reportStatusFilter.value : '';
        const targetType = elements.reportTargetTypeFilter ? elements.reportTargetTypeFilter.value : '';

        // 根据目标类型调整“状态筛选”的文案，避免评论审核/内容举报混淆
        syncReportStatusFilterTextByTargetType(targetType);

        // 统一入口：当选择“评论”时，拉取评论审核列表并以“举报审核表格”的结构展示
        if (targetType === 'comment') {
            const { list, total } = await loadCommentModerationAsReports(page, size, statusFilter);
            AppState.reportsList = list;
            AppState.reportsTotal = total;
            renderReportsTable();
            renderReportsPagination();
            return;
        }

        let url = `/api/admin/reports/list?page=${page}&size=${size}`;
        if (statusFilter !== '') url += '&status=' + encodeURIComponent(statusFilter);
        if (targetType !== '') url += '&targetType=' + encodeURIComponent(targetType);
        const response = await fetch(url, { headers: { 'Authorization': 'Bearer ' + AppState.token } });
        const data = await response.json();
        if (data.code === 200 && data.data) {
            AppState.reportsList = data.data.list || [];
            AppState.reportsTotal = data.data.total != null ? data.data.total : 0;
            renderReportsTable();
            renderReportsPagination();
        } else {
            showMessage(data.msg || '加载举报列表失败', 'error');
        }
    } catch (error) {
        console.error('加载举报列表失败:', error);
        showMessage('加载举报列表失败，请重试', 'error');
    } finally {
        hideLoading();
    }
}

function syncReportStatusFilterTextByTargetType(targetType) {
    if (!elements.reportStatusFilter) return;
    const labelMapContent = { 0: '待处理', 1: '处理中', 2: '已处理', 3: '已驳回' };
    const labelMapComment = { 0: '待审核', 1: '待审核', 2: '已通过', 3: '已拒绝' };
    const map = targetType === 'comment' ? labelMapComment : labelMapContent;

    // 不改“全部状态”(value='')
    Array.from(elements.reportStatusFilter.options || []).forEach(opt => {
        if (!opt || opt.value === '') return;
        const k = opt.value;
        if (map[k]) opt.textContent = map[k];
    });
}

function mapReportStatusFilterToCommentStatus(statusFilter) {
    // reportStatusFilter 的值来自页面：待处理/处理中/已处理/已驳回（0/1/2/3）
    // 评论审核状态只有：0待审核/1通过/2拒绝
    if (statusFilter === '' || statusFilter == null) return null;
    const s = String(statusFilter);
    if (s === '0' || s === '1') return 0;
    if (s === '2') return 1;
    if (s === '3') return 2;
    return null;
}

function normalizeCommentModerationToReportRow(c) {
    const commentStatus = c && c.status != null ? Number(c.status) : 0;
    const reportStatus = commentStatus === 0 ? 0 : (commentStatus === 1 ? 2 : 3);
    return {
        id: c.id,
        userId: c.userId != null ? c.userId : (c.user_id != null ? c.user_id : null),
        targetType: 'comment',
        targetId: c.articleId != null ? c.articleId : (c.article_id != null ? c.article_id : null),
        reason: '-',
        content: c.content || '',
        status: reportStatus,
        createdAt: c.createdAt || c.created_at,
        adminRemark: c.adminRemark || c.admin_remark || '',
        __source: 'comment',
        __commentStatus: commentStatus
    };
}

async function loadCommentModerationAsReports(page, size, statusFilter) {
    let url = `/api/admin/article-comments/list?page=${page}&size=${size}`;
    const mapped = mapReportStatusFilterToCommentStatus(statusFilter);
    if (mapped != null) url += '&status=' + encodeURIComponent(String(mapped));

    const response = await fetch(url, { headers: { 'Authorization': 'Bearer ' + AppState.token } });
    const data = await response.json();
    if (data.code !== 200 || !data.data) {
        showMessage(data.msg || '加载评论审核列表失败', 'error');
        return { list: [], total: 0 };
    }

    const list = (data.data.list || []).map(normalizeCommentModerationToReportRow);
    const total = data.data.total != null ? data.data.total : 0;
    return { list, total };
}

function renderReportsTable() {
    if (!elements.reportsTableBody) return;
    const list = AppState.reportsList || [];
    const statusText = { 0: '待处理', 1: '处理中', 2: '已处理', 3: '已驳回' };
    const typeText = { article: '资讯', comment: '评论', user: '用户', combo: '连段', move: '出招', other: '其他' };
    const getType = (r) => r.targetType || r.target_type || '';
    if (list.length === 0) {
        elements.reportsTableBody.innerHTML = '<tr><td colspan="10" class="empty-row">暂无举报数据</td></tr>';
        return;
    }
    elements.reportsTableBody.innerHTML = list.map(r => {
        const status = statusText[r.status] != null ? statusText[r.status] : ('状态' + r.status);
        const type = typeText[getType(r)] || getType(r) || '-';
        const createdAt = (r.createdAt || r.created_at) ? formatDateTime(r.createdAt || r.created_at) : '-';
        const content = (r.content || '').replace(/</g, '&lt;').substring(0, 80);
        const adminRemark = (r.adminRemark || r.admin_remark || '').replace(/</g, '&lt;').substring(0, 60);
        const reasonMap = {
            copyright: '侵权',
            porn: '色情低俗',
            spam: '违规引流',
            illegal: '涉嫌诈骗',
            abuse: '政治敏感',
            other: '其他'
        };
        const reasonKey = (r.reason || '').toString();
        const reasonDisplay = reasonMap[reasonKey] || reasonKey || '-';
        const source = r.__source || 'content';
        const canAction = source === 'comment'
            ? r.status === 0
            : (r.status === 0 || r.status === 1);
        const actions = canAction
            ? `<button class="action-btn edit btn-sm" onclick="openReportStatusModal(${r.id})" title="${source === 'comment' ? '审核' : '处理'}">${source === 'comment' ? '审核' : '处理'}</button>`
            : '';
        return `<tr>
            <td>${r.id}</td>
            <td>${r.userId != null ? r.userId : (r.user_id != null ? r.user_id : '-')}</td>
            <td>${type}</td>
            <td>${r.targetId != null ? r.targetId : (r.target_id != null ? r.target_id : '-')}</td>
            <td>${reasonDisplay.replace(/</g, '&lt;')}</td>
            <td title="${(r.content || '').replace(/"/g, '&quot;')}">${content}${(r.content && r.content.length > 80) ? '...' : ''}</td>
            <td>${status}</td>
            <td>${createdAt}</td>
            <td title="${(r.adminRemark || '').replace(/"/g, '&quot;')}">${adminRemark}${(r.adminRemark && r.adminRemark.length > 60) ? '...' : ''}</td>
            <td>${actions}</td>
        </tr>`;
    }).join('');
}

function renderReportsPagination() {
    if (!elements.reportsPagination) return;
    const total = AppState.reportsTotal || 0;
    const size = AppState.reportsPageSize || 10;
    const page = AppState.reportsPage || 1;
    const totalPages = Math.max(1, Math.ceil(total / size));
    if (totalPages <= 1) {
        elements.reportsPagination.innerHTML = '';
        return;
    }
    let html = '';
    if (page > 1) {
        html += `<button class="btn btn-secondary btn-sm" onclick="AppState.reportsPage=${page - 1};loadReports();">上一页</button>`;
    }
    html += `<span class="pagination-info" style="margin:0 12px;">第 ${page} / ${totalPages} 页，共 ${total} 条</span>`;
    if (page < totalPages) {
        html += `<button class="btn btn-secondary btn-sm" onclick="AppState.reportsPage=${page + 1};loadReports();">下一页</button>`;
    }
    elements.reportsPagination.innerHTML = html;
}

function openReportStatusModal(id) {
    const r = (AppState.reportsList || []).find(x => x.id === id);
    if (!r || !elements.reportStatusModal) return;
    if (elements.reportStatusModalId) elements.reportStatusModalId.value = id;
    const source = r.__source || 'content';
    AppState.reportStatusContext = { source };
    if (elements.reportStatusSelect) {
        if (source === 'comment') {
            elements.reportStatusSelect.innerHTML = `
                <option value="1">通过</option>
                <option value="2">拒绝</option>
            `;
            const cs = r.__commentStatus != null ? Number(r.__commentStatus) : 0;
            elements.reportStatusSelect.value = String(cs === 2 ? 2 : 1);
        } else {
            elements.reportStatusSelect.innerHTML = `
                <option value="1">处理中</option>
                <option value="2">已处理</option>
                <option value="3">已驳回</option>
            `;
            const rs = r.status != null ? Number(r.status) : 0;
            const next = rs === 0 ? 1 : rs;
            elements.reportStatusSelect.value = String(next);
        }
    }
    if (elements.reportAdminRemark) elements.reportAdminRemark.value = r.adminRemark || r.admin_remark || '';
    elements.reportStatusModal.style.display = 'flex';
}

function closeReportStatusModal() {
    if (elements.reportStatusModal) elements.reportStatusModal.style.display = 'none';
    AppState.reportStatusContext = null;
}

async function confirmReportStatus() {
    const idEl = elements.reportStatusModalId;
    const id = idEl ? parseInt(idEl.value, 10) : null;
    if (!id) return;
    const status = elements.reportStatusSelect ? parseInt(elements.reportStatusSelect.value, 10) : 1;
    const adminRemark = elements.reportAdminRemark ? elements.reportAdminRemark.value.trim() : null;
    showLoading();
    try {
        const source = (AppState.reportStatusContext && AppState.reportStatusContext.source) ? AppState.reportStatusContext.source : 'content';
        const body = { status };
        if (adminRemark) body.adminRemark = adminRemark;
        const url = source === 'comment'
            ? `/api/admin/article-comments/${id}/status`
            : `/api/admin/reports/${id}/status`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AppState.token },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (data.code === 200) {
            showMessage('更新成功', 'success');
            closeReportStatusModal();
            loadReports();
        } else {
            showMessage(data.msg || '更新失败', 'error');
        }
    } catch (e) {
        showMessage('操作失败，请重试', 'error');
    } finally {
        hideLoading();
    }
}

// ================== 评论审核 ==================
async function loadCommentReview() {
    if (!elements.commentReviewTableBody) return;
    showLoading();
    try {
        const page = AppState.commentReviewPage || 1;
        const size = AppState.commentReviewPageSize || 10;
        const status = elements.commentReviewStatusFilter ? elements.commentReviewStatusFilter.value : '0';
        const articleIdStr = elements.commentReviewArticleId ? String(elements.commentReviewArticleId.value || '').trim() : '';
        let url = `/api/admin/article-comments/list?page=${page}&size=${size}`;
        if (status !== '' && status != null) url += '&status=' + encodeURIComponent(status);
        if (articleIdStr) url += '&articleId=' + encodeURIComponent(articleIdStr);

        const response = await fetch(url, { headers: { 'Authorization': 'Bearer ' + AppState.token } });
        const data = await response.json();
        if (data.code === 200 && data.data) {
            AppState.commentReviewList = data.data.list || [];
            AppState.commentReviewTotal = data.data.total != null ? data.data.total : 0;
            renderCommentReviewTable();
            renderCommentReviewPagination();
        } else {
            showMessage(data.msg || '加载评论审核列表失败', 'error');
        }
    } catch (e) {
        console.error('加载评论审核失败:', e);
        showMessage('加载评论审核失败，请重试', 'error');
    } finally {
        hideLoading();
    }
}

function renderCommentReviewTable() {
    if (!elements.commentReviewTableBody) return;
    const list = AppState.commentReviewList || [];
    const statusText = { 0: '待审核', 1: '已通过', 2: '已拒绝' };
    if (list.length === 0) {
        elements.commentReviewTableBody.innerHTML = '<tr><td colspan="8" class="empty-row">暂无数据</td></tr>';
        return;
    }
    elements.commentReviewTableBody.innerHTML = list.map(c => {
        const id = c.id;
        const articleId = c.articleId != null ? c.articleId : (c.article_id != null ? c.article_id : '-');
        const userName = (c.authorName || c.author_name || ('用户ID ' + (c.userId ?? c.user_id ?? '-'))).replace(/</g, '&lt;');
        const content = (c.content || '').replace(/</g, '&lt;');
        const contentShort = content.length > 80 ? content.substring(0, 80) + '...' : content;
        const st = c.status != null ? c.status : 0;
        const statusLabel = statusText[st] || ('状态' + st);
        const createdAt = (c.createdAt || c.created_at) ? formatDateTime(c.createdAt || c.created_at) : '-';
        const remark = (c.adminRemark || c.admin_remark || '').replace(/</g, '&lt;');
        const remarkShort = remark.length > 40 ? remark.substring(0, 40) + '...' : remark;
        const actionBtn = `<button class="action-btn edit btn-sm" onclick="openCommentReviewModal(${id})" title="审核">审核</button>`;
        return `<tr>
            <td>${id}</td>
            <td>${articleId}</td>
            <td>${userName}</td>
            <td title="${content.replace(/"/g, '&quot;')}">${contentShort}</td>
            <td>${statusLabel}</td>
            <td>${createdAt}</td>
            <td title="${remark.replace(/"/g, '&quot;')}">${remarkShort}</td>
            <td>${actionBtn}</td>
        </tr>`;
    }).join('');
}

function renderCommentReviewPagination() {
    if (!elements.commentReviewPagination) return;
    const total = AppState.commentReviewTotal || 0;
    const size = AppState.commentReviewPageSize || 10;
    const page = AppState.commentReviewPage || 1;
    const totalPages = Math.max(1, Math.ceil(total / size));
    if (totalPages <= 1) {
        elements.commentReviewPagination.innerHTML = '';
        return;
    }
    let html = '';
    if (page > 1) {
        html += `<button class="btn btn-secondary btn-sm" onclick="AppState.commentReviewPage=${page - 1};loadCommentReview();">上一页</button>`;
    }
    html += `<span class="pagination-info" style="margin:0 12px;">第 ${page} / ${totalPages} 页，共 ${total} 条</span>`;
    if (page < totalPages) {
        html += `<button class="btn btn-secondary btn-sm" onclick="AppState.commentReviewPage=${page + 1};loadCommentReview();">下一页</button>`;
    }
    elements.commentReviewPagination.innerHTML = html;
}

function openCommentReviewModal(id) {
    const c = (AppState.commentReviewList || []).find(x => x.id === id);
    if (!c || !elements.commentReviewModal) return;
    if (elements.commentReviewModalId) elements.commentReviewModalId.value = String(id);
    if (elements.commentReviewStatusSelect) elements.commentReviewStatusSelect.value = '1';
    if (elements.commentReviewAdminRemark) elements.commentReviewAdminRemark.value = (c.adminRemark || c.admin_remark || '');
    elements.commentReviewModal.style.display = 'flex';
}

function closeCommentReviewModal() {
    if (elements.commentReviewModal) elements.commentReviewModal.style.display = 'none';
}

async function confirmCommentReview() {
    const id = elements.commentReviewModalId ? parseInt(elements.commentReviewModalId.value, 10) : null;
    if (!id) return;
    const status = elements.commentReviewStatusSelect ? parseInt(elements.commentReviewStatusSelect.value, 10) : 1;
    const adminRemark = elements.commentReviewAdminRemark ? elements.commentReviewAdminRemark.value.trim() : null;
    showLoading();
    try {
        const body = { status };
        if (adminRemark) body.adminRemark = adminRemark;
        const response = await fetch(`/api/admin/article-comments/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AppState.token },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (data.code === 200) {
            showMessage('审核成功', 'success');
            closeCommentReviewModal();
            loadCommentReview();
        } else {
            showMessage(data.msg || '审核失败', 'error');
        }
    } catch (e) {
        showMessage('操作失败，请重试', 'error');
    } finally {
        hideLoading();
    }
}

// ================== 角色管理相关函数 ==================

// 加载角色列表
async function loadCharacters() {
    showLoading();
    
    try {
        const response = await fetch('/api/admin/characters', {
            headers: {
                'Authorization': 'Bearer ' + AppState.token
            }
        });
        const data = await response.json();
        
        if (data.code === 200) {
            AppState.characters = data.data || [];
            renderCharacters();
        } else {
            showMessage(data.msg || '加载角色列表失败', 'error');
        }
    } catch (error) {
        console.error('加载角色列表失败:', error);
        showMessage('加载角色列表失败，请检查网络', 'error');
    } finally {
        hideLoading();
    }
}

// 渲染角色列表
function renderCharacters() {
    if (!elements.charactersTableBody) return;

    if (!AppState.characters || AppState.characters.length === 0) {
        elements.charactersTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fas fa-inbox" style="font-size: 24px; margin-bottom: 12px; display: block;"></i>
                    暂无角色数据
                </td>
            </tr>
        `;
    } else {
        elements.charactersTableBody.innerHTML = AppState.characters.map(character => `
            <tr>
                <td>${character.id}</td>
                <td>
                    <div class="article-title-cell">
                        <div class="article-cover" style="width: 40px; height: 40px; margin-right: 8px; border-radius: 4px; overflow: hidden;">
                            ${character.avatarUrl ? 
                                `<img src="${character.avatarUrl}" alt="头像" style="width: 100%; height: 100%; object-fit: cover;">` : 
                                `<div style="width: 100%; height: 100%; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 12px;">无头像</div>`
                            }
                        </div>
                        <div style="max-width: 220px;">
                            <div style="font-weight: 500;" title="${character.nameZh || ''}">
                                ${character.nameZh || '未命名角色'}
                            </div>
                            <div style="font-size: 12px; color: var(--text-muted);" title="${character.nameEn || ''}">
                                ${character.nameEn || ''}
                            </div>
                        </div>
                    </div>
                </td>
                <td>
                    ${character.difficultyLevel != null ? `难度 ${character.difficultyLevel}/5` : '未设置'}
                </td>
                <td>
                    <div style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" 
                         title="${character.intro || ''}">
                        ${character.intro || '暂无简介'}
                    </div>
                </td>
                <td>
                    <div class="action-buttons-cell">
                        <button class="action-btn edit btn-sm" onclick="editCharacter(${character.id})" title="编辑角色">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete btn-sm" onclick="deleteCharacter(${character.id})" title="删除角色">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    if (elements.characterCount) {
        elements.characterCount.textContent = AppState.characters.length;
    }
}

// 打开角色新增/编辑弹窗
function showCharacterModal(character) {
    if (!elements.characterModal || !elements.characterForm) return;

    // 重置表单
    elements.characterForm.reset();
    resetImageUpload('characterAvatarUploadArea', 'characterAvatarPreview', 'characterAvatarImage', 'characterAvatarUrl');
    resetImageUpload('characterMoveListUploadArea', 'characterMoveListPreview', 'characterMoveListImage', 'characterMoveListUrl');
    document.getElementById('characterId').value = '';

    if (character) {
        // 编辑模式
        if (elements.characterModalTitle) {
            elements.characterModalTitle.textContent = '编辑角色';
        }
        document.getElementById('characterId').value = character.id;
        document.getElementById('characterNameZh').value = character.nameZh || '';
        document.getElementById('characterNameEn').value = character.nameEn || '';
        if (character.difficultyLevel != null) {
            document.getElementById('characterDifficulty').value = character.difficultyLevel;
        }
        document.getElementById('characterIntro').value = character.intro || '';
        document.getElementById('characterBackground').value = character.background || '';
        document.getElementById('characterVideoUrl').value = character.officialVideoUrl || '';

        // 出招表图
        const moveListUrlInput = document.getElementById('characterMoveListUrl');
        if (character.moveListImageUrl && moveListUrlInput) {
            moveListUrlInput.value = character.moveListImageUrl;
            const mlArea = document.getElementById('characterMoveListUploadArea');
            const mlPreview = document.getElementById('characterMoveListPreview');
            const mlImg = document.getElementById('characterMoveListPreviewImg');
            if (mlArea && mlPreview && mlImg) {
                mlArea.style.display = 'none';
                mlPreview.style.display = 'block';
                mlImg.src = character.moveListImageUrl;
            }
        }

        // 头像预览
        const avatarUrlInput = document.getElementById('characterAvatarUrl');
        if (character.avatarUrl && avatarUrlInput) {
            avatarUrlInput.value = character.avatarUrl;
            const uploadArea = document.getElementById('characterAvatarUploadArea');
            const preview = document.getElementById('characterAvatarPreview');
            const previewImg = document.getElementById('characterAvatarPreviewImg');
            if (uploadArea && preview && previewImg) {
                uploadArea.style.display = 'none';
                preview.style.display = 'block';
                previewImg.src = character.avatarUrl;
            }
        }
    } else {
        // 新增模式
        if (elements.characterModalTitle) {
            elements.characterModalTitle.textContent = '新增角色';
        }
    }

    elements.characterModal.style.display = 'flex';
}

// 关闭角色弹窗
function closeCharacterModal() {
    if (!elements.characterModal) return;
    elements.characterModal.style.display = 'none';
}

// 点击编辑按钮
function editCharacter(id) {
    const character = (AppState.characters || []).find(c => c.id === id);
    if (!character) {
        showMessage('未找到该角色数据', 'error');
        return;
    }
    showCharacterModal(character);
}

// 保存角色（新增或更新）
async function saveCharacter() {
    if (!elements.characterForm) return;

    const id = document.getElementById('characterId').value;
    const nameZh = document.getElementById('characterNameZh').value.trim();
    const nameEn = document.getElementById('characterNameEn').value.trim();
    const difficulty = document.getElementById('characterDifficulty').value;
    const intro = document.getElementById('characterIntro').value.trim();
    const background = document.getElementById('characterBackground').value.trim();
    const officialVideoUrl = document.getElementById('characterVideoUrl').value.trim();
    const avatarUrl = document.getElementById('characterAvatarUrl').value;
    const moveListImageUrl = document.getElementById('characterMoveListUrl').value;

    if (!nameZh) {
        showMessage('请输入角色中文名', 'error');
        return;
    }
    if (!nameEn) {
        showMessage('请输入角色英文名', 'error');
        return;
    }

    const payload = {
        nameZh: nameZh,
        nameEn: nameEn,
        avatarUrl: avatarUrl || null,
        intro: intro || null,
        background: background || null,
        difficultyLevel: difficulty ? parseInt(difficulty) : null,
        officialVideoUrl: officialVideoUrl || null,
        moveListImageUrl: moveListImageUrl || null
    };

    const isEdit = !!id;
    const url = isEdit ? `/api/admin/characters/${id}` : '/api/admin/characters';
    const method = isEdit ? 'PUT' : 'POST';

    showLoading();

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + AppState.token
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.code === 200) {
            showMessage(isEdit ? '更新角色成功' : '新增角色成功', 'success');
            closeCharacterModal();
            await loadCharacters();
        } else {
            showMessage(data.msg || (isEdit ? '更新角色失败' : '新增角色失败'), 'error');
        }
    } catch (error) {
        console.error('保存角色失败:', error);
        showMessage('保存角色失败，请重试', 'error');
    } finally {
        hideLoading();
    }
}

// 删除角色
async function deleteCharacter(id) {
    const character = (AppState.characters || []).find(c => c.id === id);
    const name = character ? (character.nameZh || character.nameEn || ('ID ' + id)) : ('ID ' + id);

    if (!confirm(`确定要删除角色「${name}」吗？此操作不可撤销，并会同时删除该角色的出招表和连段。`)) {
        return;
    }

    showLoading();

    try {
        const response = await fetch(`/api/admin/characters/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + AppState.token
            }
        });

        const data = await response.json();

        if (data.code === 200) {
            showMessage('删除角色成功', 'success');
            await loadCharacters();
        } else {
            showMessage(data.msg || '删除角色失败', 'error');
        }
    } catch (error) {
        console.error('删除角色失败:', error);
        showMessage('删除角色失败，请重试', 'error');
    } finally {
        hideLoading();
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

