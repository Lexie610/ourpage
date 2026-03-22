/* ============================================
   chat_tools.js — 聊天工具栏功能
   表情包、转账、外卖、语音、文字图等
   ============================================ */

/* ====== EMOJI & STICKER ====== */
var EMOJIS = {
  face:['😂','🤣','😭','😅','🥹','😍','🥰','😘','🤩','😎','🥸','😤','😡','🤬','😱','😨','🥶','🤯','😴','🤤','🥴','😵','🤪','🤗','🫠','🫡','🫣','🤭','😏','😒'],
  heart:['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','❤️‍🔥','💖','💗','💓','💞','💝','💟','♥️','💘','💕','🫀'],
  act:['👍','👎','👏','🙌','🤝','🫶','✊','👊','✌️','🤞','🫰','🤟','🤘','👌','🤌','👆','👇','👈','👉','🙏','💪','🧠','👀','🫦','🫂'],
  obj:['🌸','🌺','🌻','🌹','🌷','🍀','🌿','🍃','🌙','⭐','✨','💫','🌈','☀️','❄️','🔥','💧','🎵','🎶','🎉','🎊','🎁','💌','📱','💻','🎮','🍕','🍜','🧋','☕']
};

function loadEmoji(cat, btn) {
  document.querySelectorAll('.ecat').forEach(function(b) { b.classList.remove('on'); });
  if (btn) btn.classList.add('on');
  var grid = document.getElementById('emoji-grid');

  if (cat === 'sticker') {
    // Sticker grid
    grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;max-height:36vh;overflow-y:auto;padding:4px';
    var html = '<div style="width:calc(33.33% - 6px);height:0;padding-bottom:calc(33.33% - 6px);border-radius:10px;background:#f0f0f2;border:2px dashed var(--border);cursor:pointer;position:relative;display:flex;align-items:center;justify-content:center" onclick="document.getElementById(\'fi-sticker\').click()"><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:24px;color:var(--text3)">＋</div></div>';
    Cache.stickers.forEach(function(s) {
      var url = s.url || '';
      var name = s.name || '';
      html += '<div style="width:calc(33.33% - 6px);height:0;padding-bottom:calc(33.33% - 6px);border-radius:10px;background:#f0f0f2;overflow:hidden;cursor:pointer;border:1px solid var(--border);position:relative" onclick="sendSticker(\'' + encodeURIComponent(url) + '\',\'' + encodeURIComponent(name) + '\')">' +
        '<img src="' + url + '" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block">' +
        (name ? '<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.55);color:#fff;font-size:10px;text-align:center;padding:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(name) + '</div>' : '') +
        '</div>';
    });
    grid.innerHTML = html;
    return;
  }

  if (cat === 'import') {
    // Bulk import
    grid.style.cssText = '';
    grid.innerHTML =
      '<div style="font-size:13px;color:var(--text2);margin-bottom:6px">每行格式：<b>名字:URL</b> 或直接粘贴URL</div>' +
      '<textarea id="bulk-inp" style="width:100%;height:120px;border:1px solid var(--border);border-radius:10px;padding:10px;font-size:13px;resize:none;outline:none;background:#f0f0f2;color:var(--text)" placeholder="委屈巴巴:https://example.com/1.gif\nhttps://example.com/2.png"></textarea>' +
      '<button class="btn-p" onclick="doBulkImport()" style="margin-top:10px">一键导入</button>' +
      '<div id="bulk-res" style="margin-top:8px;font-size:13px;color:var(--purple);text-align:center"></div>';
    return;
  }

  // Regular emoji grid
  var emojis = EMOJIS[cat] || [];
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(8,1fr);gap:4px';
  grid.innerHTML = emojis.map(function(e) {
    return '<div style="width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;border-radius:8px" onclick="sendEmoji(\'' + e + '\')">' + e + '</div>';
  }).join('');
}

function sendEmoji(e) {
  var c = getChar(); if (!c) return;
  var msg = { role: 'user', content: e, t: Date.now(), id: uid('m') };
  c.messages.push(msg);
  addBubble(msg, c);
  saveCurrentChar();
  closeSh('sh-emoji');
}

async function sendSticker(encodedUrl, encodedName) {
  var url = decodeURIComponent(encodedUrl);
  var name = decodeURIComponent(encodedName);
  var c = getChar(); if (!c) return;
  var desc = name ? '[表情包：' + name + ']' : '[表情包]';
  var isUrl = url.startsWith('http');
  var msg = { role: 'user', content: desc, t: Date.now(), id: uid('m'), type: 'sticker', src: isUrl ? url : '' };
  c.messages.push(msg);
  addBubble(msg, c);
  await saveCurrentChar();
  closeSh('sh-emoji');
}

async function doBulkImport() {
  var inp = document.getElementById('bulk-inp'); if (!inp) return;
  var lines = inp.value.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
  if (!lines.length) { document.getElementById('bulk-res').textContent = '没有有效内容'; return; }
  var count = 0;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i], name = '', url = '';
    if (line.indexOf(':http') > 0) { var idx = line.indexOf(':http'); name = line.slice(0, idx).trim(); url = line.slice(idx + 1).trim(); }
    else if (line.indexOf('：http') > 0) { var idx2 = line.indexOf('：http'); name = line.slice(0, idx2).trim(); url = line.slice(idx2 + 1).trim(); }
    else if (line.startsWith('http')) { url = line; }
    if (!url) continue;
    var exists = Cache.stickers.some(function(s) { return s.url === url; });
    if (!exists) {
      var entry = { url: url, name: name };
      var id = await addSticker(entry);
      entry.id = id;
      Cache.stickers.push(entry);
      count++;
    }
  }
  document.getElementById('bulk-res').textContent = count > 0 ? '✓ 已导入 ' + count + ' 个表情包' : '没有新的表情包';
  inp.value = '';
}

