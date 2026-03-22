/* ============================================
   chat.js — 聊天核心（打开聊天、发送消息、AI回复、buildSys）
   ============================================ */

var isGenerating = false;

/* ====== 打开聊天室 ====== */
function openConv(id) {
  S.cid = id;
  var c = getChar(); if (!c) return;
  currentPage = 1;

  // Build header
  var hdr = document.getElementById('conv-header');
  hdr.innerHTML =
    '<div class="conv-hdr">' +
      '<button class="hdr-back" onclick="goTo(\'pg-chat\')">&#8249;</button>' +
      '<div class="conv-av" id="ca" onclick="showHeartPanel()">' +
        (c.charAv ? '<img src="'+c.charAv+'">' : '<span>'+(c.emoji||'🧑')+'</span>') +
      '</div>' +
      '<div style="flex:1;min-width:0"><div class="conv-name" id="cn">'+esc(c.nick||c.real)+'</div>' +
        '<div class="conv-st" id="cs">'+(c.status||'在线')+'</div></div>' +
      '<button class="hdr-back" onclick="openCharSet()" style="font-size:18px">⚙️</button>' +
    '</div>';

  // Build toolbar
  var tb = document.getElementById('chat-toolbar');
  tb.innerHTML =
    '<div class="toolbar">' +
      '<button class="tb-btn" onclick="openSh(\'sh-emoji\')">➕ 表情</button>' +
      '<button class="tb-btn" onclick="handleReroll()">🔄 重roll</button>' +
      '<button class="tb-btn" id="tb-img-btn">🖼 图片</button>' +
      '<button class="tb-btn" onclick="doVoice()">🎙 语音</button>' +
      '<button class="tb-btn" onclick="openSh(\'sh-transfer\')">💸 转账</button>' +
      '<button class="tb-btn" onclick="openSh(\'sh-order\')">🍜 外卖</button>' +
      '<button class="tb-btn" onclick="doVideo()">📹 视频</button>' +
      '<button class="tb-btn" onclick="doLoc()">📍 定位</button>' +
    '</div>';
  document.getElementById('tb-img-btn').onclick = function() { document.getElementById('fi-img').click(); };

  // Build input
  var inp = document.getElementById('chat-input-area');
  inp.innerHTML =
    '<div class="inp-area">' +
      '<textarea id="cinput" placeholder="发消息..." rows="1" oninput="autoR(this)" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();sendMsg()}"></textarea>' +
      '<button class="abtn" id="btn-reply" onclick="charReply()">💬</button>' +
      '<button class="abtn" id="btn-send" onclick="sendMsg()">➤</button>' +
    '</div>';

  // Build heart overlay
  var hov = document.getElementById('heart-ov');
  hov.innerHTML =
    '<div class="heart-panel">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-shrink:0">' +
        '<span style="font-size:16px;font-weight:600;color:var(--text)">💭 角色心声</span>' +
        '<div style="display:flex;gap:8px;align-items:center">' +
          '<button onclick="genHeart()" style="background:none;border:none;color:var(--purple);font-size:12px;cursor:pointer;font-family:inherit">🔄 刷新</button>' +
          '<button onclick="closeHeartPanel()" style="background:#f0f0f2;border:none;width:28px;height:28px;border-radius:50%;font-size:14px;cursor:pointer;color:var(--text2)">✕</button>' +
        '</div>' +
      '</div>' +
      '<div class="heart-scroll">' +
        '<div id="heart-now" style="background:#f9fafb;border-radius:12px;padding:14px;margin-bottom:12px;min-height:60px">' +
          '<div id="hv-body" style="font-size:14px;color:var(--text2);line-height:1.8;white-space:pre-wrap">点击 🔄 感应心声...</div>' +
        '</div>' +
        '<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px">历史心声</div>' +
        '<div id="heart-hist"></div>' +
      '</div>' +
    '</div>';

  // Render messages
  renderMsgs(false, true);
  goTo('pg-conv');
}

/* ====== 发送消息 ====== */
async function sendMsg() {
  var inp = document.getElementById('cinput');
  var text = inp.value.trim(); if (!text) return;
  var c = getChar(); if (!c) return;
  inp.value = ''; autoR(inp);
  if (!c.messages) c.messages = [];

  var msg = { role: 'user', content: text, t: Date.now(), id: uid('m') };
  c.messages.push(msg);
  addBubble(msg, c);
  await saveCurrentChar();
  renderChars();
}

