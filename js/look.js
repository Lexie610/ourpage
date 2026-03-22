/* ============================================
   look.js — 外观设置（壁纸、气泡颜色）
   ============================================ */

async function renderLookPage() {
  var body = document.getElementById('look-body');
  var currentWp = await getConfig('wallpaperId', 'p0');

  var html = '<div class="sg"><div class="sgt">壁纸</div>';
  html += '<div class="sr"><div class="sl">预设壁纸</div><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">';
  WP_PRESETS.forEach(function(p) {
    html += '<div style="width:48px;height:48px;border-radius:10px;cursor:pointer;border:2.5px solid ' + (currentWp === p.id ? 'var(--purple)' : 'transparent') + ';background:' + p.g + '" onclick="setWallpaper(\'' + p.id + '\')"></div>';
  });
  html += '</div></div>';
  html += '<div class="sr"><button class="btn-s" onclick="document.getElementById(\'fi-look-wp\').click()" style="margin:0">📷 上传自定义壁纸</button></div>';
  html += '</div>';

  // Bubble colors
  var meColors = ['#a78bfa','#93c5fd','#f9a8d4','#86efac','#fcd34d','#fca5a5','#7c3aed','#2563eb','#374151'];
  var themColors = ['#f0f0f2','#ede9fe','#dbeafe','#fce7f3','#dcfce7','#fef3c7','#fee2e2','#e0f2fe','#374151'];

  html += '<div class="sg"><div class="sgt">气泡颜色</div>';
  html += '<div class="sr"><div class="sl">我的气泡</div><div class="cr" id="mc-row">';
  meColors.forEach(function(color) {
    html += '<div class="cdot' + (S.bubbleMe === color ? ' on' : '') + '" style="background:' + color + '" onclick="pickBubble(\'me\',\'' + color + '\',this)"></div>';
  });
  html += '</div></div>';
  html += '<div class="sr"><div class="sl">对方气泡</div><div class="cr" id="tc-row">';
  themColors.forEach(function(color) {
    html += '<div class="cdot' + (S.bubbleThem === color ? ' on' : '') + '" style="background:' + color + (color === '#f0f0f2' ? ';border-color:#d1d1d6' : '') + '" onclick="pickBubble(\'them\',\'' + color + '\',this)"></div>';
  });
  html += '</div></div></div>';

  body.innerHTML = html;
}

async function setWallpaper(id) {
  await setConfig('wallpaperId', id);
  await applyWallpaper();
  renderLookPage();
  toast('壁纸已更换 ✓');
}

async function pickBubble(who, color, el) {
  if (who === 'me') {
    S.bubbleMe = color;
    document.querySelectorAll('#mc-row .cdot').forEach(function(d) { d.classList.remove('on'); });
  } else {
    S.bubbleThem = color;
    document.querySelectorAll('#tc-row .cdot').forEach(function(d) { d.classList.remove('on'); });
  }
  el.classList.add('on');
  applyBubs(S.bubbleMe, S.bubbleThem);
  await setConfig('bubbleMe', S.bubbleMe);
  await setConfig('bubbleThem', S.bubbleThem);
}

// Custom wallpaper upload
function setupWallpaperUpload() {
  document.getElementById('fi-look-wp').addEventListener('change', async function(e) {
    var f = e.target.files[0]; if (!f) return;
    var dataUrl = await readFileAsDataURL(f);
    var customs = await getConfig('wallpaperCustom', []);
    customs.push(dataUrl);
    await setConfig('wallpaperCustom', customs);
    var id = 'c' + (customs.length - 1);
    await setConfig('wallpaperId', id);
    await applyWallpaper();
    renderLookPage();
    toast('壁纸已设置 ✓');
    e.target.value = '';
  });
}
