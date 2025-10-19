// 蹄斗族群助手 - 主要JavaScript功能

// 全局状态管理
const AppState = {
    currentPage: 'news',
    isLoggedIn: false,
    user: null,
    characters: [],
    articles: [],
    apiBaseUrl: 'http://localhost:8080', // app API地址
    managementApiUrl: 'http://localhost:8081' // 管理系统API地址
};

// 角色数据
const CHARACTERS_DATA = [
    {
        id: 'velvet',
        name: 'Velvet',
        alias: '丝绒',
        cover: '/images/CSel3_LargePortVelvet.png',
        intro: 'Velvet是一位优雅而致命的战士，擅长使用丝带进行远距离攻击。她的招式华丽而致命，是许多玩家喜爱的角色。',
        analysis: 'Velvet的优势在于她的攻击范围和连招的流畅性。她的丝带攻击可以覆盖很大的范围，让对手难以接近。在连招方面，她可以轻松地组合各种攻击，创造出令人眼花缭乱的连击。',
        moves: [
            { name: '丝带突刺', desc: '向前方发射丝带进行突刺攻击，距离远，伤害中等' },
            { name: '旋转丝带', desc: '以自身为中心旋转丝带，对周围敌人造成持续伤害' },
            { name: '丝带束缚', desc: '用丝带束缚敌人，使其无法移动，持续3秒' },
            { name: '华丽终结', desc: '释放华丽的终结技，对前方大范围造成巨额伤害' }
        ]
    },
    {
        id: 'oleander',
        name: 'Oleander',
        alias: '夹竹桃',
        cover: '/images/CSel3_LargePortOleander.png',
        intro: 'Oleander是一位神秘的毒系战士，擅长使用毒素和幻术。她的攻击带有毒性效果，可以持续削弱敌人。',
        analysis: 'Oleander的独特之处在于她的毒素系统。每次攻击都有机会给敌人施加毒素效果，造成持续伤害。她的幻术技能可以迷惑敌人，为自己创造优势。',
        moves: [
            { name: '毒雾攻击', desc: '释放毒雾，对范围内敌人造成毒素伤害' },
            { name: '幻影分身', desc: '创造幻影分身，迷惑敌人，持续5秒' },
            { name: '毒刺连击', desc: '快速连续攻击，每次攻击都有毒素效果' },
            { name: '剧毒爆发', desc: '引爆所有毒素效果，造成巨额伤害' }
        ]
    },
    {
        id: 'arizona',
        name: 'Arizona',
        alias: '亚利桑那',
        cover: '/images/CSel3_LargePortArizona.png',
        intro: 'Arizona是一位西部风格的枪手，擅长远程射击和快速移动。她的攻击精准而致命。',
        analysis: 'Arizona是典型的远程角色，需要保持距离来发挥最大优势。她的移动技能让她可以快速调整位置，而她的射击技能则提供了强大的火力输出。',
        moves: [
            { name: '精准射击', desc: '瞄准敌人进行精准射击，伤害高，射程远' },
            { name: '快速翻滚', desc: '快速翻滚躲避攻击，并重置技能冷却' },
            { name: '连发射击', desc: '连续发射多发子弹，对敌人造成持续伤害' },
            { name: '终极狙击', desc: '蓄力后发射强力狙击，造成巨额伤害' }
        ]
    },
    {
        id: 'paprika',
        name: 'Paprika',
        alias: '辣椒',
        cover: '/images/CSel3_LargePortPaprika.png',
        intro: 'Paprika是一位热情如火的战士，擅长近战格斗和火焰攻击。她的攻击充满激情和力量。',
        analysis: 'Paprika是典型的近战角色，需要贴近敌人才能发挥最大威力。她的火焰攻击不仅伤害高，还能点燃敌人造成持续伤害。',
        moves: [
            { name: '火焰拳', desc: '用火焰包裹拳头进行攻击，造成火焰伤害' },
            { name: '烈焰冲击', desc: '向前方释放烈焰冲击波，击退敌人' },
            { name: '火焰护盾', desc: '用火焰形成护盾，减少受到的伤害' },
            { name: '火山爆发', desc: '释放强大的火焰爆发，对周围造成巨额伤害' }
        ]
    },
    {
        id: 'tianhuo',
        name: 'Tianhuo',
        alias: '天火',
        cover: '/images/CSel3_LargePortTianhuo.png',
        intro: 'Tianhuo是一位来自东方的神秘战士，擅长使用天火之力。她的攻击带有神圣的力量。',
        analysis: 'Tianhuo的攻击具有神圣属性，对某些敌人有额外伤害。她的技能组合可以创造出强大的连击效果。',
        moves: [
            { name: '天火降临', desc: '召唤天火攻击敌人，造成神圣伤害' },
            { name: '神圣护体', desc: '用神圣力量保护自己，免疫负面效果' },
            { name: '天火连击', desc: '连续释放天火攻击，每次攻击威力递增' },
            { name: '天火审判', desc: '释放终极天火审判，对敌人造成神圣伤害' }
        ]
    },
    {
        id: 'pom',
        name: 'Pom',
        alias: '波姆',
        cover: '/images/CSel3_LargePortPom.png',
        intro: 'Pom是一位可爱的机械师，擅长使用各种机械装置进行战斗。她的攻击充满创意和趣味。',
        analysis: 'Pom的独特之处在于她的机械装置。每个装置都有不同的功能，可以组合使用创造出意想不到的效果。',
        moves: [
            { name: '机械臂攻击', desc: '用机械臂进行攻击，伤害稳定' },
            { name: '炸弹投掷', desc: '投掷炸弹攻击敌人，造成范围伤害' },
            { name: '机械护盾', desc: '部署机械护盾，吸收一定伤害' },
            { name: '机械风暴', desc: '释放大量机械装置，对敌人造成持续伤害' }
        ]
    },
    {
        id: 'shanty',
        name: 'Shanty',
        alias: '水手',
        cover: '/images/CSel3_LargePortShantyP2.png',
        intro: 'Shanty是一位经验丰富的水手，擅长使用绳索和海洋技能。她的攻击灵活多变。',
        analysis: 'Shanty的攻击方式非常灵活，可以根据情况调整战术。她的绳索技能让她可以快速移动和束缚敌人。',
        moves: [
            { name: '绳索攻击', desc: '用绳索攻击敌人，可以束缚敌人' },
            { name: '海浪冲击', desc: '召唤海浪冲击敌人，造成范围伤害' },
            { name: '绳索摆荡', desc: '用绳索快速移动，躲避攻击' },
            { name: '海洋风暴', desc: '释放强大的海洋风暴，对敌人造成持续伤害' }
        ]
    },
    {
        id: 'texas',
        name: 'Texas',
        alias: '德克萨斯',
        cover: '/images/CSel3_LargePortTexas.png',
        intro: 'Texas是一位西部牛仔，擅长使用双枪和绳索。她的攻击快速而精准。',
        analysis: 'Texas是典型的双枪手，攻击速度快，但需要精准的瞄准。她的绳索技能让她可以控制战场。',
        moves: [
            { name: '双枪射击', desc: '同时使用双枪射击，攻击速度快' },
            { name: '绳索套索', desc: '用绳索套住敌人，限制其移动' },
            { name: '快速装弹', desc: '快速装弹，减少技能冷却时间' },
            { name: '西部决斗', desc: '进入决斗模式，大幅提升攻击力和速度' }
        ]
    },
    {
        id: 'stronghoof',
        name: 'Stronghoof',
        alias: '强蹄',
        cover: '/images/CSel3_LargePortStronghoof.png',
        intro: 'Stronghoof是一位强壮的战士，擅长使用重武器和防御技能。他的攻击威力巨大。',
        analysis: 'Stronghoof是典型的坦克角色，防御力高，攻击力强，但移动速度较慢。他适合正面作战。',
        moves: [
            { name: '重锤攻击', desc: '用重锤攻击敌人，伤害高，有击退效果' },
            { name: '盾牌防御', desc: '举起盾牌防御，大幅减少受到的伤害' },
            { name: '冲锋攻击', desc: '向前冲锋攻击敌人，造成击退效果' },
            { name: '大地震击', desc: '重击地面，对周围敌人造成巨额伤害' }
        ]
    },
    {
        id: 'baihe',
        name: 'Baihe',
        alias: '百合',
        cover: '/images/CSel3_LargePortBaihe.png',
        intro: 'Baihe是一位优雅的舞者，擅长使用舞蹈和花瓣进行攻击。她的攻击美丽而致命。',
        analysis: 'Baihe的攻击方式非常优雅，通过舞蹈和花瓣创造出美丽的攻击效果。她的移动技能让她可以优雅地躲避攻击。',
        moves: [
            { name: '花瓣攻击', desc: '释放花瓣攻击敌人，造成持续伤害' },
            { name: '优雅舞步', desc: '通过舞蹈快速移动，躲避攻击' },
            { name: '花瓣护盾', desc: '用花瓣形成护盾，吸收伤害' },
            { name: '花之舞', desc: '释放美丽的花之舞，对敌人造成持续伤害' }
        ]
    },
    {
        id: 'nidra',
        name: 'Nidra',
        alias: '尼德拉',
        cover: '/images/CSel3_LargePortNidra.png',
        intro: 'Nidra是一位神秘的暗影战士，擅长使用暗影力量。她的攻击神秘而致命。',
        analysis: 'Nidra的攻击具有暗影属性，可以在黑暗中隐身。她的技能组合可以创造出强大的连击效果。',
        moves: [
            { name: '暗影突刺', desc: '在暗影中突刺敌人，造成暗影伤害' },
            { name: '暗影隐身', desc: '进入暗影状态，敌人无法看到你' },
            { name: '暗影连击', desc: '连续释放暗影攻击，每次攻击威力递增' },
            { name: '暗影审判', desc: '释放终极暗影审判，对敌人造成暗影伤害' }
        ]
    }
];

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
    loadingIndicator: document.getElementById('loadingIndicator')
};

