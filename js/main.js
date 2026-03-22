/* ============================================
   main.js — 程序入口
   ============================================ */

async function init() {
  await migrateFromLocalStorage();

  // Load all data into cache
  Cache.chars = await getAllChars();
  Cache.npcs = await getAllNpcs();
  Cache.worldbooks = await getAllWorldbooks();
  Cache.dynamics = await getAllDynamics();
  Cache.stickers = await getAllStickers();
  S.bubbleMe = await getConfig('bubbleMe', '#a78bfa');
  S.bubbleThem = await getConfig('bubbleThem', '#f0f0f2');

  // Load API settings into DOM
  var apiS = await getConfig('apiSettings', {});
  var sBase = document.getElementById('s-base');
  if (sBase) sBase.value = apiS.apiBase || '';
  var sKey = document.getElementById('s-key');
  if (sKey) sKey.value = apiS.apiKey || '';
  var sModel = document.getElementById('s-model');
  if (sModel) sModel.value = apiS.apiModel || '';
  var tempSl = document.getElementById('temp-sl');
  if (tempSl) { tempSl.value = apiS.temperature || 1.0; var tv = document.getElementById('temp-val'); if (tv) tv.textContent = tempSl.value; }

  // Render
  await renderHome();
  renderChars();
  await applyWallpaper();
  applyBubs(S.bubbleMe, S.bubbleThem);

  // Clock
  tick(); setInterval(tick, 1000);

  // Setup message long press
  setupMsgLongPress();

  // Setup file upload handlers
  setupStickerUpload();
  setupAvatarUpload();
  setupWallpaperUpload();

  // Render worldbook if on that page
  renderWbList();

  // Home icon long press for edit
  var iw = document.getElementById('icons-grid');
  if (iw) {
    iw.addEventListener('touchstart', function() { if (!S.editMode) lpt = setTimeout(enterEdit, 600); }, { passive: true });
    iw.addEventListener('touchend', function() { clearTimeout(lpt); }, { passive: true });
    iw.addEventListener('touchmove', function() { clearTimeout(lpt); }, { passive: true });
  }

  // Sheet close on backdrop click
  document.querySelectorAll('.sh-ov,.hs-ov').forEach(function(el) {
    el.addEventListener('click', function(e) { if (e.target === el) el.classList.remove('show'); });
  });

  // iOS keyboard fix
  document.addEventListener('focusout', function() {
    setTimeout(function() { window.scrollTo(0, 0); }, 50);
  });

  // Event: temp slider
  var tsl = document.getElementById('temp-sl');
  if (tsl) tsl.addEventListener('input', function() {
    var tv = document.getElementById('temp-val');
    if (tv) tv.textContent = tsl.value;
  });

  // Event: model dropdown
  var mdd = document.getElementById('model-dd');
  if (mdd) mdd.addEventListener('change', function() {
    var sm = document.getElementById('s-model');
    if (sm) sm.value = mdd.value;
  });

  // Event: new char
  var ccBtn = document.getElementById('create-char-btn');
  if (ccBtn) ccBtn.addEventListener('click', createChar);

  // Event: save API
  var saBtn = document.getElementById('save-api-btn');
  if (saBtn) saBtn.addEventListener('click', saveApiSettings);

  // Event: cancel API
  var caBtn = document.getElementById('cancel-api-btn');
  if (caBtn) caBtn.addEventListener('click', function() { closeSh('sh-hset'); });

  // Event: fetch models
  var fmBtn = document.getElementById('fetch-models-btn');
  if (fmBtn) fmBtn.addEventListener('click', doFetchModels);

  // Event: nav back buttons
  document.getElementById('chat-back-btn').addEventListener('click', goHome);
  document.getElementById('cset-back-btn').addEventListener('click', function() { goTo('pg-conv'); });
  document.getElementById('exit-edit-btn').addEventListener('click', exitEdit);
  var wbBack = document.getElementById('wb-back-btn');
  if (wbBack) wbBack.addEventListener('click', goHome);
  var lookBack = document.getElementById('look-back-btn');
  if (lookBack) lookBack.addEventListener('click', goHome);

  // Event: fi-img
  document.getElementById('fi-img').addEventListener('change', function(e) {
    var f = e.target.files[0]; if (!f) return;
    readFileAsDataURL(f).then(function(src) {
      var c = getChar(); if (!c) return;
      c.messages.push({ role: 'user', content: '[图片]', t: Date.now(), id: uid('m'), type: 'image', src: src });
      addBubble(c.messages[c.messages.length - 1], c);
      saveCurrentChar();
    });
    e.target.value = '';
  });

  // Setup sticker upload
  setupStickerUpload();
  setupWallpaperUpload();

  // Render worldbook list
  renderWbList();

  // Event: wb add button
  var wbAddBtn = document.getElementById('wb-add-btn');
  if (wbAddBtn) wbAddBtn.addEventListener('click', function() { openWbEdit(null); });

  // Init emoji panel with face emojis
  loadEmoji('face', document.querySelector('.ecat'));

  // Event: look page - render when navigated to
  var lookApp = APPS.find(function(a) { return a.id === 'look'; });
  if (lookApp) {
    var origAction = lookApp.action;
    lookApp.action = function() { goTo('pg-look'); renderLookPage(); };
  }

  console.log('[MyPocket] v2 初始化完成 — ' + Cache.chars.length + ' 个角色');
}

