/* ================================================================
   utils.js — 工具函数
================================================================ */

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function pad(n) {
  return n.toString().padStart(2, '0');
}

function sleep(ms) {
  return new Promise(function(r) { setTimeout(r, ms); });
}

function toast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2400);
}

// 读取文件为 base64
function readFileAsDataURL(file) {
  return new Promise(function(resolve, reject) {
    var r = new FileReader();
    r.onload = function(e) { resolve(e.target.result); };
    r.onerror = function() { reject(new Error('读取文件失败')); };
    r.readAsDataURL(file);
  });
}

// 时间标签
function getTimeLabel(hours) {
  if (hours < 6) return '凌晨';
  if (hours < 9) return '早上';
  if (hours < 12) return '上午';
  if (hours < 14) return '中午';
  if (hours < 18) return '下午';
  if (hours < 21) return '晚上';
  return '深夜';
}

// 格式化当前时间（给 buildSys 用）
function formatFullTime() {
  var now = new Date();
  var h = now.getHours();
  var days = ['日', '一', '二', '三', '四', '五', '六'];
  return now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日 周' + days[now.getDay()] + ' ' + getTimeLabel(h) + h + ':' + pad(now.getMinutes());
}
