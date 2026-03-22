/* ============================================
   main.js — 程序入口
   ============================================ */

async function init() {
  // Migrate old localStorage data to IndexedDB
  await migrateFromLocalStorage();

  // Load all data into cache
  Cache.chars = await getAllChars();
  Cache.npcs = await getAllNpcs();
  Cache.worldbooks = await getAllWorldbooks();
  Cache.dynamics = await getAllDynamics();
  Cache.stickers = await getAllStickers();
  S.bubbleMe = await getConfig('bubbleMe', '#a78bfa');
  S.bubbleThem = await getConfig('bubbleThem', '#f0f0f2');

  // Render home
  await renderHome();
  renderChars();

  // Apply wallpaper
  await applyWallpaper();

  // Apply bubble colors
  applyBubs(S.bubbleMe, S.bubbleThem);

  // Clock
  tick();
  setInterval(tick, 1000);

  // Long press on home icons for edit mode
  const iw = document.getElementById('icons-grid');
  if (iw) {
    iw.addEventListener('touchstart', () => { if (!S.editMode) lpt = setTimeout(enterEdit, 600); }, { passive: true });
    iw.addEventListener('touchend', () => clearTimeout(lpt), { passive: true });
    iw.addEventListener('touchmove', () => clearTimeout(lpt), { passive: true });
  }

  // Click outside sheets to close
  document.querySelectorAll('.sh-ov,.hs-ov').forEach(el => {
    el.addEventListener('click', e => { if (e.target === el) el.classList.remove('show'); });
  });

  // iOS keyboard fix
  document.addEventListener('focusout', () => {
    setTimeout(() => { window.scrollTo(0, 0); document.body.scrollTop = 0; }, 50);
  });

  console.log('[MyPocket] 初始化完成 — ' + Cache.chars.length + ' 个角色, DB: IndexedDB');
}

/* ====== WALLPAPER ====== */
async function applyWallpaper() {
  const id = await getConfig('wallpaperId', 'p0');
  const el = document.getElementById('wp');
  const p = WP_PRESETS.find(x => x.id === id);
  if (p) {
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:0;pointer-events:none;background:' + p.g;
    document.documentElement.style.background = p.g;
  } else if (id.startsWith('c')) {
    const cs = await getConfig('wallpaperCustom', []);
    const c = cs[parseInt(id.slice(1))];
    if (c) {
      el.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:0;pointer-events:none;background-image:url("' + c + '");background-size:cover;background-position:center';
      document.documentElement.style.background = '#111';
    }
  }
}

/* ====== BUBBLE COLORS ====== */
function applyBubs(me, them) {
  const meDark = ['#374151', '#1e1e22', '#1a1a2e'].indexOf(me) >= 0;
  const themDark = ['#374151', '#1e1e22'].indexOf(them) >= 0;
  document.documentElement.style.setProperty('--bme', me);
  document.documentElement.style.setProperty('--bthem', them);
  document.documentElement.style.setProperty('--bme-t', meDark ? '#f0f0f2' : '#1c1c1e');
  document.documentElement.style.setProperty('--bthem-t', themDark ? '#f0f0f2' : '#1c1c1e');
}

/* ====== CHAT LIST (basic) ====== */
function renderChars() {
  const list = document.getElementById('char-list');
  const empty = document.getElementById('char-empty');
  if (!Cache.chars.length) { list.innerHTML = ''; empty.style.display = 'flex'; return; }
  empty.style.display = 'none';
  const now = new Date();
  list.innerHTML = Cache.chars.map(c => {
    const last = c.messages && c.messages.length ? c.messages[c.messages.length - 1].content.slice(0, 30) : '点击开始对话';
    const t = pad(now.getHours()) + ':' + pad(now.getMinutes());
    return '<div style="display:flex;align-items:center;gap:12px;padding:13px 16px;border-bottom:1px solid var(--border);cursor:pointer;background:var(--surface)" onclick="openConv(\'' + c.id + '\')">' +
      '<div style="width:52px;height:52px;border-radius:50%;background:#f0f0f2;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">' +
      (c.charAv ? '<img src="' + c.charAv + '" style="width:100%;height:100%;object-fit:cover">' : '<span>' + (c.emoji || '🧑') + '</span>') +
      '</div><div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="font-size:15px;font-weight:500;color:var(--text)">' + esc(c.nick || c.real) + '</span><span style="font-size:11px;color:var(--text3)">' + t + '</span></div>' +
      '<div style="font-size:13px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(last) + '</div></div></div>';
  }).join('');
}

/* ====== CREATE CHAR (basic) ====== */
async function createChar() {
  const name = document.getElementById('nc-name').value.trim();
  if (!name) { toast('请填写名字'); return; }
  const c = {
    id: uid('c'), real: name, nick: '', charNick: '', rel: '',
    cGender: '', cAge: '', cJob: '', cFrom: '', cLive: '',
    uName: '', uGender: '', uAge: '', uJob: '',
    history: '', emoji: '🧑', charAv: '', userAv: '',
    charDesc: '', userDesc: '', wbIds: [], ctx: 20,
    memOn: false, autoSum: false, sumCt: 50, sumPrompt: '',
    summaries: [], timeOn: true, chatBg: '',
    bubbleMe: '#a78bfa', bubbleThem: '#f0f0f2',
    messages: [], status: '', hearts: [], blacklist: null
  };
  await saveChar(c);
  Cache.chars.push(c);
  closeSh('sh-newchar');
  document.getElementById('nc-name').value = '';
  renderChars();
  S.cid = c.id;
  toast('请先填写角色人设');
  // TODO: openCharSet() — will be in char_settings.js
}

/* Placeholder for openConv — will be in chat.js */
function openConv(id) {
  toast('聊天模块加载中...');
  // Will be replaced when chat.js is added
}

/* ====== BOOT ====== */
init();
