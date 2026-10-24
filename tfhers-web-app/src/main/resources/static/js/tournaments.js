/* 比赛页：左侧列表 / 右侧详情（对阵图） */
(function () {
  const STATUS_LABEL = {
    draft: '草稿',
    registration: '报名中',
    closed: '报名截止',
    ongoing: '进行中',
    finished: '已结束',
    cancelled: '已取消'
  };

  let selectedId = null;

  function apiBase() {
    const base = (typeof AppState !== 'undefined' && AppState.managementApiUrl)
      ? String(AppState.managementApiUrl).replace(/\/$/, '')
      : '';
    return base;
  }

  function authHeaders() {
    const h = {};
    if (typeof AppState !== 'undefined' && AppState.user && AppState.user.token) {
      h['Authorization'] = 'Bearer ' + AppState.user.token;
    }
    return h;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function defaultAvatar() {
    return '/images/CSel3_LargePortTianhuo.png';
  }

  function formatDateTime(v) {
    if (v == null || v === '') return '';
    let s = String(v).trim();
    if (!s) return '';
    // 2026-10-19T15:00:00 or 2026-10-19 15:00:00
    s = s.replace('T', ' ');
    if (s.length >= 16) return s.slice(0, 16);
    return s;
  }

  function deadlineText(t) {
    const close = formatDateTime(t.registrationClosesAt);
    const start = formatDateTime(t.startsAt);
    const parts = [];
    if (close) parts.push('报名截止 ' + close);
    if (start) parts.push('开赛 ' + start);
    return parts.join(' · ') || '时间待定';
  }

  window.loadTournamentsContent = async function loadTournamentsContent() {
    const listEl = document.getElementById('tournamentList');
    const detailEl = document.getElementById('tournamentDetail');
    if (!listEl) return;
    listEl.innerHTML = '<div class="tournament-empty">加载中…</div>';
    if (detailEl && selectedId == null) {
      detailEl.classList.add('active');
      detailEl.innerHTML = '<div class="tournament-empty">请选择左侧比赛查看详情</div>';
    }
    try {
      const resp = await fetch(apiBase() + '/api/tournaments', { headers: authHeaders() });
      const data = await resp.json();
      if (!data || data.code !== 200) {
        listEl.innerHTML = '<div class="tournament-empty">' + esc((data && (data.msg || data.message)) || '加载失败') + '</div>';
        return;
      }
      const list = Array.isArray(data.data) ? data.data : [];
      if (!list.length) {
        listEl.innerHTML = '<div class="tournament-empty">暂无公开比赛<br><span style="font-size:0.85em">管理员可在后台创建并开放报名</span></div>';
        if (detailEl) {
          detailEl.classList.add('active');
          detailEl.innerHTML = '<div class="tournament-empty">暂无比赛</div>';
        }
        selectedId = null;
        return;
      }
      renderTournamentList(list);
      const keepId = selectedId && list.some(function (x) { return x.id === selectedId; })
        ? selectedId
        : list[0].id;
      openTournamentDetail(keepId, true);
    } catch (e) {
      listEl.innerHTML = '<div class="tournament-empty">网络错误：' + esc(e.message || e) + '</div>';
    }
  };

  function renderTournamentList(list) {
    const listEl = document.getElementById('tournamentList');
    if (!listEl) return;
    listEl.innerHTML = list.map(function (t) {
      const st = t.status || '';
      const cnt = t.registrationCount != null ? t.registrationCount : 0;
      const slots = t.maxSlots || 16;
      const mine = t.registeredByMe ? ' · 已报名' : '';
      const active = selectedId === t.id ? ' active' : '';
      return (
        '<article class="tournament-card' + active + '" data-id="' + t.id + '" onclick="openTournamentDetail(' + t.id + ')">' +
          '<div class="tournament-card-top">' +
            '<h3 class="tournament-card-title">' + esc(t.title || '未命名比赛') + '</h3>' +
            '<span class="tournament-status ' + esc(st) + '">' + esc(STATUS_LABEL[st] || st) + '</span>' +
          '</div>' +
          '<div class="tournament-card-meta">' +
            '<span><i class="fas fa-users"></i> ' + cnt + ' / ' + slots + ' 人' + esc(mine) + '</span>' +
            '<span><i class="fas fa-clock"></i> ' + esc(deadlineText(t)) + '</span>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  function markSelectedCard(id) {
    selectedId = id;
    document.querySelectorAll('.tournament-card').forEach(function (el) {
      const did = parseInt(el.getAttribute('data-id'), 10);
      el.classList.toggle('active', did === id);
    });
  }

  window.openTournamentDetail = async function openTournamentDetail(id, silentList) {
    const detailEl = document.getElementById('tournamentDetail');
    if (!detailEl) return;
    markSelectedCard(id);
    detailEl.classList.add('active');
    if (!silentList) {
      detailEl.innerHTML = '<div class="tournament-empty">加载中…</div>';
    }
    try {
      const [dResp, bResp] = await Promise.all([
        fetch(apiBase() + '/api/tournaments/' + id, { headers: authHeaders() }),
        fetch(apiBase() + '/api/tournaments/' + id + '/bracket', { headers: authHeaders() })
      ]);
      const detail = await dResp.json();
      const bracket = await bResp.json();
      if (!detail || detail.code !== 200) {
        detailEl.innerHTML = '<div class="tournament-empty">' + esc((detail && detail.msg) || '加载失败') + '</div>';
        return;
      }
      const t = (detail.data && detail.data.tournament) || {};
      const regs = (detail.data && detail.data.registrations) || [];
      const canRegister = !!(detail.data && detail.data.canRegister);
      const registeredByMe = !!(detail.data && detail.data.registeredByMe);
      const st = t.status || '';

      let actions = '';
      if (canRegister) {
        actions += '<button class="btn btn-primary" onclick="registerTournament(' + id + ')"><i class="fas fa-pen"></i> 立即报名</button>';
      } else if (registeredByMe && st === 'registration') {
        actions += '<button class="btn btn-secondary" onclick="withdrawTournament(' + id + ')"><i class="fas fa-times"></i> 取消报名</button>';
      } else if (st === 'registration' && !(typeof AppState !== 'undefined' && AppState.isLoggedIn)) {
        actions += '<button class="btn btn-primary" onclick="showLoginModal && showLoginModal()"><i class="fas fa-sign-in-alt"></i> 登录后报名</button>';
      }

      const regsHtml = regs.length
        ? regs.map(function (r) {
            const name = r.nickname || r.username || ('用户' + r.userId);
            const av = r.avatarUrl || defaultAvatar();
            return '<span class="tournament-reg-chip"><img src="' + esc(av) + '" alt="" onerror="this.onerror=null;this.src=\'' + defaultAvatar() + '\'"><span>' + esc(name) + '</span></span>';
          }).join('')
        : '<span style="color:rgba(255,255,255,0.45)">暂无报名</span>';

      let bracketHtml = '';
      if (bracket && bracket.code === 200 && bracket.data && Array.isArray(bracket.data.matches) && bracket.data.matches.length) {
        bracketHtml = renderBracket(bracket.data);
      } else {
        bracketHtml = '<div class="tournament-empty" style="padding:24px">对阵图尚未生成</div>';
      }

      const descHtml = t.description
        ? '<p class="tournament-detail-desc">' + esc(t.description) + '</p>'
        : '<p class="tournament-detail-desc tournament-detail-desc--empty">暂无说明</p>';

      detailEl.innerHTML =
        '<div class="tournament-detail-panel">' +
          '<div class="tournament-detail-head">' +
            '<div class="tournament-detail-head-row">' +
              '<div class="tournament-detail-head-main">' +
                '<h3 class="tournament-section-title" style="margin-top:0">说明</h3>' +
                descHtml +
              '</div>' +
              (actions
                ? '<div class="tournament-detail-actions">' + actions + '</div>'
                : '') +
            '</div>' +
          '</div>' +
          '<div class="tournament-regs">' +
            '<h3 class="tournament-section-title">选手</h3>' +
            '<div class="tournament-reg-list">' + regsHtml + '</div>' +
          '</div>' +
          '<h3 class="tournament-section-title">对阵图</h3>' +
          '<div class="bracket-wrap">' + bracketHtml + '</div>' +
        '</div>';
    } catch (e) {
      detailEl.innerHTML = '<div class="tournament-empty">加载失败：' + esc(e.message || e) + '</div>';
    }
  };

  function renderBracket(data) {
    const rounds = data.rounds || {};
    const labels = data.roundLabels || {};
    const keys = Object.keys(rounds).map(Number).sort(function (a, b) { return a - b; });
    if (!keys.length) return '<div class="tournament-empty">暂无对阵</div>';
    let html = '<div class="bracket-board">';
    keys.forEach(function (rk) {
      const list = rounds[rk] || [];
      const label = labels[String(rk)] || ('第' + rk + '轮');
      html += '<div class="bracket-round"><div class="bracket-round-title">' + esc(label) + '</div><div class="bracket-round-body">';
      list.forEach(function (m) {
        html += renderMatch(m);
      });
      html += '</div></div>';
    });
    html += '</div>';
    return html;
  }

  function renderMatch(m) {
    const w = m.winnerId;
    const n1 = m.player1Nickname || (m.player1UserId ? ('用户' + m.player1UserId) : '待定');
    const n2 = m.player2Nickname || (m.player2UserId ? ('用户' + m.player2UserId) : '待定');
    const a1 = m.player1AvatarUrl || defaultAvatar();
    const a2 = m.player2AvatarUrl || defaultAvatar();
    const s1 = m.score1 != null ? m.score1 : '';
    const s2 = m.score2 != null ? m.score2 : '';
    const c1 = (!m.player1UserId ? ' tbd' : '') + (w && m.player1UserId === w ? ' winner' : '');
    const c2 = (!m.player2UserId ? ' tbd' : '') + (w && m.player2UserId === w ? ' winner' : '');
    return (
      '<div class="bracket-match" data-match-id="' + m.id + '">' +
        '<div class="bracket-slot' + c1 + '">' +
          (m.player1UserId ? '<img class="bracket-avatar" src="' + esc(a1) + '" alt="" onerror="this.onerror=null;this.src=\'' + defaultAvatar() + '\'">' : '<span class="bracket-avatar"></span>') +
          '<span class="bracket-name">' + esc(n1) + '</span>' +
          '<span class="bracket-score">' + esc(s1) + '</span>' +
        '</div>' +
        '<div class="bracket-slot' + c2 + '">' +
          (m.player2UserId ? '<img class="bracket-avatar" src="' + esc(a2) + '" alt="" onerror="this.onerror=null;this.src=\'' + defaultAvatar() + '\'">' : '<span class="bracket-avatar"></span>') +
          '<span class="bracket-name">' + esc(n2) + '</span>' +
          '<span class="bracket-score">' + esc(s2) + '</span>' +
        '</div>' +
      '</div>'
    );
  }

  window.backToTournamentList = function backToTournamentList() {
    selectedId = null;
    if (typeof loadTournamentsContent === 'function') loadTournamentsContent();
  };

  window.registerTournament = async function registerTournament(id) {
    if (!(typeof AppState !== 'undefined' && AppState.isLoggedIn && AppState.user && AppState.user.token)) {
      if (typeof showLoginModal === 'function') showLoginModal();
      else alert('请先登录');
      return;
    }
    try {
      const resp = await fetch(apiBase() + '/api/tournaments/' + id + '/register', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders())
      });
      const data = await resp.json();
      if (data && data.code === 200) {
        alert(data.msg || '报名成功');
        loadTournamentsContent();
      } else {
        alert((data && (data.msg || data.message)) || '报名失败');
      }
    } catch (e) {
      alert('报名失败：' + (e.message || e));
    }
  };

  window.withdrawTournament = async function withdrawTournament(id) {
    if (!confirm('确认取消报名？')) return;
    try {
      const resp = await fetch(apiBase() + '/api/tournaments/' + id + '/register', {
        method: 'DELETE',
        headers: authHeaders()
      });
      const data = await resp.json();
      if (data && data.code === 200) {
        alert(data.msg || '已取消');
        loadTournamentsContent();
      } else {
        alert((data && (data.msg || data.message)) || '取消失败');
      }
    } catch (e) {
      alert('取消失败：' + (e.message || e));
    }
  };
})();
