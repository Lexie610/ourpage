/* ============================================
   chat_render.js — 消息渲染
   借鉴参考项目：时间分隔线、连续消息合并、分页加载
   ============================================ */

var currentPage = 1;
var MSGS_PER_PAGE = 30;

/* ====== 渲染消息列表 ====== */
function renderMsgs(isLoadMore, scrollToBottom) {
  var c = getChar(); if (!c || !c.messages) return;
  var el = document.getElementById('msgs');
  var oldH = el.scrollHeight;
  var total = c.messages.length;
  var end = total - (currentPage - 1) * MSGS_PER_PAGE;
  var start = Math.max(0, end - MSGS_PER_PAGE);
  var slice = c.messages.slice(start, end);

  if (!isLoadMore) {
    // Keep only typing indicator
    var ty = document.getElementById('typing');
    el.innerHTML = '';
    el.appendChild(ty);
  }

  var frag = document.createDocumentFragment();
  var lastTime = start > 0 ? (c.messages[start - 1].t || 0) : 0;

  slice.forEach(function(m, i) {
    var globalIdx = start + i;
    var mt = m.t || 0;

    // Time divider (>10 min gap)
    if (mt - lastTime > 600000 || lastTime === 0) {
      var td = document.createElement('div');
      td.className = 'mrow system';
      td.innerHTML = '<div class="time-divider">' + formatMsgTime(mt) + '</div>';
      frag.appendChild(td);
    }
    lastTime = mt;

    // Check if continuous (same sender, <10min gap)
    var continuous = false;
    if (globalIdx > 0) {
      var prev = c.messages[globalIdx - 1];
      if (prev.role === m.role && mt - (prev.t || 0) < 600000 && !m.recalled && !prev.recalled) {
        continuous = true;
      }
    }

    var bubble = createBubble(m, globalIdx, c, continuous);
    if (bubble) frag.appendChild(bubble);
  });

  // Load more button
  var oldBtn = document.getElementById('load-more-btn');
  if (oldBtn) oldBtn.remove();

  if (start > 0) {
    var btn = document.createElement('button');
    btn.id = 'load-more-btn';
    btn.textContent = '加载更早的消息';
    btn.className = 'tb-btn';
    btn.style.cssText = 'width:100%;margin:10px 0;padding:10px';
    btn.onclick = function() { currentPage++; renderMsgs(true, false); };
    el.insertBefore(btn, el.firstChild);
  }

  var ty = document.getElementById('typing');
  el.insertBefore(frag, ty);

  if (scrollToBottom !== false && !isLoadMore) {
    setTimeout(function() { el.scrollTop = el.scrollHeight; }, 50);
  } else if (isLoadMore) {
    el.style.scrollBehavior = 'auto';
    el.scrollTop = el.scrollHeight - oldH;
    setTimeout(function() { el.style.scrollBehavior = ''; }, 50);
  }
}

/* ====== 创建单条消息 DOM ====== */
function createBubble(m, idx, c, continuous) {
  var side = m.role === 'user' ? 'me' : 'them';
  var ct = m.content || '';
  var tp = detectMsgType(m);

  // Recalled / withdrawn messages
  if (m.recalled || m.isWithdrawn) {
    var who = m.role === 'user' ? '你' : (c.nick || c.real);
    var row = document.createElement('div');
    row.className = 'mrow system';
    row.dataset.idx = idx;
    row.innerHTML = '<div class="bubble recall">' + esc(who + '撤回了一条消息') + '</div>';
    return row;
  }

  // Parse content based on type
  var display = parseMsgContent(m, tp, c);

  var row = document.createElement('div');
  row.className = 'mrow ' + side + (continuous ? ' continuous' : '');
  row.dataset.idx = idx;

  // Build avatar + bubble row
  var brow = document.createElement('div');
  brow.className = 'bubble-row';

  // Avatar (hide for continuous)
  var av = document.createElement('div');
  av.className = 'msg-avatar' + (continuous ? ' hidden' : '');
  var avSrc = side === 'them' ? c.charAv : c.userAv;
  var avEmoji = side === 'them' ? (c.emoji || '🧑') : '🙋';
  av.innerHTML = avSrc ? '<img src="' + avSrc + '">' : '<span>' + avEmoji + '</span>';
  brow.appendChild(av);

  // Bubble
  var bub = document.createElement('div');
  bub.className = 'bubble' + (display.cls ? ' ' + display.cls : '');
  if (display.style) bub.style.cssText = display.style;

  // Quote bar
  if (m.quote) {
    var qb = document.createElement('div');
    qb.className = 'quote-bar';
    var qName = m.quote.senderId === 'user' ? (c.uName || '我') : (c.nick || c.real);
    qb.innerHTML = '<div class="quote-name">' + esc(qName) + '</div>' + esc((m.quote.content || '').slice(0, 60));
    bub.appendChild(qb);
  }

  bub.innerHTML += display.html;
  brow.appendChild(bub);
  row.appendChild(brow);

  // Time
  if (!continuous) {
    var time = document.createElement('div');
    time.className = 'mtime';
    time.textContent = formatShortTime(m.t) + (side === 'me' ? ' · 已发送' : '');
    row.appendChild(time);
  }

  return row;
}

