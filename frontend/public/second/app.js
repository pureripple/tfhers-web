/* ============================================================
   CHARACTER SELECT — 3D stage
   ------------------------------------------------------------
   · 背景：把一张 16:9 图切成 N 条竖片，沿圆柱面排布，形成
            “电影院弧形大屏”的效果（纯 CSS 3D，无依赖）
   · 立绘：位于弧形屏之前的独立图层，鼠标移动时视差位移更大
   ============================================================ */

(() => {
  'use strict';

  /* ---------------- 角色数据 ---------------- */

  const CHARACTERS = [
    { id: 'arizona',    name: 'Arizona',    accent: '#ff5c33', file: 'arizona.png' },
    { id: 'baihe',      name: 'Baihe',      accent: '#ffa34d', file: 'baihe.png' },
    { id: 'nidra',      name: 'Nidra',      accent: '#a855f7', file: 'nidra.png' },
    { id: 'oleander',   name: 'Oleander',   accent: '#e83fb0', file: 'oleander.png' },
    { id: 'paprika',    name: 'Paprika',    accent: '#ffb056', file: 'paprika.png' },
    { id: 'pom',        name: 'Pom',        accent: '#d7e04a', file: 'pom.png' },
    { id: 'shanty',     name: 'Shanty',     accent: '#ff8a5c', file: 'shanty.png' },
    { id: 'stronghoof', name: 'Stronghoof', accent: '#ff4d7e', file: 'stronghoof.png' },
    { id: 'texas',      name: 'Texas',      accent: '#ff6b4a', file: 'texas.png' },
    { id: 'tianhuo',    name: 'Tianhuo',    accent: '#ff7a18', file: 'tianhuo.png' },
    { id: 'velvet',     name: 'Velvet',     accent: '#4961e7', file: 'velvet.png' },
  ].map(c => ({
    ...c,
    src: `assets/portraits/${c.file}`,
    thumb: `assets/thumbs/${c.id}.jpg`,
  }));

  /* ---------------- DOM ---------------- */

  const root = document.documentElement;
  const cylinder = document.getElementById('cylinder');
  const stage = document.getElementById('stage');
  const glow = document.getElementById('portraitGlow');
  const follow = document.getElementById('glowFollow');
  const tilesEl = document.getElementById('tiles');
  const nameEl = document.getElementById('charName');
  const stateEl = document.getElementById('charState');
  const layers = [
    document.getElementById('portraitA'),
    document.getElementById('portraitB'),
  ];

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- 弧形屏 ---------------- */

  const SLICE_COUNT = 32;
  const ARC = 0.75;             // 弧面总张角（弧度），越大越弯
  const COVER = 1.15;           // 画面放大系数，抵消弧面两侧的透视内缩

  function buildScreen() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // 以 16:9 的比例铺满视口，再整体放大，保证弧面边缘不会露底
    const scale = Math.max(vw / 1920, vh / 1080) * COVER;
    const planeW = 1920 * scale;
    const planeH = 1080 * scale;

    const sliceW = planeW / SLICE_COUNT;
    const bleed = 1.6;                       // 相邻竖片的重叠像素，消除接缝
    const radius = planeW / ARC;

    cylinder.style.width = `${planeW}px`;
    cylinder.style.height = `${planeH}px`;
    cylinder.textContent = '';

    const frag = document.createDocumentFragment();

    for (let i = 0; i < SLICE_COUNT; i++) {
      const el = document.createElement('div');
      el.className = 'slice';

      const w = sliceW + bleed;
      el.style.width = `${w}px`;
      el.style.height = `${planeH}px`;
      el.style.left = `${i * sliceW}px`;
      el.style.backgroundSize = `${planeW}px ${planeH}px`;
      el.style.backgroundPosition = `${-i * sliceW}px 0px`;

      // 竖片中心所在的圆心角
      const theta = ((i + 0.5) / SLICE_COUNT - 0.5) * ARC;
      const centerX = i * sliceW + w / 2 - planeW / 2;   // 展开状态下的横坐标（圆心为原点）
      const targetX = radius * Math.sin(theta);
      const targetZ = radius * Math.cos(theta) - radius;

      el.style.transform =
        `translate3d(${(targetX - centerX).toFixed(2)}px, 0, ${targetZ.toFixed(2)}px)` +
        ` rotateY(${theta.toFixed(5)}rad)`;

      frag.appendChild(el);
    }

    cylinder.appendChild(frag);
  }

  /* ---------------- 立绘切换 ---------------- */

  let front = 0;               // 当前可见的立绘图层
  let shownId = null;
  let selected = null;         // 空状态起步：不点选就没有“已确认”的角色
  let previewing = null;       // 悬停预览中的角色

  /** 清空舞台：没有选取、也没有悬停时，左侧不显示任何立绘 */
  function clearStage() {
    if (shownId === null) return;
    shownId = null;
    layers.forEach(l => l.classList.remove('is-active'));
    nameEl.textContent = '—';
    nameEl.classList.add('is-empty');
    stateEl.textContent = '未选择';
    stateEl.classList.remove('is-preview');
  }

  function paint(char) {
    if (!char) { clearStage(); return; }
    if (char.id === shownId) { updateMeta(char); return; }
    shownId = char.id;

    const incoming = layers[1 - front];
    const outgoing = layers[front];
    const img = incoming.querySelector('img');

    img.src = char.src;
    img.alt = char.name;

    // 先复位再触发过渡，保证每次都是“从下方弹入”
    incoming.classList.remove('is-active');
    void incoming.offsetWidth;
    incoming.classList.add('is-active');
    outgoing.classList.remove('is-active');

    front = 1 - front;

    root.style.setProperty('--accent', char.accent);

    nameEl.textContent = char.name;
    nameEl.classList.remove('is-empty');
    nameEl.classList.remove('swap');
    void nameEl.offsetWidth;
    nameEl.classList.add('swap');

    updateMeta(char);
  }

  function updateMeta(char) {
    if (!char) {
      stateEl.textContent = '未选择';
      stateEl.classList.remove('is-preview');
      return;
    }
    const isConfirmed = !!selected && char.id === selected.id;
    stateEl.textContent = isConfirmed ? '已确认' : '预览中';
    stateEl.classList.toggle('is-preview', !isConfirmed);
  }

  function select(char) {
    selected = char;
    previewing = null;
    tilesEl.querySelectorAll('.tile').forEach(t => {
      const on = t.dataset.id === char.id;
      t.classList.toggle('is-selected', on);
      t.setAttribute('aria-selected', String(on));
    });
    paint(char);
    updateMeta(char);
    // 该侧舞台进入“已选取”状态（发光）
    stage.classList.add('is-picked');
  }

  /* ---------------- 底部角色框 ---------------- */

  function buildTiles() {
    const frag = document.createDocumentFragment();

    CHARACTERS.forEach(c => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tile';
      btn.dataset.id = c.id;
      btn.style.setProperty('--c', c.accent);
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-label', c.name);
      btn.title = c.name;

      const art = document.createElement('span');
      art.className = 'tile-art';
      const img = document.createElement('img');
      img.src = c.thumb;
      img.alt = '';
      img.decoding = 'async';
      img.draggable = false;
      art.appendChild(img);

      const label = document.createElement('span');
      label.className = 'tile-name';
      label.textContent = c.name;

      btn.append(art, label);

      btn.addEventListener('pointerenter', () => { previewing = c; paint(c); });
      btn.addEventListener('focus', () => { previewing = c; paint(c); });
      btn.addEventListener('click', () => select(c));

      frag.appendChild(btn);
    });

    tilesEl.appendChild(frag);

    // 鼠标移出选人条 → 回到已选角色；没选过就隐藏大图
    tilesEl.addEventListener('pointerleave', () => {
      if (!previewing) return;
      previewing = null;
      paint(selected);
    });

    // 键盘焦点离开选人条，同样回到已选角色 / 隐藏
    tilesEl.addEventListener('focusout', e => {
      const next = e.relatedTarget;
      if (next instanceof Node && tilesEl.contains(next)) return;
      if (!previewing) return;
      previewing = null;
      paint(selected);
    });

    tilesEl.addEventListener('keydown', e => {
      const list = [...tilesEl.querySelectorAll('.tile')];
      const i = list.indexOf(document.activeElement);
      if (i < 0) return;
      let next = null;
      if (e.key === 'ArrowRight') next = list[Math.min(i + 1, list.length - 1)];
      if (e.key === 'ArrowLeft') next = list[Math.max(i - 1, 0)];
      if (next) { e.preventDefault(); next.focus(); }
    });
  }

  /* ---------------- 鼠标视差 ---------------- */

  const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  let rafId = 0;
  let idle = 0;

  /* 弧形屏整体上移，让下方两块六边形台面露出到 dock 之上
     （与 style.css 里 .cylinder 的初始 translateY 保持一致） */
  const SCREEN_Y_RATIO = -0.045;
  const screenY = () => SCREEN_Y_RATIO * window.innerHeight;

  window.addEventListener('pointermove', e => {
    pointer.tx = e.clientX / window.innerWidth;
    pointer.ty = e.clientY / window.innerHeight;
    idle = 0;
    if (!rafId) rafId = requestAnimationFrame(tick);
  });

  function tick() {
    pointer.x += (pointer.tx - pointer.x) * 0.065;
    pointer.y += (pointer.ty - pointer.y) * 0.065;

    const dx = (pointer.x - 0.5) * 2;   // -1 … 1
    const dy = (pointer.y - 0.5) * 2;

    // 背景弧屏：绕中心做极小角度旋转，像镜头在移（整体再上移 screenY）
    cylinder.style.transform =
      `translate(-50%, -50%) translate3d(${(-dx * 12).toFixed(2)}px, ${(screenY() - dy * 8).toFixed(2)}px, 0)` +
      ` rotateY(${(-dx * 2.4).toFixed(3)}deg) rotateX(${(dy * 1.6).toFixed(3)}deg)`;

    // 立绘更靠近镜头，位移更大
    stage.style.setProperty('--px', `${(-dx * 26).toFixed(2)}px`);
    stage.style.setProperty('--py', `${(-dy * 14).toFixed(2)}px`);

    glow.style.transform = `translate3d(${(-dx * 14).toFixed(2)}px, ${(-dy * 8).toFixed(2)}px, 0)`;

    follow.style.transform =
      `translate3d(${(pointer.x * 100 - 50).toFixed(2)}vw, ${(pointer.y * 100 - 50).toFixed(2)}vh, 0)`;

    const settled =
      Math.abs(pointer.tx - pointer.x) < 0.0006 &&
      Math.abs(pointer.ty - pointer.y) < 0.0006;

    if (settled && ++idle > 20) { rafId = 0; return; }
    rafId = requestAnimationFrame(tick);
  }

  /* ---------------- 启动 ---------------- */

  function preload() {
    const urls = ['assets/bg.png', ...CHARACTERS.map(c => c.src), ...CHARACTERS.map(c => c.thumb)];
    return Promise.all(urls.map(u => new Promise(res => {
      const img = new Image();
      img.onload = img.onerror = () => res();
      img.src = u;
    })));
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildScreen, 120);
  });

  buildTiles();

  preload().then(() => {
    buildScreen();

    requestAnimationFrame(() => {
      // 空状态：不预选任何角色，左侧不显示立绘
      nameEl.classList.add('is-empty');
      clearStage();
      root.style.setProperty('--accent', CHARACTERS[0].accent);

      document.body.classList.add('is-ready');

      if (!reducedMotion) rafId = requestAnimationFrame(tick);

      /* ?char=velvet 可直接定位并选中某个角色 */
      const wanted = new URLSearchParams(location.search).get('char');
      const found = wanted && CHARACTERS.find(c => c.id === wanted.toLowerCase());
      if (found) select(found);
    });
  });
})();
