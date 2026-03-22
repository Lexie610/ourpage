/* ============================================
   char_settings.js — 角色设置页
   ============================================ */

function openCharSet() {
  var c = getChar(); if (!c) return;
  var body = document.getElementById('cset-body');
  body.innerHTML =
    '<div class="sg"><div class="sgt">基础资料</div>' +
      '<div class="sr"><div class="sl">角色真名</div><input class="si" id="s-real" value="' + esc(c.real||'') + '"></div>' +
      '<div class="sr"><div class="sl">我对TA的备注</div><input class="si" id="s-nick" value="' + esc(c.nick||'') + '"></div>' +
      '<div class="sr"><div class="sl">TA对我的备注</div><input class="si" id="s-cnick" value="' + esc(c.charNick||'') + '"></div>' +
      '<div class="sr"><div class="sl">两人关系</div><input class="si" id="s-rel" value="' + esc(c.rel||'') + '"></div>' +
    '</div>' +
    '<div class="sg"><div class="sgt">角色基础信息</div>' +
      '<div class="sr"><div class="sl">性别</div><select class="si" id="s-cgender"><option value="">请选择</option><option value="男"' + (c.cGender==='男'?' selected':'') + '>男</option><option value="女"' + (c.cGender==='女'?' selected':'') + '>女</option><option value="其他"' + (c.cGender==='其他'?' selected':'') + '>其他</option></select></div>' +
      '<div class="sr"><div class="sl">年龄</div><input class="si" id="s-cage" value="' + esc(c.cAge||'') + '" placeholder="例：22"></div>' +
      '<div class="sr"><div class="sl">职业</div><input class="si" id="s-cjob" value="' + esc(c.cJob||'') + '"></div>' +
      '<div class="sr"><div class="sl">哪里人</div><input class="si" id="s-cfrom" value="' + esc(c.cFrom||'') + '"></div>' +
      '<div class="sr"><div class="sl">现居地</div><input class="si" id="s-clive" value="' + esc(c.cLive||'') + '"></div>' +
    '</div>' +
    '<div class="sg"><div class="sgt">角色详细人设</div>' +
      '<div class="sr"><textarea class="sta" id="s-cdesc" rows="6" placeholder="性格、外貌、说话方式...">' + esc(c.charDesc||'') + '</textarea></div>' +
    '</div>' +
    '<div class="sg"><div class="sgt">User 基础信息</div>' +
      '<div class="sr"><div class="sl">我的名字</div><input class="si" id="s-uname" value="' + esc(c.uName||'') + '"></div>' +
      '<div class="sr"><div class="sl">性别</div><select class="si" id="s-ugender"><option value="">请选择</option><option value="男"' + (c.uGender==='男'?' selected':'') + '>男</option><option value="女"' + (c.uGender==='女'?' selected':'') + '>女</option><option value="其他"' + (c.uGender==='其他'?' selected':'') + '>其他</option></select></div>' +
      '<div class="sr"><div class="sl">年龄</div><input class="si" id="s-uage" value="' + esc(c.uAge||'') + '" placeholder="例：20"></div>' +
      '<div class="sr"><div class="sl">职业</div><input class="si" id="s-ujob" value="' + esc(c.uJob||'') + '"></div>' +
    '</div>' +
    '<div class="sg"><div class="sgt">User 详细人设</div>' +
      '<div class="sr"><textarea class="sta" id="s-udesc" rows="3" placeholder="你的性格、外貌...">' + esc(c.userDesc||'') + '</textarea></div>' +
    '</div>' +
    '<div class="sg"><div class="sgt">两人关系重要经历</div>' +
      '<div class="sr"><textarea class="sta" id="s-history" rows="4" placeholder="重要事件、转折点、共同回忆...">' + esc(c.history||'') + '</textarea></div>' +
    '</div>' +
    '<div class="sg"><div class="sgt">上下文</div>' +
      '<div class="sr h"><span class="tg-lbl">上下文条数</span><input class="si" id="s-ctx" type="number" value="' + (c.ctx||20) + '" style="width:70px;text-align:right"></div>' +
    '</div>' +
    '<div style="margin-top:10px"><button class="btn-d" onclick="if(confirm(\'确定删除？\')){deleteCurrentChar()}" style="margin:0">🗑 删除角色</button></div>';

  goTo('pg-cset');
}

async function saveCharSet() {
  var c = getChar(); if (!c) return;
  c.real = document.getElementById('s-real').value.trim() || c.real;
  c.nick = document.getElementById('s-nick').value.trim();
  c.charNick = document.getElementById('s-cnick').value.trim();
  c.rel = document.getElementById('s-rel').value.trim();
  c.cGender = document.getElementById('s-cgender').value;
  c.cAge = document.getElementById('s-cage').value.trim();
  c.cJob = document.getElementById('s-cjob').value.trim();
  c.cFrom = document.getElementById('s-cfrom').value.trim();
  c.cLive = document.getElementById('s-clive').value.trim();
  c.charDesc = document.getElementById('s-cdesc').value;
  c.uName = document.getElementById('s-uname').value.trim();
  c.uGender = document.getElementById('s-ugender').value;
  c.uAge = document.getElementById('s-uage').value.trim();
  c.uJob = document.getElementById('s-ujob').value.trim();
  c.userDesc = document.getElementById('s-udesc').value;
  c.history = document.getElementById('s-history').value;
  c.ctx = parseInt(document.getElementById('s-ctx').value) || 20;

  await saveCurrentChar();
  toast('已保存 ✓');
  goTo('pg-conv');
  renderChars();
  // Update conv header name
  var cn = document.getElementById('cn');
  if (cn) cn.textContent = c.nick || c.real;
}

async function deleteCurrentChar() {
  var c = getChar(); if (!c) return;
  Cache.chars = Cache.chars.filter(function(x) { return x.id !== c.id; });
  await deleteChar(c.id);
  goTo('pg-chat');
  renderChars();
  toast('已删除');
}