/* ====== 检测消息类型 ====== */
function detectMsgType(m) {
  if (m.type && m.type !== 'text') return m.type;
  var ct = m.content || '';
  if (m.recalled || m.isWithdrawn) return 'recall';
  if (/^\[转账¥/.test(ct)) return 'transfer';
  if (/^\[表情包/.test(ct)) return 'sticker';
  if (/^\[外卖：/.test(ct)) return 'order';
  if (/^\[语音：/.test(ct)) return 'voice';
  if (ct === '[图片]') return 'image';
  if (ct === '[视频通话]') return 'video';
  if (/^\[位置：/.test(ct)) return 'location';
  if (/^\[文字图：/.test(ct)) return 'textimg';
  if (/撤回了一条消息/.test(ct)) return 'recall';
  return 'text';
}

/* ====== 解析消息内容为 HTML ====== */
function parseMsgContent(m, tp, c) {
  var ct = m.content || '';
  var match;
  switch (tp) {
    case 'transfer':
      match = ct.match(/^\[转账¥(.+)\]$/);
      return { cls: 'transfer', html: '💰 <div><div style="font-weight:600;font-size:13px">¥' + esc(match ? match[1] : '?') + '</div><div style="font-size:11px;opacity:.8">' + esc(m.note || '转账') + '</div></div>' };
    case 'sticker':
      var src = m.src || '';
      if (!src) {
        match = ct.match(/^\[表情包(?:：(.+))?\]$/);
        // Try to find sticker by name in cache
        if (match && match[1]) {
          var found = Cache.stickers.find(function(s) { return s.name === match[1]; });
          if (found) src = found.url;
        }
      }
      return src ? { cls: 'sticker', html: '<img src="' + src + '">' } : { html: esc(ct) };
    case 'voice':
      match = ct.match(/^\[语音：(.+)\]$/) || [null, ct];
      return { cls: 'voice', html: '🎙 <span style="font-size:13px">「' + esc(match[1] || ct) + '」</span><span style="font-size:11px;opacity:.7">' + (m.dur || '0:03') + '</span>' };
    case 'order':
      match = ct.match(/^\[外卖：(.+?)¥(.+?)( 代付)?\]$/);
      return { cls: 'order', html: '<div style="font-weight:600;font-size:13px">🍜 外卖订单</div><div style="font-size:13px">' + esc(match ? match[1] : ct) + '</div><div style="font-size:12px;color:#dc2626">¥' + esc(match ? match[2] : '?') + '</div>' + (match && match[3] ? '<div style="font-size:11px;border-top:1px solid #fbbf24;padding-top:4px">💸 申请代付</div>' : '') };
    case 'image':
      return m.src ? { cls: 'image', html: '<img src="' + m.src + '">' } : { html: '📷 图片' };
    case 'video':
      return { cls: 'video', html: '📹 <div><div style="font-size:13px;font-weight:500">视频通话</div><div style="font-size:11px;opacity:.7">已结束</div></div>' };
    case 'location':
      match = ct.match(/^\[位置：(.+)\]$/) || [null, ct];
      return { cls: 'location', html: '📍 ' + esc(match[1] || ct) };
    case 'textimg':
      match = ct.match(/^\[文字图：(.+)\]$/) || [null, ct];
      var style = m.style || 'note';
      var bgs = { note: '#fef3c7', dark: '#1a1a2e', pink: '#fce7f3', minimal: '#f9fafb' };
      var tcs = { note: '#78350f', dark: '#e2e8f0', pink: '#831843', minimal: '#111827' };
      return { style: 'padding:0!important;background:transparent!important', html: '<div style="background:' + (bgs[style] || bgs.note) + ';color:' + (tcs[style] || tcs.note) + ';padding:16px;border-radius:18px;font-size:13px;line-height:1.7;text-align:center;min-width:140px">' + esc(match[1] || ct) + '</div>' };
    default:
      return { html: esc(ct) };
  }
}

/* ====== 动态添加单条消息 ====== */
function addBubble(m, c) {
  if (!c) c = getChar();
  if (!c) return;
  var idx = c.messages.length - 1;
  var el = document.getElementById('msgs');
  var ty = document.getElementById('typing');

  // Check continuous
  var continuous = false;
  if (idx > 0) {
    var prev = c.messages[idx - 1];
    if (prev.role === m.role && (m.t || 0) - (prev.t || 0) < 600000 && !m.recalled && !prev.recalled) {
      continuous = true;
    }
  }

  var bubble = createBubble(m, idx, c, continuous);
  if (bubble) el.insertBefore(bubble, ty);
  el.scrollTop = el.scrollHeight;
}

/* ====== 时间格式化 ====== */
function formatMsgTime(ts) {
  if (!ts) return '';
  var d = new Date(ts);
  var now = new Date();
  var t = pad(d.getHours()) + ':' + pad(d.getMinutes());
  if (d.toDateString() === now.toDateString()) return t;
  var diff = Math.floor((now - d) / 86400000);
  if (diff === 1) return '昨天 ' + t;
  if (diff < 7) return ['日','一','二','三','四','五','六'][d.getDay()] + ' ' + t;
  return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + t;
}

function formatShortTime(ts) {
  if (!ts) return '';
  var d = new Date(ts);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}
