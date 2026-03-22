/* ============================================
   worldbook.js — 世界书管理
   ============================================ */

function renderWbList() {
  var list = document.getElementById('wb-list');
  var empty = document.getElementById('wb-empty');
  if (!Cache.worldbooks.length) { list.innerHTML = ''; empty.style.display = 'flex'; return; }
  empty.style.display = 'none';
  list.innerHTML = Cache.worldbooks.map(function(w) {
    return '<div style="display:flex;align-items:center;padding:13px 16px;border-bottom:1px solid var(--border);background:var(--surface);cursor:pointer" onclick="openWbEdit(\'' + w.id + '\')">' +
      '<div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:500;color:var(--text)">' + esc(w.name) + (w.isGlobal ? ' 🌐' : '') + '</div>' +
      '<div style="font-size:12px;color:var(--text3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc((w.content || '').slice(0, 60)) + '</div></div>' +
      '<span style="color:var(--text3);font-size:18px">›</span></div>';
  }).join('');
}

function openWbEdit(id) {
  var wb = id ? Cache.worldbooks.find(function(w) { return w.id === id; }) : null;
  var isNew = !wb;
  if (isNew) wb = { id: uid('wb'), name: '', content: '', isGlobal: false };

  // Create edit page content dynamically
  var pg = document.getElementById('pg-wb');
  // We need a separate edit page - let's use a sheet instead
  var body = document.createElement('div');
  body.innerHTML =
    '<div class="sg" style="margin:16px"><div class="sgt">' + (isNew ? '新建' : '编辑') + '世界书</div>' +
    '<div class="sr"><div class="sl">名称</div><input class="si" id="wb-name" value="' + esc(wb.name) + '"></div>' +
    '<div class="sr"><div class="sl">内容</div><textarea class="sta" id="wb-content" rows="8">' + esc(wb.content) + '</textarea></div>' +
    '<div class="sr h"><span class="tg-lbl">全局生效</span><button class="tg' + (wb.isGlobal ? ' on' : '') + '" id="tg-wb-global" onclick="tgTog(\'tg-wb-global\')"><div class="tg-k"></div></button></div>' +
    '<div class="sr"><button class="btn-p" onclick="saveWbEntry(\'' + wb.id + '\',' + isNew + ')" style="margin:0">保存</button></div>' +
    (isNew ? '' : '<div class="sr"><button class="btn-d" onclick="deleteWbEntry(\'' + wb.id + '\')" style="margin:0">删除此条目</button></div>') +
    '</div>';

  // Use a modal-like approach: temporarily replace wb page body
  var wbBody = pg.querySelector('.body');
  wbBody.dataset.prevHtml = wbBody.innerHTML;
  wbBody.innerHTML = body.innerHTML;
}

async function saveWbEntry(id, isNew) {
  var wb = {
    id: id,
    name: document.getElementById('wb-name').value.trim(),
    content: document.getElementById('wb-content').value,
    isGlobal: document.getElementById('tg-wb-global').classList.contains('on')
  };
  if (!wb.name) { toast('请填写名称'); return; }

  await saveWorldbook(wb);
  if (isNew) { Cache.worldbooks.push(wb); }
  else {
    var idx = Cache.worldbooks.findIndex(function(w) { return w.id === id; });
    if (idx >= 0) Cache.worldbooks[idx] = wb;
  }

  toast('已保存 ✓');
  restoreWbList();
}

async function deleteWbEntry(id) {
  if (!confirm('确定删除？')) return;
  await deleteWorldbook(id);
  Cache.worldbooks = Cache.worldbooks.filter(function(w) { return w.id !== id; });
  toast('已删除');
  restoreWbList();
}

function restoreWbList() {
  var pg = document.getElementById('pg-wb');
  var wbBody = pg.querySelector('.body');
  renderWbList();
  // Restore the list view
  if (wbBody.dataset.prevHtml) {
    wbBody.innerHTML = wbBody.dataset.prevHtml;
    delete wbBody.dataset.prevHtml;
    renderWbList();
  }
}
