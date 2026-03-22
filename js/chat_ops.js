/* ============================================
   chat_ops.js — 消息操作（长按菜单、编辑、撤回、多选、引用）
   借鉴参考项目的 chat_ops.js
   ============================================ */

var msgLongPressTimer = null;
var msgTouchMoved = false;

/* ====== 长按事件注册 ====== */
function setupMsgLongPress() {
  var msgs = document.getElementById('msgs');
  if (!msgs) return;
  msgs.addEventListener('touchstart', function(e) {
    if (S.multiMode) return;
    var row = e.target.closest('.mrow[data-idx]');
    if (!row) return;
    msgTouchMoved = false;
    msgLongPressTimer = setTimeout(function() {
      if (msgTouchMoved) return;
      e.preventDefault();
      if (navigator.vibrate) navigator.vibrate(30);
      showMsgMenu(row, e.touches[0].clientX, e.touches[0].clientY);
    }, 600);
  }, { passive: false });
  msgs.addEventListener('touchend', function() { clearTimeout(msgLongPressTimer); }, { passive: true });
  msgs.addEventListener('touchmove', function() { msgTouchMoved = true; clearTimeout(msgLongPressTimer); }, { passive: true });
  // Close menu on outside tap
  document.addEventListener('touchstart', function(e) {
    var m = document.getElementById('msg-menu');
    if (m && m.classList.contains('show') && !m.contains(e.target)) m.classList.remove('show');
  });
}

/* ====== 显示菜单 ====== */
function showMsgMenu(row, x, y) {
  var idx = parseInt(row.dataset.idx);
  var c = getChar(); if (!c) return;
  var m = c.messages[idx]; if (!m) return;
  var menu = document.getElementById('msg-menu');

  var isText = !m.type || m.type === 'text';
  var isRecalled = m.recalled || m.isWithdrawn;

  var html = '<div style="display:flex;flex-wrap:wrap;gap:4px;padding:8px;justify-content:center">';

  if (!isRecalled) {
    if (isText) html += '<div class="msg-menu-item" onclick="editMsg(' + idx + ')">✏️<br>编辑</div>';
    html += '<div class="msg-menu-item" onclick="copyMsg(' + idx + ')">📋<br>复制</div>';
    html += '<div class="msg-menu-item" onclick="quoteMsg(' + idx + ')">💬<br>引用</div>';
    html += '<div class="msg-menu-item" onclick="withdrawMsg(' + idx + ')">↩️<br>撤回</div>';
  }
  html += '<div class="msg-menu-item danger" onclick="delMsg(' + idx + ')">🗑<br>删除</div>';
  html += '<div class="msg-menu-item" onclick="enterMulti(' + idx + ')">☑️<br>多选</div>';
  html += '<div class="msg-menu-item" onclick="closeMsgMenu()">✕<br>取消</div>';
  html += '</div>';

  menu.innerHTML = html;
  // Position near the touch point
  var convRect = document.getElementById('pg-conv').getBoundingClientRect();
  var top = y - convRect.top - 60;
  if (top < 10) top = y - convRect.top + 10;
  if (top > convRect.height - 200) top = convRect.height - 200;
  menu.style.top = top + 'px';
  menu.style.left = '50%';
  menu.style.transform = 'translateX(-50%)';
  menu.classList.add('show');
}

function closeMsgMenu() { document.getElementById('msg-menu').classList.remove('show'); }

/* ====== 编辑消息 ====== */
async function editMsg(idx) {
  closeMsgMenu();
  var c = getChar(); if (!c) return;
  var m = c.messages[idx]; if (!m) return;
  var txt = prompt('编辑消息：', m.content);
  if (txt === null) return;
  m.content = txt;
  await saveCurrentChar();
  currentPage = 1; renderMsgs(false, true);
  toast('已编辑');
}

/* ====== 复制 ====== */
function copyMsg(idx) {
  closeMsgMenu();
  var c = getChar(); if (!c) return;
  var m = c.messages[idx]; if (!m) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(m.content).then(function() { toast('已复制'); });
  } else {
    var ta = document.createElement('textarea');
    ta.value = m.content; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    toast('已复制');
  }
}

/* ====== 引用 ====== */
function quoteMsg(idx) {
  closeMsgMenu();
  var c = getChar(); if (!c) return;
  var m = c.messages[idx]; if (!m) return;
  var inp = document.getElementById('cinput');
  var name = m.role === 'user' ? '我' : (c.nick || c.real);
  inp.value = '「' + name + '：' + m.content.slice(0, 40) + (m.content.length > 40 ? '...' : '') + '」\n' + inp.value;
  inp.focus(); autoR(inp);
}

/* ====== 撤回 (双方都可以) ====== */
async function withdrawMsg(idx) {
  closeMsgMenu();
  var c = getChar(); if (!c) return;
  var m = c.messages[idx]; if (!m) return;
  var who = m.role === 'user' ? '你' : (c.nick || c.real);
  m.recalled = true;
  m.originalContent = m.content;
  m.content = '[' + who + '撤回了一条消息]';
  await saveCurrentChar();
  currentPage = 1; renderMsgs(false, true);
  toast(who + '撤回了一条消息');
}

/* ====== 删除 ====== */
async function delMsg(idx) {
  closeMsgMenu();
  var c = getChar(); if (!c) return;
  if (!confirm('删除这条消息？')) return;
  c.messages.splice(idx, 1);
  await saveCurrentChar();
  currentPage = 1; renderMsgs(false, true);
  toast('已删除');
}

/* ====== 多选模式 ====== */
function enterMulti(idx) {
  closeMsgMenu();
  S.multiMode = true;
  S.multiSel = [idx];
  document.getElementById('multi-bar').classList.add('show');
  document.getElementById('multi-bar').innerHTML =
    '<button style="background:#fee2e2;color:#ef4444" onclick="multiDel()">删除选中</button>' +
    '<button style="background:#f0f0f2;color:var(--text)" onclick="exitMulti()">取消</button>';
  renderMsgs(false, true);
  // Add click handlers to rows
  setTimeout(function() {
    document.querySelectorAll('#msgs .mrow[data-idx]').forEach(function(r) {
      r.style.paddingLeft = '28px';
      var i = parseInt(r.dataset.idx);
      if (S.multiSel.indexOf(i) >= 0) r.classList.add('selected');
      r.onclick = function() {
        var pos = S.multiSel.indexOf(i);
        if (pos >= 0) { S.multiSel.splice(pos, 1); r.classList.remove('selected'); }
        else { S.multiSel.push(i); r.classList.add('selected'); }
      };
    });
  }, 100);
}

function exitMulti() {
  S.multiMode = false;
  S.multiSel = [];
  document.getElementById('multi-bar').classList.remove('show');
  currentPage = 1; renderMsgs(false, true);
}

async function multiDel() {
  var c = getChar(); if (!c) return;
  if (!S.multiSel.length) { toast('请先选择消息'); return; }
  if (!confirm('删除 ' + S.multiSel.length + ' 条消息？')) return;
  S.multiSel.sort(function(a, b) { return b - a; });
  S.multiSel.forEach(function(i) { c.messages.splice(i, 1); });
  await saveCurrentChar();
  exitMulti();
  toast('已删除');
}
