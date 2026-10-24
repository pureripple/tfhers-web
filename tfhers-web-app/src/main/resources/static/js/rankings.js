/* 站内排位榜 */
(function () {
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

  function tierClass(tier) {
    const t = (tier || 'D').toUpperCase();
    return 'tier-' + t;
  }

  window.loadRankingsContent = async function loadRankingsContent() {
    const listEl = document.getElementById('rankingsList');
    if (!listEl) return;
    listEl.innerHTML = '<div class="rankings-empty">加载中…</div>';
    try {
      const resp = await fetch(apiBase() + '/api/rankings?limit=50', { headers: authHeaders() });
      const data = await resp.json();
      if (!data || data.code !== 200) {
        listEl.innerHTML = '<div class="rankings-empty">' + esc((data && (data.msg || data.message)) || '加载失败') + '</div>';
        return;
      }
      const payload = data.data || {};
      const list = Array.isArray(payload.list) ? payload.list : (Array.isArray(data.data) ? data.data : []);
      if (!list.length) {
        listEl.innerHTML = '<div class="rankings-empty">暂无排名</div>';
        return;
      }
      listEl.innerHTML = list.map(function (row, i) {
        const rank = row.rank != null ? row.rank : (i + 1);
        const topCls = rank === 1 ? ' top1' : (rank === 2 ? ' top2' : (rank === 3 ? ' top3' : ''));
        const name = row.nickname || row.username || ('用户#' + row.userId);
        const avatar = row.avatarUrl || defaultAvatar();
        const rating = row.rating != null ? row.rating : 1000;
        const tier = row.tier || 'C';
        const wins = row.wins != null ? row.wins : 0;
        const losses = row.losses != null ? row.losses : 0;
        const played = row.matchesPlayed != null ? row.matchesPlayed : (wins + losses);
        return (
          '<div class="ranking-row' + topCls + '">' +
            '<div class="ranking-rank">' + (rank <= 3 ? '<i class="fas fa-crown"></i> ' : '') + rank + '</div>' +
            '<img class="ranking-avatar" src="' + esc(avatar) + '" alt="" onerror="this.onerror=null;if(this.dataset.imgFailed)return;this.dataset.imgFailed=\'1\';var __f=\'' + defaultAvatar() + '\';if(((this.getAttribute(\'src\')||\'\').indexOf(\'Tianhuo\')>=0)){this.style.visibility=\'hidden\';}else{this.src=__f;}">' +
            '<div class="ranking-info">' +
              '<div class="ranking-name' + ((typeof adminNameClass === 'function' ? adminNameClass(row) : '')) + '">' + esc(name) + '</div>' +
              '<div class="ranking-meta">战绩 ' + wins + '胜 / ' + losses + '负 · 共 ' + played + ' 场</div>' +
            '</div>' +
            '<div class="ranking-score-box">' +
              '<div class="ranking-score">' + rating + '</div>' +
              '<span class="ranking-tier ' + tierClass(tier) + '">' + esc(String(tier || 'C').toUpperCase().charAt(0)) + '</span>' +
            '</div>' +
          '</div>'
        );
      }).join('');
    } catch (e) {
      listEl.innerHTML = '<div class="rankings-empty">网络错误：' + esc(e.message || e) + '</div>';
    }
  };

  /** 刷新评分：更新 AppState 与头像下拉；若存在 #userRatingBadge 则同步徽章 */
  window.refreshMyRatingBadge = async function refreshMyRatingBadge() {
    const badge = document.getElementById('userRatingBadge');
    if (typeof AppState === 'undefined' || !AppState.isLoggedIn || !AppState.user || !AppState.user.token) {
      if (badge) {
        badge.style.display = 'none';
        badge.innerHTML = '';
      }
      return;
    }
    try {
      const resp = await fetch(apiBase() + '/api/user/rating', { headers: authHeaders() });
      const data = await resp.json();
      if (!data || data.code !== 200 || !data.data) {
        if (badge) badge.style.display = 'none';
        return;
      }
      const d = data.data;
      const rating = d.rating != null ? d.rating : 1000;
      const tier = String(d.tier || 'C').toUpperCase().replace(/[^SABCD]/g, '').charAt(0) || 'C';
      const rank = d.rank;
      const wins = d.wins != null ? d.wins : 0;
      const losses = d.losses != null ? d.losses : 0;
      const rankText = (rank != null && rank !== '' && String(rank) !== '—') ? ('#' + rank) : '#—';
      // 保存到 AppState（供头像下拉 updateTopAccountPanel 使用）
      AppState.user.rating = rating;
      AppState.user.tier = tier;
      AppState.user.siteRank = rank;
      if (badge) {
        badge.style.display = 'flex';
        badge.innerHTML =
          '<span class="profile-rating-chip"><span class="tier-pill ' + tierClass(tier) + '">' + esc(tier) + '</span> ' + rating + '</span>' +
          '<span class="profile-rating-chip"><i class="fas fa-ranking-star"></i> ' + esc(rankText) + '</span>' +
          '<span class="profile-rating-chip">' + wins + '胜 ' + losses + '负</span>';
      }
      if (typeof updateTopAccountPanel === 'function') updateTopAccountPanel();
    } catch (e) {
      if (badge) badge.style.display = 'none';
    }
  };
})();