/* ====== AI 回复 ====== */
async function charReply() {
  var c = getChar(); if (!c) return;
  if (isGenerating) return;
  var apiS = await getConfig('apiSettings', {});
  if (!apiS.apiBase || !apiS.apiKey) { toast('请先配置API'); return; }

  isGenerating = true;
  var rb = document.getElementById('btn-reply');
  var sb = document.getElementById('btn-send');
  if (rb) rb.disabled = true;
  if (sb) sb.disabled = true;
  showTyping();
  setStatus('正在输入...');

  try {
    var sys = buildSys(c);
    var histSlice = (c.messages || []).slice(-(c.ctx || 20));
    var msgs = histSlice.length === 0
      ? [{ role: 'user', content: '（你们刚建立了联系，用最符合你性格的方式打个招呼）' }]
      : histSlice.map(function(m) { return { role: m.role, content: m.content }; });

    await sleep(400 + Math.random() * 1200);
    var reply = await callAPI(sys, msgs, 4096);
    hideTyping();
    setStatus(c.status || '在线');

    // Split into separate messages (like reference project)
    var parts = reply.split(/\n{2,}/).map(function(p) { return p.trim(); }).filter(function(p) { return p.length > 0; });
    if (parts.length === 0) parts = [reply];

    var baseT = Date.now();
    for (var i = 0; i < parts.length; i++) {
      var msg = { role: 'assistant', content: parts[i], t: baseT + i, id: uid('m') };
      c.messages.push(msg);
      if (i > 0) await sleep(300 + Math.random() * 400);
      addBubble(msg, c);
    }

    // Auto-summary check
    if (c.memOn && c.autoSum && c.messages.length % (c.sumCt || 50) === 0) {
      doAutoSum(c);
    }

    await saveCurrentChar();
    renderChars();
  } catch (e) {
    hideTyping();
    setStatus(c.status || '在线');
    toast('失败：' + e.message);
  }

  isGenerating = false;
  if (rb) rb.disabled = false;
  if (sb) sb.disabled = false;
}

/* ====== 重Roll ====== */
async function handleReroll() {
  var c = getChar(); if (!c || !c.messages || !c.messages.length) return;
  while (c.messages.length && c.messages[c.messages.length - 1].role === 'assistant') c.messages.pop();
  await saveCurrentChar();
  currentPage = 1;
  renderMsgs(false, true);
  await charReply();
}

/* ====== buildSys ====== */
function buildSys(c) {
  var now = new Date();
  var hours = now.getHours();
  var tl = hours<6?'凌晨':hours<9?'早上':hours<12?'上午':hours<14?'中午':hours<18?'下午':hours<21?'晚上':'深夜';
  var days = ['日','一','二','三','四','五','六'];
  var tStr = now.getFullYear()+'年'+(now.getMonth()+1)+'月'+now.getDate()+'日 周'+days[now.getDay()]+' '+tl+hours+':'+pad(now.getMinutes());

  // World books
  var wb = Cache.worldbooks.filter(function(w) {
    return w.isGlobal || (c.wbIds || []).indexOf(w.id) >= 0;
  }).map(function(w) { return w.content; }).filter(Boolean).join('\n\n');

  var sumStr = c.summaries && c.summaries.length ? '\n\n【过往记忆】\n' + c.summaries.slice(-3).join('\n') : '';

  // Char profile
  var cp = '姓名：' + c.real;
  if (c.cGender) cp += '，性别：' + c.cGender;
  if (c.cAge) cp += '，年龄：' + c.cAge + '岁';
  if (c.cJob) cp += '，职业：' + c.cJob;
  if (c.cFrom) cp += '，籍贯：' + c.cFrom;
  if (c.cLive) cp += '，现居：' + c.cLive;
  cp += '\n';
  if (c.charDesc) cp += c.charDesc + '\n';

  // User profile
  var up = '';
  if (c.uName) up += '名字：' + c.uName;
  if (c.uGender) up += (up ? '，' : '') + '性别：' + c.uGender;
  if (c.uAge) up += (up ? '，' : '') + '年龄：' + c.uAge + '岁';
  if (c.uJob) up += (up ? '，' : '') + '职业：' + c.uJob;
  if (up) up += '\n';
  if (c.userDesc) up += c.userDesc + '\n';

  var sys = '';
  sys += '【角色信息】\n' + cp + '\n';
  if (c.charNick) sys += c.real + '对对方的称呼：' + c.charNick + '\n';
  if (c.rel) sys += '两人关系：' + c.rel + '\n';
  sys += '\n';
  if (up) sys += '【对方信息】\n' + up + '\n';
  if (c.history) sys += '【两人经历】\n' + c.history + '\n\n';
  if (wb) sys += '【世界观】\n' + wb + '\n\n';

  sys += '【当前时间】' + tStr + '\n';
  sys += '（请根据时间自然地调整状态和语气）\n\n';
  sys += sumStr;

  sys += '\n---\n你就是' + c.real + '。现在你们在用微信聊天。\n\n';
  sys += '【回复要求】\n';
  sys += '1. 严格按照角色的性格和说话风格回复\n';
  sys += '2. 把要说的话分成几条消息（用空行隔开），像真人发微信\n';
  sys += '3. 线下动作用括号描述，如：（揉眼睛）刚醒...\n';
  sys += '4. 说话自然有感情\n';
  sys += '5. 根据当前时间调整状态\n\n';
  sys += '【严禁】\n';
  sys += '- 禁止【好感度】【状态栏】【心声】等标题格式\n';
  sys += '- 禁止*星号动作*、OOC、旁白\n';
  sys += '- 只输出聊天消息（可含括号动作）\n';

  return sys;
}

