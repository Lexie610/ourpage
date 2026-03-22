/* ================================================================
   ui.js — 页面导航、主屏渲染、时钟
================================================================ */

function goTo(id) {
  var cur = pageStack[pageStack.length - 1];
  if (cur === id) return;
  var existIdx = pageStack.indexOf(id);
  if (existIdx >= 0) {
    while (pageStack.length > existIdx + 1) {
      var p = pageStack.pop();
      document.getElementById(p).className = 'pg pg-app right';
    }
    document.getElementById(id).className = 'pg pg-app show';
  } else {
    document.getElementById(cur).className = 'pg ' + (cur === 'pg-home' ? 'pg-home' : 'pg-app') + ' left';
    document.getElementById(id).className = 'pg pg-app show';
    pageStack.push(id);
  }
}

function goHome() {
  while (pageStack.length > 1) {
    var cur = pageStack.pop();
    document.getElementById(cur).className = 'pg pg-app right';
  }
  document.getElementById('pg-home').className = 'pg pg-home show';
}

function openSh(id) { document.getElementById(id).classList.add('show'); }
function closeSh(id) { document.getElementById(id).classList.remove('show'); }

async function renderHome() {
  var grid = document.getElementById('icons-grid');
  var dock = document.getElementById('dock');
  var ci = await getSetting('customIcons', {});
  var gridA = APPS.filter(function(a) { return !a.dock; });
  var dockA = APPS.filter(function(a) { return a.dock; });
  grid.innerHTML = gridA.map(function(a) {
    return '<div class="app-ico" data-appid="' + a.id + '"><button class="ico-del">✕</button><div class="ico-box ' + a.cls + '">' + (ci[a.id] ? '<img src="' + ci[a.id] + '">' : a.emoji) + '</div><div class="ico-lbl">' + a.label + '</div></div>';
  }).join('');
  dock.innerHTML = dockA.map(function(a) {
    return '<div class="app-ico" data-appid="' + a.id + '"><div class="ico-box ' + a.cls + '">' + (ci[a.id] ? '<img src="' + ci[a.id] + '">' : a.emoji) + '</div><div class="ico-lbl">' + a.label + '</div></div>';
  }).join('');
  var handler = function(e) {
    var ico = e.target.closest('.app-ico');
    if (!ico || editMode) return;
    var app = APPS.find(function(a) { return a.id === ico.dataset.appid; });
    if (app) app.action();
  };
  grid.onclick = handler;
  dock.onclick = handler;
}

function openApiSettings() { openSh('sh-hset'); loadApiSettings(); }

var longPressTimer = null;
function enterEdit() {
  editMode = true;
  document.getElementById('icons-grid').classList.add('edit-mode');
  document.getElementById('edit-bar').classList.add('show');
  if (navigator.vibrate) navigator.vibrate(35);
}
function exitEdit() {
  editMode = false;
  document.getElementById('icons-grid').classList.remove('edit-mode');
  document.getElementById('edit-bar').classList.remove('show');
}

function tick() {
  var n = new Date();
  var t = pad(n.getHours()) + ':' + pad(n.getMinutes());
  var el1 = document.getElementById('stime');
  var el2 = document.getElementById('ctime');
  var el3 = document.getElementById('cdate');
  if (el1) el1.textContent = t;
  if (el2) el2.textContent = t;
  if (el3) {
    var days = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
    el3.textContent = (n.getMonth()+1) + '月' + n.getDate() + '日 ' + days[n.getDay()];
  }
}