// 初始化应用
async function initApp() {
    setupEventListeners();
    loadCharacters();
    await loadArticles();
    // 渲染内容
    renderArticles(AppState.articles);
    renderCharacters(CHARACTERS_DATA);
    showPage('news');
    checkLoginStatus();
}

// 设置事件监听器
function setupEventListeners() {
    // 导航切换
    elements.navToggle.addEventListener('click', toggleNavMenu);
    
    // 导航链接点击
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            showPage(page);
            closeNavMenu();
        });
    });
    
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
    
    // 头像预览
    const avatarInput = document.getElementById('regAvatar');
    if (avatarInput) {
        avatarInput.addEventListener('change', previewAvatar);
    }
    
    // 模态框关闭
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
    
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
    }
}

// 加载资讯内容
async function loadNewsContent() {
    if (elements.articlesGrid && elements.articlesGrid.children.length === 0) {
        await loadArticles();
        renderArticles(AppState.articles);
    }
}

// 加载角色内容
function loadCharactersContent() {
    if (elements.charactersGrid && elements.charactersGrid.children.length === 0) {
        renderCharacters(CHARACTERS_DATA);
    }
}

// 加载用户内容
function loadUserContent() {
    // 用户内容已在HTML中定义，这里可以添加动态加载逻辑
}

