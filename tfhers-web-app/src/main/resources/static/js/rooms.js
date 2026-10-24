/* 大厅：左右分栏 / 一人一房 / 轮询聊天（约战联络，非游戏内匹配） */
(function () {

  const ROOM_TIP =
    '本房间仅用于互相联系、约定上线对战；对局请自行在 Steam 启动《Them\'s Fightin\' Herds》。';

  let pollTimer = null;
  let listPollTimer = null;
  let currentRoomId = null;   /* selected tile / preview */
  let enteredRoomId = null;   /* actually in room (chat polling) */
  let lastMsgId = 0;
  let lastMembersSig = '';
  let pollBusy = false;
  let cachedRoomList = [];
  let imageUploading = false;

  function apiBase() {
    const base = (typeof AppState !== 'undefined' && AppState.managementApiUrl)
      ? String(AppState.managementApiUrl).replace(/\/$/, '')
      : '';
    return base;
  }

  function authHeaders(json) {
    const h = {};
    if (json) h['Content-Type'] = 'application/json';
    if (typeof AppState !== 'undefined' && AppState.user && AppState.user.token) {
      h['Authorization'] = 'Bearer ' + AppState.user.token;
    }
    return h;
  }

  function isLoggedIn() {
    return typeof AppState !== 'undefined' && AppState.isLoggedIn && AppState.user && AppState.user.token;
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

  function avatarImg(url, extraClass) {
    const av = url || defaultAvatar();
    const src = esc(av);
    const cls = extraClass ? ' class="' + esc(extraClass) + '"' : '';
    if (av === defaultAvatar() || String(av).indexOf('/images/CSel3_LargePortTianhuo.png') >= 0) {
      return '<img' + cls + ' src="' + src + '" alt="">';
    }
    return '<img' + cls + ' src="' + src + '" alt="" onerror="this.onerror=null;this.src=\'' + defaultAvatar() + '\'">';
  }

  function membersSignature(members) {
    if (!members || !members.length) return '';
    return members.map(function (m) {
      return JSON.stringify([
        m.userId != null ? m.userId : '',
        m.avatarUrl || '',
        m.role || '',
        m.tier || '',
        m.rating != null ? m.rating : '',
        m.nickname || m.username || ''
      ]);
    }).join('\n');
  }

  function stopPoll() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    pollBusy = false;
  }

  function stopListPoll() {
    if (listPollTimer) {
      clearInterval(listPollTimer);
      listPollTimer = null;
    }
  }

  function toast(msg) {
    if (typeof showToast === 'function') showToast(msg);
    else if (typeof window.showAppToast === 'function') window.showAppToast(msg);
    else alert(msg);
  }

  function setLobbyHasRoom(hasRoom) {
    const layout = document.querySelector('#lobby .rooms-layout');
    if (!layout) return;
    const on = !!hasRoom;
    layout.classList.toggle('has-active-room', on);
    /* Mobile two-screen: room view vs list view (CSS only applies under 900px) */
    layout.classList.toggle('lobby-mobile-view-room', on);
    layout.classList.toggle('lobby-mobile-view-list', !on);
  }

  function roomIdleHtml() {
    return '<div class="room-idle-panel" aria-hidden="true"></div>';
  }

  function hideRoomDetail() {
    const detailEl = document.getElementById('roomDetail');
    if (!detailEl) return;
    stopPoll();
    enteredRoomId = null;
    detailEl.classList.remove('has-room', 'is-entered');
    detailEl.classList.add('is-idle');
    detailEl.innerHTML = roomIdleHtml();
    setLobbyHasRoom(false);
    document.querySelectorAll('.room-tile[data-id]').forEach(function (el) {
      el.classList.remove('is-active');
    });
  }

  function showRoomDetailShell(entered) {
    const detailEl = document.getElementById('roomDetail');
    if (!detailEl) return null;
    detailEl.classList.remove('is-idle');
    detailEl.classList.add('has-room');
    detailEl.classList.toggle('is-entered', !!entered);
    setLobbyHasRoom(true);
    return detailEl;
  }

  function hideLoginGate() {
    const gate = document.getElementById('roomsLoginGate');
    if (gate) {
      gate.hidden = true;
      gate.classList.remove('is-visible');
      gate.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('rooms-page--gated');
  }

  function showLoginGate() {
    const listEl = document.getElementById('roomList');
    const toolbar = document.getElementById('roomsToolbar');
    stopListPoll();
    currentRoomId = null;
    enteredRoomId = null;
    if (toolbar) toolbar.style.display = 'none';
    hideRoomDetail();
    if (listEl) {
      listEl.style.display = '';
      listEl.innerHTML = '';
    }
    const gate = document.getElementById('roomsLoginGate');
    if (gate) {
      gate.hidden = false;
      gate.classList.add('is-visible');
      gate.setAttribute('aria-hidden', 'false');
    }
    document.body.classList.add('rooms-page--gated');
  }

  function markSelectedCard(id) {
    currentRoomId = id;
    document.querySelectorAll('.room-tile[data-id]').forEach(function (el) {
      const did = parseInt(el.getAttribute('data-id'), 10);
      el.classList.toggle('is-active', did === id);
    });
  }

  function roomNameAbbrev(title) {
    const raw = String(title || '房间').trim() || '房间';
    // Prefer CJK / wide chars: take first 2–3
    const chars = Array.from(raw.replace(/\s+/g, ''));
    if (!chars.length) return '房';
    const hasCjk = chars.some(function (ch) {
      const code = ch.codePointAt(0);
      return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf);
    });
    if (hasCjk) return chars.slice(0, 2).join('');
    // Latin: up to 4 chars uppercased
    return chars.slice(0, 4).join('').toUpperCase();
  }

  function renderCreateCard() {
    return (
      '<button type="button" class="room-tile room-tile--create" title="创建房间" aria-label="创建房间" ' +
        'onclick="openCreateRoomModal()">' +
        '<span class="room-tile-face"><i class="fas fa-plus" aria-hidden="true"></i></span>' +
      '</button>'
    );
  }

  function sortRoomsForList(list) {
    const arr = Array.isArray(list) ? list.slice() : [];
    arr.sort(function (a, b) {
      const ah = a && a.isHost ? 1 : 0;
      const bh = b && b.isHost ? 1 : 0;
      if (ah !== bh) return bh - ah;
      const aj = a && a.joinedByMe ? 1 : 0;
      const bj = b && b.joinedByMe ? 1 : 0;
      if (aj !== bj) return bj - aj;
      return 0;
    });
    return arr;
  }

  function roomListStatus(r, cnt, max) {
    const raw = (r && r.status) ? String(r.status).toUpperCase() : '';
    if (raw === 'CLOSED') return 'CLOSED';
    if (cnt >= max) return 'FULL';
    return 'OPEN';
  }

  function roomStatusLabel(st) {
    if (st === 'FULL') return '已满';
    if (st === 'CLOSED') return '已关闭';
    return '开放中';
  }

  function renderRoomList(list) {
    const listEl = document.getElementById('roomList');
    if (!listEl) return;
    const sorted = sortRoomsForList(list);
    cachedRoomList = sorted;
    const hasOwn = sorted.some(function (r) { return r && r.isHost; });
    let html = '';
    if (!hasOwn) {
      html += renderCreateCard();
    }
    html += sorted.map(function (r) {
      const cnt = r.memberCount != null ? r.memberCount : 0;
      const max = r.maxPlayers || 4;
      const title = r.title || '未命名房间';
      const abbr = roomNameAbbrev(title);
      const active = currentRoomId === r.id ? ' is-active' : '';
      const st = roomListStatus(r, cnt, max);
      const lock = r.hasPassword ? '<i class="fas fa-lock room-tile-lock" aria-hidden="true"></i>' : '';
      let mark = '';
      if (r.isHost) mark = '<span class="room-tile-mark room-tile-mark--mine">我</span>';
      else if (r.joinedByMe) mark = '<span class="room-tile-mark room-tile-mark--joined">在</span>';
      const titleAttr = esc(title) + ' · ' + cnt + '/' + max + ' · ' + roomStatusLabel(st);
      return (
        '<button type="button" class="room-tile' + active + ' room-tile--' + st.toLowerCase() + '" data-id="' + r.id + '" ' +
          'title="' + titleAttr + '" aria-label="' + titleAttr + '" onclick="openRoomDetail(' + r.id + ')">' +
          '<span class="room-tile-face">' +
            lock +
            mark +
            '<span class="room-tile-abbr">' + esc(abbr) + '</span>' +
            '<span class="room-tile-count">' + cnt + '/' + max + '</span>' +
          '</span>' +
        '</button>'
      );
    }).join('');
    listEl.innerHTML = html || renderCreateCard();
  }

  async function fetchRoomList() {
    const resp = await fetch(apiBase() + '/api/rooms', { headers: authHeaders() });
    const data = await resp.json();
    if (resp.status === 401 || (data && data.code === 401)) {
      return { auth: false };
    }
    if (!data || data.code !== 200) {
      return { error: (data && (data.msg || data.message)) || '加载失败' };
    }
    return { list: Array.isArray(data.data) ? data.data : [] };
  }

  function startListPoll() {
    stopListPoll();
    listPollTimer = setInterval(async function () {
      if (!isLoggedIn()) return;
      try {
        const result = await fetchRoomList();
        if (result.auth === false) {
          showLoginGate();
          return;
        }
        if (result.list) {
          renderRoomList(result.list);
          if (currentRoomId) {
            const still = result.list.some(function (r) { return r.id === currentRoomId; });
            if (still) openRoomDetail(currentRoomId, true);
            else {
              enteredRoomId = null;
              currentRoomId = null;
              hideRoomDetail();
            }
          }
        }
      } catch (e) { /* ignore */ }
    }, 8000);
  }

  window.loadLobbyContent = async function loadLobbyContent() {
    stopPoll();
    stopListPoll();
    currentRoomId = null;
    enteredRoomId = null;
    lastMsgId = 0;
    lastMembersSig = '';
    cachedRoomList = [];
    const listEl = document.getElementById('roomList');
    const toolbar = document.getElementById('roomsToolbar');
    if (!listEl) return;
    listEl.style.display = '';
    if (!isLoggedIn()) {
      showLoginGate();
      return;
    }
    hideLoginGate();
    if (toolbar) toolbar.style.display = '';
    hideRoomDetail();
    listEl.innerHTML = '<div class="room-empty">加载中…</div>';
    try {
      const result = await fetchRoomList();
      if (result.auth === false) {
        showLoginGate();
        return;
      }
      if (result.error) {
        listEl.innerHTML = '<div class="room-empty">' + esc(result.error) + '</div>';
        return;
      }
      const list = result.list || [];
      renderRoomList(list);
      const joined = list.find(function (r) { return r.joinedByMe; });
      const own = list.find(function (r) { return r.isHost; });
      const auto = joined || own;
      if (auto && auto.id) {
        /* Still a server-side member: restore entered UI on lobby return
           so chat works without clicking 进入/加入 again. Preview-only
           remains for rooms the user has NOT joined (no auto here). */
        enteredRoomId = auto.id;
        openRoomDetail(auto.id, true);
      }
      startListPoll();
    } catch (e) {
      listEl.innerHTML = '<div class="room-empty">网络错误：' + esc(e.message || e) + '</div>';
    }
  };

  window.refreshRoomList = async function refreshRoomList() {
    if (!isLoggedIn()) {
      showLoginGate();
      return;
    }
    const btn = document.getElementById('roomsRefreshBtn');
    if (btn) btn.classList.add('spinning');
    try {
      const result = await fetchRoomList();
      if (result.auth === false) {
        showLoginGate();
        return;
      }
      if (result.error) {
        toast(result.error);
        return;
      }
      renderRoomList(result.list || []);
      if (currentRoomId) {
        const still = (result.list || []).some(function (r) { return r.id === currentRoomId; });
        if (!still) {
          stopPoll();
          currentRoomId = null;
          enteredRoomId = null;
          hideRoomDetail();
        } else {
          markSelectedCard(currentRoomId);
        }
      }
    } catch (e) {
      toast('刷新失败：' + (e.message || e));
    } finally {
      if (btn) btn.classList.remove('spinning');
    }
  };

  window.openCreateRoomModal = function openCreateRoomModal() {
    if (!isLoggedIn()) {
      if (typeof showLoginModal === 'function') showLoginModal();
      return;
    }
    const hasOwn = cachedRoomList.some(function (r) { return r && r.isHost; });
    if (hasOwn) {
      toast('你已有一个开放中的房间，请先关闭后再创建');
      return;
    }
    closeRoomModals();
    const wrap = document.createElement('div');
    wrap.className = 'room-modal-backdrop';
    wrap.id = 'roomModalBackdrop';
    wrap.innerHTML =
      '<div class="room-modal" role="dialog" aria-modal="true">' +
        '<h3><i class="fas fa-plus-circle"></i> 创建房间</h3>' +
        '<div class="room-form-row"><label>房间标题</label>' +
          '<input id="roomCreateTitle" maxlength="80" placeholder="房间名称"></div>' +
        '<div class="room-form-row"><label>人数上限（2–8）</label>' +
          '<select id="roomCreateMax">' +
            '<option value="2">2</option><option value="3">3</option>' +
            '<option value="4" selected>4</option><option value="5">5</option>' +
            '<option value="6">6</option><option value="7">7</option><option value="8">8</option>' +
          '</select></div>' +
        '<div class="room-form-row"><label>房间密码（可选）</label>' +
          '<input id="roomCreatePwd" type="password" maxlength="40" placeholder="留空则公开"></div>' +
        '<div class="room-modal-actions">' +
          '<button type="button" class="btn btn-secondary" onclick="closeRoomModals()">取消</button>' +
          '<button type="button" class="btn btn-primary" onclick="submitCreateRoom()">创建</button>' +
        '</div>' +
      '</div>';
    wrap.addEventListener('click', function (ev) {
      if (ev.target === wrap) closeRoomModals();
    });
    document.body.appendChild(wrap);
    const titleInput = document.getElementById('roomCreateTitle');
    if (titleInput) titleInput.focus();
  };

  window.closeRoomModals = function closeRoomModals() {
    const el = document.getElementById('roomModalBackdrop');
    if (el) el.remove();
  };

  window.submitCreateRoom = async function submitCreateRoom() {
    const title = (document.getElementById('roomCreateTitle') || {}).value || '';
    const maxPlayers = parseInt((document.getElementById('roomCreateMax') || {}).value || '4', 10);
    const password = (document.getElementById('roomCreatePwd') || {}).value || '';
    try {
      const resp = await fetch(apiBase() + '/api/rooms', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ title: title.trim(), maxPlayers: maxPlayers, password: password })
      });
      const data = await resp.json();
      if (!data || data.code !== 200) {
        toast((data && (data.msg || data.message)) || '创建失败');
        return;
      }
      closeRoomModals();
      toast('房间已创建');
      const room = data.data || {};
      await refreshRoomList();
      if (room.id) {
        enteredRoomId = room.id;
          openRoomDetail(room.id);
      }
    } catch (e) {
      toast('网络错误：' + (e.message || e));
    }
  };

  window.openRoomDetail = async function openRoomDetail(id, silent) {
    if (!isLoggedIn()) {
      showLoginGate();
      return;
    }
    try {
      markSelectedCard(id);
      const detailEl = showRoomDetailShell(enteredRoomId === id);
      if (!detailEl) return;
      if (!silent) {
        detailEl.innerHTML = '<div class="room-empty">加载中…</div>';
      }
      const resp = await fetch(apiBase() + '/api/rooms/' + id, { headers: authHeaders() });
      const data = await resp.json();
      if (!data || data.code !== 200) {
        if (!silent) toast((data && data.msg) || '加载失败');
        return;
      }
      const payload = data.data || {};
      const room = payload.room || {};
      const isMember = !!room.joinedByMe || !!room.isHost;
      /* Preview on click: never auto-join. Chat only after explicit enter/join. */
      const entered = isMember && enteredRoomId === id;
      if (!entered) {
        stopPoll();
        lastMsgId = 0;
        lastMembersSig = '';
        if (enteredRoomId && enteredRoomId !== id) {
          enteredRoomId = null;
        }
      }
      renderRoomDetail(payload, entered);
      if (entered) {
        startPoll(id);
      }
    } catch (e) {
      if (!silent) toast('加载失败：' + (e.message || e));
    }
  };

  window.enterRoomAction = function enterRoomAction(id) {
    if (!isLoggedIn()) {
      showLoginGate();
      return;
    }
    enteredRoomId = id;
    openRoomDetail(id);
  };

  function renderMembers(members) {
    if (!members || !members.length) {
      return '<span style="color:rgba(255,255,255,0.45)">暂无成员</span>';
    }
    return members.map(function (m) {
      const name = m.nickname || m.username || ('用户' + m.userId);
      const role = m.role === 'host' ? '<span class="room-member-role">房主</span>' : '';
      const tier = m.tier || 'C';
      const rating = m.rating != null ? m.rating : 1000;
      return (
        '<div class="room-member-chip">' +
          avatarImg(m.avatarUrl) +
          '<span class="room-member-name">' + esc(name) + ' ' + role + '</span>' +
          '<div class="room-member-rating">' +
            '<span class="room-member-tier" title="段位">' + esc(tier) + '</span>' +
            '<span class="room-member-score" title="积分">' + rating + '</span>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function renderRoomDetail(payload, entered) {
    const room = payload.room || {};
    const members = payload.members || [];
    lastMembersSig = membersSignature(members);
    const tip = payload.tip || ROOM_TIP;
    const st = room.status || 'OPEN';
    const joined = !!room.joinedByMe || !!room.isHost;
    const isHost = !!room.isHost;
    const closed = st === 'CLOSED';
    entered = !!entered && joined;
    const detailEl = showRoomDetailShell(entered);
    if (!detailEl) return;

    let actions = '';
    if (!closed && !joined) {
      actions += '<button class="btn btn-primary" onclick="joinRoomAction(' + room.id + ',' + (room.hasPassword ? 'true' : 'false') + ')">' +
        '<i class="fas fa-sign-in-alt"></i> 加入房间</button>';
    }
    if (!closed && joined && !entered) {
      actions += '<button class="btn btn-primary" onclick="enterRoomAction(' + room.id + ')">' +
        '<i class="fas fa-door-open"></i> 进入房间</button>';
    }
    if (!closed && joined && !isHost) {
      actions += '<button class="btn btn-secondary" onclick="leaveRoomAction(' + room.id + ')">' +
        '<i class="fas fa-sign-out-alt"></i> 离开房间</button>';
    }
    if (!closed && isHost) {
      actions += '<button class="btn btn-secondary" onclick="closeRoomAction(' + room.id + ')">' +
        '<i class="fas fa-times"></i> 关闭房间</button>';
    }

    const hostName = room.hostNickname || ('用户' + (room.hostUserId || ''));
    const cnt = members.length;
    const max = room.maxPlayers || 4;
    const listSt = roomListStatus(room, cnt, max);
    /* Password only after enter, and only for host. Preview never shows password. */
    const pwdLine = (entered && isHost && room.passwordPlain)
      ? '<div class="room-info-row"><span class="room-info-label">密码</span><span class="room-info-value room-info-pwd">' + esc(room.passwordPlain) + '</span></div>'
      : '';
    const lockHint = (!entered && room.hasPassword)
      ? '<div class="room-info-row"><span class="room-info-label">权限</span><span class="room-info-value">需要密码加入</span></div>'
      : '';

    const chatHtml = entered
      ? (
          '<section class="room-chat-panel">' +
            '<h4 class="room-panel-title">聊天</h4>' +
            '<div class="room-chat-messages" id="roomChatMessages"><div class="room-empty" style="padding:16px">暂无消息</div></div>' +
            '<form class="room-chat-form" onsubmit="return sendRoomMessage(event)">' +
              '<button type="button" class="room-chat-img-btn" title="发送图片" aria-label="发送图片" ' +
                (closed ? 'disabled' : '') + ' onclick="pickRoomChatImage()">' +
                '<i class="fas fa-image"></i></button>' +
              '<input type="file" id="roomChatImageInput" accept="image/*" style="display:none" onchange="uploadRoomChatImage(event)">' +
              '<input type="text" id="roomChatInput" maxlength="500" placeholder="' + esc(closed ? '房间已关闭' : '输入消息…') + '"' +
                (closed ? ' disabled' : '') + '>' +
              '<button type="submit" class="btn btn-primary" ' + (closed ? 'disabled' : '') + '>发送</button>' +
            '</form>' +
          '</section>'
        )
      : '';

    detailEl.innerHTML =
      '<div class="room-detail-panel">' +
        '<div class="room-detail-toolbar">' +
          '<button type="button" class="btn btn-secondary room-back-btn" onclick="backToRoomList()">' +
            '<i class="fas fa-arrow-left" aria-hidden="true"></i> 返回</button>' +
          '<div class="room-detail-toolbar-title">' + esc(room.title || '未命名房间') + '</div>' +
          (actions ? '<div class="room-detail-actions room-detail-actions--mobile">' + actions + '</div>' : '') +
        '</div>' +
        '<div class="room-layout' + (entered ? ' is-entered' : ' is-preview') + '">' +
          '<aside class="room-info-panel" id="roomMembersPanel">' +
            '<div class="room-info-block">' +
              '<h3 class="room-info-title">' + esc(room.title || '未命名房间') + '</h3>' +
              '<div class="room-info-meta">' +
                '<span class="room-status ' + listSt + '">' + roomStatusLabel(listSt) + '</span>' +
                '<span class="room-info-count">' + cnt + ' / ' + max + '</span>' +
              '</div>' +
              '<div class="room-info-row"><span class="room-info-label">房主</span><span class="room-info-value">' + esc(hostName) + '</span></div>' +
              lockHint +
              pwdLine +
              '<p class="room-info-tip">' + esc(tip) + '</p>' +
              (actions ? '<div class="room-info-actions room-detail-actions--desktop">' + actions + '</div>' : '') +
            '</div>' +
            '<div class="room-info-members">' +
              '<h4 class="room-panel-title room-members-title-desktop">成员</h4>' +
              '<button type="button" class="room-members-toggle" id="roomMembersToggle" ' +
                'aria-expanded="false" onclick="toggleRoomMembersPanel()">' +
                '<span class="room-members-toggle-left">' +
                  '<i class="fas fa-users" aria-hidden="true"></i> ' +
                  '<span id="roomMembersCount">' + members.length + '人</span>' +
                '</span>' +
                '<i class="fas fa-chevron-down room-members-chevron" aria-hidden="true"></i>' +
              '</button>' +
              '<div class="room-member-list" id="roomMemberList">' + renderMembers(members) + '</div>' +
            '</div>' +
          '</aside>' +
          chatHtml +
        '</div>' +
      '</div>';

    if (entered && !closed) {
      loadMessages(room.id, true);
    }
  }

  async function refreshMembers(roomId) {
    try {
      const resp = await fetch(apiBase() + '/api/rooms/' + roomId + '/members', { headers: authHeaders() });
      const data = await resp.json();
      if (data && data.code === 200) {
        const members = data.data || [];
        const sig = membersSignature(members);
        if (sig === lastMembersSig) return;
        lastMembersSig = sig;
        const el = document.getElementById('roomMemberList');
        if (el) el.innerHTML = renderMembers(members);
        const countEl = document.getElementById('roomMembersCount');
        if (countEl) countEl.textContent = members.length + '人';
      }
    } catch (e) { /* ignore */ }
  }

  function currentUserId() {
    if (typeof AppState === 'undefined' || !AppState.user) return null;
    const u = AppState.user;
    if (u.id != null) return u.id;
    if (u.userId != null) return u.userId;
    return null;
  }

  function appendMessages(messages, replace) {
    const box = document.getElementById('roomChatMessages');
    if (!box) return;
    if (replace) box.innerHTML = '';
    if (!messages || !messages.length) {
      if (replace || !box.children.length) {
        box.innerHTML = '<div class="room-empty" style="padding:16px">暂无消息</div>';
      }
      return;
    }
    const empty = box.querySelector('.room-empty');
    if (empty) empty.remove();
    const meId = currentUserId();
    messages.forEach(function (m) {
      if (m.id && m.id > lastMsgId) lastMsgId = m.id;
      const name = m.nickname || ('用户' + m.userId);
      const time = m.createdAt ? String(m.createdAt).replace('T', ' ').slice(0, 19) : '';
      const type = (m.msgType || m.type || 'text').toLowerCase();
      const mine = meId != null && m.userId != null && String(meId) === String(m.userId);
      const div = document.createElement('div');
      div.className = 'room-chat-item' + (mine ? ' room-chat-item--mine' : ' room-chat-item--other');
      let bodyHtml;
      if (type === 'image') {
        const url = esc(m.content || '');
        bodyHtml = '<img class="room-chat-image" src="' + url + '" alt="图片" onclick="window.open(this.src,\'_blank\')">';
      } else {
        bodyHtml = '<div class="room-chat-text">' + esc(m.content) + '</div>';
      }
      div.innerHTML =
        avatarImg(m.avatarUrl, 'room-chat-avatar') +
        '<div class="room-chat-bubble">' +
          '<div class="room-chat-meta">' + esc(name) + (time ? ' · ' + esc(time) : '') + '</div>' +
          bodyHtml +
        '</div>';
      box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
  }
  async function loadMessages(roomId, initial) {
    try {
      const after = initial ? 0 : lastMsgId;
      const resp = await fetch(apiBase() + '/api/rooms/' + roomId + '/messages?afterId=' + after, {
        headers: authHeaders()
      });
      const data = await resp.json();
      if (!data || data.code !== 200) {
        if (data && (data.code === 403 || data.code === 404)) {
          stopPoll();
          toast((data.msg || data.message) || '已不在房间内');
          currentRoomId = null;
          enteredRoomId = null;
          hideRoomDetail();
          refreshRoomList();
        }
        return;
      }
      const payload = data.data || {};
      if (payload.roomStatus === 'CLOSED') {
        stopPoll();
        refreshRoomList();
      }
      const msgs = payload.messages || [];
      if (initial) {
        lastMsgId = 0;
        appendMessages(msgs, true);
      } else if (msgs.length) {
        appendMessages(msgs, false);
      }
    } catch (e) { /* ignore poll errors */ }
  }

  function startPoll(roomId) {
    stopPoll();
    pollTimer = setInterval(async function () {
      if (pollBusy || enteredRoomId !== roomId || currentRoomId !== roomId) return;
      pollBusy = true;
      try {
        await loadMessages(roomId, false);
        await refreshMembers(roomId);
      } finally {
        pollBusy = false;
      }
    }, 2500);
  }

  window.toggleRoomMembersPanel = function toggleRoomMembersPanel() {
    const panel = document.getElementById('roomMembersPanel');
    const btn = document.getElementById('roomMembersToggle');
    if (!panel) return;
    const open = !panel.classList.contains('is-expanded');
    panel.classList.toggle('is-expanded', open);
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  window.backToRoomList = function backToRoomList() {
    stopPoll();
    currentRoomId = null;
    enteredRoomId = null;
    lastMsgId = 0;
    lastMembersSig = '';
    hideRoomDetail();
    if (typeof refreshRoomList === 'function') {
      refreshRoomList();
    }
  };

  window.joinRoomAction = async function joinRoomAction(id, needPassword) {
    let password = '';
    if (needPassword) {
      password = window.prompt('请输入房间密码') || '';
      if (!password) {
        toast('需要密码才能加入');
        return;
      }
    }
    try {
      const resp = await fetch(apiBase() + '/api/rooms/' + id + '/join', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ password: password })
      });
      const data = await resp.json();
      if (!data || data.code !== 200) {
        toast((data && (data.msg || data.message)) || '加入失败');
        return;
      }
      toast('已加入房间');
      enteredRoomId = id;
      await refreshRoomList();
      openRoomDetail(id);
    } catch (e) {
      toast('网络错误：' + (e.message || e));
    }
  };

  window.leaveRoomAction = async function leaveRoomAction(id) {
    if (!window.confirm('确定离开该房间？')) return;
    try {
      const resp = await fetch(apiBase() + '/api/rooms/' + id + '/leave', {
        method: 'POST',
        headers: authHeaders(true),
        body: '{}'
      });
      const data = await resp.json();
      if (!data || data.code !== 200) {
        toast((data && (data.msg || data.message)) || '离开失败');
        return;
      }
      toast((data && data.msg) || '已离开');
      stopPoll();
      currentRoomId = null;
      enteredRoomId = null;
      lastMsgId = 0;
      lastMembersSig = '';
      await refreshRoomList();
      hideRoomDetail();
    } catch (e) {
      toast('网络错误：' + (e.message || e));
    }
  };

  window.closeRoomAction = async function closeRoomAction(id) {
    if (!window.confirm('关闭后房间将从大厅消失，确定关闭？')) return;
    try {
      const resp = await fetch(apiBase() + '/api/rooms/' + id + '/close', {
        method: 'POST',
        headers: authHeaders(true),
        body: '{}'
      });
      const data = await resp.json();
      if (!data || data.code !== 200) {
        toast((data && (data.msg || data.message)) || '关闭失败');
        return;
      }
      toast('房间已关闭');
      stopPoll();
      currentRoomId = null;
      enteredRoomId = null;
      lastMsgId = 0;
      lastMembersSig = '';
      await refreshRoomList();
      hideRoomDetail();
    } catch (e) {
      toast('网络错误：' + (e.message || e));
    }
  };

  window.sendRoomMessage = async function sendRoomMessage(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    const input = document.getElementById('roomChatInput');
    if (!input || !currentRoomId) return false;
    const content = (input.value || '').trim();
    if (!content) return false;
    try {
      const resp = await fetch(apiBase() + '/api/rooms/' + currentRoomId + '/messages', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ content: content, msgType: 'text' })
      });
      const data = await resp.json();
      if (!data || data.code !== 200) {
        toast((data && (data.msg || data.message)) || '发送失败');
        return false;
      }
      input.value = '';
      if (data.data) {
        appendMessages([data.data], false);
      } else {
        await loadMessages(currentRoomId, false);
      }
    } catch (e) {
      toast('网络错误：' + (e.message || e));
    }
    return false;
  };

  window.pickRoomChatImage = function pickRoomChatImage() {
    if (!currentRoomId || imageUploading) return;
    const input = document.getElementById('roomChatImageInput');
    if (input) input.click();
  };

  window.uploadRoomChatImage = async function uploadRoomChatImage(ev) {
    const input = ev && ev.target ? ev.target : document.getElementById('roomChatImageInput');
    const file = input && input.files && input.files[0];
    if (!file || !currentRoomId) return;
    if (!file.type || file.type.indexOf('image/') !== 0) {
      toast('请选择图片文件');
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('图片不能超过 5MB');
      input.value = '';
      return;
    }
    imageUploading = true;
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'rooms/chat');
      const upHeaders = {};
      if (typeof AppState !== 'undefined' && AppState.user && AppState.user.token) {
        upHeaders['Authorization'] = 'Bearer ' + AppState.user.token;
      }
      const upResp = await fetch(apiBase() + '/api/file/upload', {
        method: 'POST',
        headers: upHeaders,
        body: fd
      });
      const upData = await upResp.json();
      if (!upData || upData.code !== 200 || !upData.data || !upData.data.url) {
        toast((upData && (upData.msg || upData.message)) || '图片上传失败');
        return;
      }
      const url = upData.data.url;
      const resp = await fetch(apiBase() + '/api/rooms/' + currentRoomId + '/messages', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ content: url, msgType: 'image' })
      });
      const data = await resp.json();
      if (!data || data.code !== 200) {
        toast((data && (data.msg || data.message)) || '发送失败');
        return;
      }
      if (data.data) {
        appendMessages([data.data], false);
      } else {
        await loadMessages(currentRoomId, false);
      }
    } catch (e) {
      toast('上传失败：' + (e.message || e));
    } finally {
      imageUploading = false;
      if (input) input.value = '';
    }
  };

  window.addEventListener('hashchange', function () {
    const h = (location.hash || '').replace(/^#/, '');
    if (h !== 'lobby') {
      stopPoll();
      stopListPoll();
    }
  });
})();