// Handle sticker file upload
function setupStickerUpload() {
  document.getElementById('fi-sticker').addEventListener('change', async function(e) {
    var files = Array.from(e.target.files);
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      var dataUrl = await readFileAsDataURL(f);
      var entry = { url: dataUrl, name: f.name.replace(/\.[^.]+$/, '') };
      var id = await addSticker(entry);
      entry.id = id;
      Cache.stickers.push(entry);
    }
    loadEmoji('sticker', null);
    toast('已添加 ' + files.length + ' 个表情');
    e.target.value = '';
  });
}

/* ====== TRANSFER ====== */
async function sendTransfer() {
  var amt = document.getElementById('tf-amt').value;
  var note = document.getElementById('tf-note').value.trim();
  if (!amt) { toast('请输入金额'); return; }
  var c = getChar(); if (!c) return;
  var msg = { role: 'user', content: '[转账¥' + amt + ']', t: Date.now(), id: uid('m'), type: 'transfer', note: note || '转账', extra: { amt: amt } };
  c.messages.push(msg);
  addBubble(msg, c);
  await saveCurrentChar();
  closeSh('sh-transfer');
  document.getElementById('tf-amt').value = '';
  document.getElementById('tf-note').value = '';
}

/* ====== ORDER ====== */
async function sendOrder(pay) {
  var items = document.getElementById('od-items').value.trim();
  var price = document.getElementById('od-price').value;
  if (!items) { toast('请填写内容'); return; }
  var c = getChar(); if (!c) return;
  var msg = { role: 'user', content: '[外卖：' + items + '¥' + (price || '?') + (pay ? ' 代付' : '') + ']', t: Date.now(), id: uid('m'), type: 'order', extra: { price: price || '?', pay: pay } };
  c.messages.push(msg);
  addBubble(msg, c);
  await saveCurrentChar();
  closeSh('sh-order');
  document.getElementById('od-items').value = '';
  document.getElementById('od-price').value = '';
}