// 加载角色数据
function loadCharacters() {
    AppState.characters = CHARACTERS_DATA;
}

// 加载文章数据
async function loadArticles() {
    // 检查是否已登录
    if (!AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
        console.log('用户未登录，不显示文章数据');
        AppState.articles = [];
        return;
    }
    
    try {
        console.log('开始加载文章数据，API地址:', `${AppState.apiBaseUrl}/api/articles/all`);
        showLoading();
        
        const response = await fetch(`${AppState.apiBaseUrl}/api/articles/all`, {
            headers: {
                'Authorization': `Bearer ${AppState.user.token}`
            }
        });
        console.log('API响应状态:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API返回数据:', result);
        
        if (result.code === 200 && result.data) {
            console.log('成功获取文章数据，数量:', result.data.length);
            // 转换数据格式以匹配前端显示需求
            AppState.articles = result.data.map(article => ({
                id: article.id,
                title: article.title,
                author: article.author || '未知作者',
                date: article.createdAt ? new Date(article.createdAt).toLocaleDateString('zh-CN') : '未知日期',
                cover: article.coverUrl || '/images/default-article.jpg',
                excerpt: article.summary || (article.content ? article.content.substring(0, 100) + '...' : '暂无摘要'),
                content: article.content || '<p>暂无内容</p>'
            }));
            console.log('转换后的文章数据:', AppState.articles);
        } else {
            console.warn('获取文章数据失败，API返回:', result);
            AppState.articles = [];
        }
    } catch (error) {
        console.error('获取文章数据时发生错误:', error);
        console.error('错误详情:', error.message);
        AppState.articles = [];
    } finally {
        hideLoading();
    }
}