/* ====== WALLPAPER ====== */
async function applyWallpaper() {
  var id = await getConfig('wallpaperId', 'p0');
  var el = document.getElementById('wp');
  var p = WP_PRESETS.find(function(x) { return x.id === id; });
  if (p) {
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:0;pointer-events:none;background:' + p.g;
  }
}

/* ====== BUBBLE COLORS ====== */
function applyBubs(me, them) {
  var meDark = ['#374151','#1e1e22','#1a1a2e'].indexOf(me) >= 0;
  var themDark = ['#374151','#1e1e22'].indexOf(them) >= 0;
  document.documentElement.style.setProperty('--bme', me);
  document.documentElement.style.setProperty('--bthem', them);
  document.documentElement.style.setProperty('--bme-t', meDark ? '#f0f0f2' : '#1c1c1e');
  document.documentElement.style.setProperty('--bthem-t', themDark ? '#f0f0f2' : '#1c1c1e');
}

/* ====== CHAT LIST ====== */
function renderChars() {
  var list = document.getElementById('char-list');
  var empty = document.getElementById('char-empty');
  if (!Cache.chars.length) { list.innerHTML = ''; empty.style.display = 'flex'; return; }
  empty.style.display = 'none';
  var now = new Date();
  list.innerHTML = Cache.chars.map(function(c) {
    var last = c.messages && c.messages.length ? c.messages[c.messages.length - 1].content.slice(0, 30) : '点击开始对话';
    var t = pad(now.getHours()) + ':' + pad(now.getMinutes());
    return '<div class="char-item" onclick="openConv(\'' + c.id + '\')">' +
      '<div class="cav">' + (c.charAv ? '<img src="'+c.charAv+'">' : '<span>'+(c.emoji||'🧑')+'</span>') + '</div>' +
      '<div class="cinfo"><div class="cnrow"><span class="cname">'+esc(c.nick||c.real)+'</span><span class="ctime">'+t+'</span></div>' +
      '<div class="cprev">'+esc(last)+'</div></div></div>';
  }).join('');
}

/* ====== CREATE CHAR ====== */
async function createChar() {
  var name = document.getElementById('nc-name').value.trim();
  if (!name) { toast('请填写名字'); return; }
  var c = {
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
  openCharSet();
  toast('请先填写角色人设');
}

/* ====== API SETTINGS ====== */
async function saveApiSettings() {
  var s = {
    apiBase: document.getElementById('s-base').value.trim(),
    apiKey: document.getElementById('s-key').value.trim(),
    apiModel: document.getElementById('s-model').value.trim(),
    temperature: parseFloat(document.getElementById('temp-sl').value) || 1.0
  };
  await setConfig('apiSettings', s);
  toast('设置已保存 ✓');
  closeSh('sh-hset');
}

async function doFetchModels() {
  var btn = document.getElementById('fetch-models-btn');
  btn.textContent = '拉取中...'; btn.disabled = true;
  try {
    await saveApiSettings(); // Save current inputs first
    var models = await fetchModels();
    if (!models.length) throw new Error('没有找到模型');
    var dd = document.getElementById('model-dd');
    dd.innerHTML = '<option value="">选择模型</option>' + models.map(function(m) { return '<option value="' + m + '">' + m + '</option>'; }).join('');
    dd.style.display = 'block';
    btn.textContent = '✓ 已拉取';
    toast('共 ' + models.length + ' 个模型');
  } catch (e) {
    btn.textContent = '拉取';
    toast('失败：' + e.message);
  }
  btn.disabled = false;
}

/* ====== BOOT ====== */
init();