/* ====== Helpers ====== */
function showTyping() { var t = document.getElementById('typing'); if (t) t.classList.add('show'); scrollMsgs(); }
function hideTyping() { var t = document.getElementById('typing'); if (t) t.classList.remove('show'); }
function scrollMsgs() { var el = document.getElementById('msgs'); if (el) el.scrollTop = el.scrollHeight; }
function setStatus(s) { var el = document.getElementById('cs'); if (el) el.textContent = s; }
function autoR(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 100) + 'px'; }

/* ====== Heart ====== */
function showHeartPanel() {
  document.getElementById('heart-ov').classList.add('show');
  renderHeartHist();
  genHeart();
}
function closeHeartPanel() { document.getElementById('heart-ov').classList.remove('show'); }

async function genHeart() {
  var c = getChar(); if (!c) return;
  var el = document.getElementById('hv-body');
  if (el) el.textContent = '正在感应...';
  try {
    var recent = (c.messages || []).slice(-8).map(function(m) {
      return (m.role === 'user' ? (c.uName || '对方') : c.real) + '：' + m.content;
    }).join('\n') || '（无对话）';

    var ctx = '你是"' + c.real + '"。';
    if (c.cGender) ctx += c.real + '是' + c.cGender + '性。';
    if (c.charDesc) ctx += '角色设定：' + c.charDesc.slice(0, 600) + '\n\n';
    ctx += '对方信息：';
    if (c.uName) ctx += '名字叫' + c.uName + '，';
    if (c.uGender) ctx += '性别' + c.uGender + '，';
    if (c.rel) ctx += '你们的关系是' + c.rel + '，';
    if (c.charNick) ctx += '你叫对方' + c.charNick + '，';
    ctx += '\n\n';

    var heartSys = ctx + '根据最近对话，以' + c.real + '的视角输出以下五个部分，每个部分之间空一行：\n\n【当前状态栏】时间/地点/场景氛围\n\n【好感度】对' + (c.uName || '对方') + '的当前好感/情绪指数\n\n【当前服装】描述此刻穿着打扮\n\n【当前心声】第一人称内心想法\n\n【当前小心思】没说出口的想法\n\n风格要求：符合角色人设，内容细腻。注意用正确的性别称呼对方。';

    var heart = await callAPI(heartSys, [{ role: 'user', content: '最近对话：\n' + recent + '\n\n请按格式输出。' }], 4096);
    if (el) el.textContent = heart;
    if (!c.hearts) c.hearts = [];
    c.hearts.push({ time: new Date().toLocaleString(), text: heart });
    if (c.hearts.length > 50) c.hearts.shift();
    await saveCurrentChar();
    renderHeartHist();
  } catch (e) {
    if (el) el.textContent = '感应失败：' + e.message;
  }
}

function renderHeartHist() {
  var c = getChar(); if (!c) return;
  var el = document.getElementById('heart-hist'); if (!el) return;
  var h = (c.hearts || []).slice().reverse();
  el.innerHTML = h.length ? h.map(function(x, i) {
    var realIdx = h.length - 1 - i;
    return '<div style="background:#f9fafb;border-radius:10px;padding:10px 12px;margin-bottom:8px;position:relative">' +
      '<button onclick="delHeartItem(' + realIdx + ')" style="position:absolute;top:6px;right:8px;background:none;border:none;color:var(--text3);font-size:16px;cursor:pointer">×</button>' +
      '<div style="font-size:11px;color:var(--text3);margin-bottom:4px">' + esc(x.time) + '</div>' +
      '<div style="font-size:13px;color:var(--text2);line-height:1.7;white-space:pre-wrap">' + esc(x.text) + '</div></div>';
  }).join('') : '<div style="text-align:center;color:var(--text3);font-size:13px;padding:20px">还没有心声记录</div>';
}

async function delHeartItem(idx) {
  var c = getChar(); if (!c || !c.hearts) return;
  c.hearts.splice(idx, 1);
  await saveCurrentChar();
  renderHeartHist();
  toast('已删除');
}

/* ====== Auto Summary ====== */
async function doAutoSum(c) {
  try {
    var recent = c.messages.slice(-(c.sumCt || 50)).map(function(m) {
      return (m.role === 'user' ? '用户' : c.real) + '：' + m.content;
    }).join('\n');
    var sum = await callAPI('你是总结助手，中文简洁输出。', [{ role: 'user', content: (c.sumPrompt || '请简洁总结对话中的重要信息：') + '\n\n' + recent }], 400);
    if (!c.summaries) c.summaries = [];
    c.summaries.push('[' + new Date().toLocaleDateString() + '] ' + sum);
    await saveCurrentChar();
  } catch (e) { console.error('Auto summary failed:', e); }
}

/* Quick tools are in chat_tools.js */