// 渲染文章列表
function renderArticles(articles) {
    if (!elements.articlesGrid) return;
    
    if (articles.length === 0) {
        // 显示空状态提示
        elements.articlesGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-newspaper"></i>
                </div>
                <h3 class="empty-title">${AppState.isLoggedIn ? '暂无文章' : '请先登录'}</h3>
                <p class="empty-desc">${AppState.isLoggedIn ? '还没有发布任何文章' : '登录后即可查看最新资讯'}</p>
            </div>
        `;
        return;
    }
    
    elements.articlesGrid.innerHTML = articles.map(article => `
        <div class="article-card" onclick="showArticle(${article.id})">
            <div class="article-cover-container">
                <img src="${article.cover}" alt="${article.title}" class="article-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="article-cover-placeholder" style="display: none;">
                    <i class="fas fa-image"></i>
                    <span>暂无图片</span>
                </div>
            </div>
            <div class="article-content">
                <h3 class="article-title">${article.title}</h3>
                <p class="article-meta">${article.author} · ${article.date}</p>
                <p class="article-excerpt">${article.excerpt}</p>
            </div>
        </div>
    `).join('');
}

// 渲染角色列表
function renderCharacters(characters) {
    if (!elements.charactersGrid) return;
    
    elements.charactersGrid.innerHTML = characters.map(character => `
        <div class="character-card" onclick="showCharacter('${character.id}')">
            <div class="character-avatar-container">
                <img src="${character.cover}" alt="${character.name}" class="character-avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="character-avatar-placeholder" style="display: none;">
                    <i class="fas fa-user"></i>
                </div>
            </div>
            <h3 class="character-name">${character.name}</h3>
        </div>
    `).join('');
}

// 显示角色详情
function showCharacter(characterId) {
    const character = CHARACTERS_DATA.find(c => c.id === characterId);
    if (!character) return;
    
    const characterContent = document.getElementById('characterContent');
    const characterName = document.getElementById('characterName');
    
    if (characterName) {
        characterName.textContent = character.name;
    }
    
    if (characterContent) {
        characterContent.innerHTML = `
            <div class="character-detail">
                <div class="character-hero">
                    <div class="character-detail-avatar-container">
                        <img src="${character.cover}" alt="${character.name}" class="character-detail-avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="character-detail-avatar-placeholder" style="display: none;">
                            <i class="fas fa-user"></i>
                        </div>
                    </div>
                    <div class="character-info">
                        <h2 class="character-detail-name">${character.name}</h2>
                        <p class="character-alias">${character.alias}</p>
                    </div>
                </div>
                
                <div class="character-section">
                    <h3 class="section-title">角色介绍</h3>
                    <p class="section-content">${character.intro}</p>
                </div>
                
                <div class="character-section">
                    <h3 class="section-title">招式一览</h3>
                    <div class="moves-list">
                        ${character.moves.map(move => `
                            <div class="move-item">
                                <h4 class="move-name">${move.name}</h4>
                                <p class="move-desc">${move.desc}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="character-section">
                    <h3 class="section-title">分析</h3>
                    <p class="section-content">${character.analysis}</p>
                </div>
            </div>
        `;
    }
    
    elements.characterModal.style.display = 'block';
}

// 显示文章详情
async function showArticle(articleId) {
    let article = AppState.articles.find(a => a.id === articleId);
    
    // 如果本地没有找到文章，尝试从API获取
    if (!article) {
        try {
            showLoading();
            const response = await fetch(`${AppState.apiBaseUrl}/api/articles/${articleId}`);
            const result = await response.json();
            
            if (result.code === 200 && result.data) {
                article = {
                    id: result.data.id,
                    title: result.data.title,
                    author: result.data.author || '未知作者',
                    date: result.data.createdAt ? new Date(result.data.createdAt).toLocaleDateString('zh-CN') : '未知日期',
                    cover: result.data.coverUrl || '/images/default-article.jpg',
                    excerpt: result.data.summary || '暂无摘要',
                    content: result.data.content || '<p>暂无内容</p>'
                };
            }
        } catch (error) {
            console.error('获取文章详情时发生错误:', error);
        } finally {
            hideLoading();
        }
    }
    
    if (!article) return;
    
    const articleContent = document.getElementById('articleContent');
    const articleTitle = document.getElementById('articleTitle');
    
    if (articleTitle) {
        articleTitle.textContent = article.title;
    }
    
    if (articleContent) {
        articleContent.innerHTML = `
            <div class="article-detail">
                <div class="article-header">
                    <h2 class="article-detail-title">${article.title}</h2>
                    <p class="article-meta">${article.author} · ${article.date}</p>
                    ${article.cover ? `<img src="${article.cover}" alt="${article.title}" class="article-cover-image" style="width: 100%; max-width: 500px; height: 250px; object-fit: cover; border-radius: 12px; margin: 20px 0;">` : ''}
                </div>
                
                <div class="article-body">
                    ${article.content}
                </div>
            </div>
        `;
    }
    
    elements.articleModal.style.display = 'block';
}

// 显示登录模态框
function showLoginModal() {
    elements.loginModal.style.display = 'block';
}

// 关闭登录模态框
function closeLoginModal() {
    elements.loginModal.style.display = 'none';
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

// 关闭角色模态框
function closeCharacterModal() {
    elements.characterModal.style.display = 'none';
}

// 关闭文章模态框
function closeArticleModal() {
    elements.articleModal.style.display = 'none';
}

// 关闭所有模态框
function closeAllModals() {
    closeLoginModal();
    closeRegisterModal();
    closeCharacterModal();
    closeArticleModal();
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
function logout() {
    AppState.isLoggedIn = false;
    AppState.user = null;
    updateUserInterface();
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
    }
}

// 更新用户界面
function updateUserInterface() {
    if (AppState.isLoggedIn && AppState.user) {
        elements.loginSection.style.display = 'none';
        elements.userSection.style.display = 'block';
        
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        
        if (userName) userName.textContent = AppState.user.nickname || AppState.user.username;
        if (userAvatar) {
            const avatarUrl = AppState.user.avatarUrl || '/images/default-avatar.png';
            console.log('设置头像URL:', avatarUrl);
            userAvatar.src = avatarUrl;
        }
        
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
        showLoginModal();
        return;
    }
    alert('创建文章功能开发中...');
}

// 显示创建连段
function showCreateCombo() {
    if (!AppState.isLoggedIn) {
        showLoginModal();
        return;
    }
    alert('创建连段功能开发中...');
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


// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);