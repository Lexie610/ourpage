/* ================================================================
   api.js — API 调用、模型拉取、设置读写
================================================================ */

async function loadApiSettings() {
  var s = await getSetting('api', {});
  document.getElementById('s-base').value = s.apiBase || '';
  document.getElementById('s-key').value = s.apiKey || '';
  document.getElementById('s-model').value = s.apiModel || '';
  document.getElementById('temp-sl').value = s.temperature || 1.0;
  document.getElementById('temp-val').textContent = s.temperature || 1.0;
}

async function saveApiSettings() {
  var s = {
    apiBase: document.getElementById('s-base').value.trim(),
    apiKey: document.getElementById('s-key').value.trim(),
    apiModel: document.getElementById('s-model').value.trim(),
    temperature: parseFloat(document.getElementById('temp-sl').value) || 1.0
  };
  await setSetting('api', s);
  toast('设置已保存 ✓');
  closeSh('sh-hset');
}

async function fetchModels() {
  var btn = document.getElementById('fetch-models-btn');
  var base = document.getElementById('s-base').value.trim();
  var key = document.getElementById('s-key').value.trim();
  if (!base) { toast('请先填写反代地址'); return; }
  if (!key) { toast('请先填写Key'); return; }
  btn.textContent = '拉取中...'; btn.disabled = true;
  try {
    var url = base.replace(/\/+$/, '') + '/v1/models';
    var headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key };
    if (base.indexOf('anthropic') >= 0) {
      headers['x-api-key'] = key;
      headers['anthropic-version'] = '2023-06-01';
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
    }
    var res = await fetch(url, { method: 'GET', headers: headers });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();
    var models = [];
    if (Array.isArray(data)) models = data.map(function(m) { return typeof m === 'string' ? m : (m.id || m.name || ''); });
    else if (data.data) models = data.data.map(function(m) { return typeof m === 'string' ? m : (m.id || m.name || ''); });
    else if (data.models) models = data.models.map(function(m) { return typeof m === 'string' ? m : (m.id || m.name || ''); });
    models = models.filter(function(m) { return m && m.length > 0; });
    if (!models.length) throw new Error('没有找到模型');
    var dd = document.getElementById('model-dd');
    dd.innerHTML = '<option value="">选择模型</option>' + models.map(function(m) { return '<option value="' + m + '">' + m + '</option>'; }).join('');
    dd.style.display = 'block';
    dd.onchange = function() { document.getElementById('s-model').value = dd.value; };
    btn.textContent = '✓ 已拉取';
    toast('拉取成功！共 ' + models.length + ' 个模型');
  } catch (e) {
    btn.textContent = '拉取';
    if (e.message === 'Failed to fetch') toast('网络错误（CORS跨域或地址错误）');
    else toast('拉取失败：' + e.message);
  }
  btn.disabled = false;
}

async function callAPI(system, messages, maxTokens) {
  maxTokens = maxTokens || 400;
  var s = await getSetting('api', {});
  var base = (s.apiBase || '').replace(/\/+$/, '');
  var key = s.apiKey || '';
  var model = s.apiModel || 'claude-sonnet-4-5';
  var temp = parseFloat(s.temperature) || 1.0;
  if (!base) throw new Error('未配置反代地址');
  if (!key) throw new Error('未配置 API Key');

  var isClaude = base.indexOf('anthropic') >= 0 || model.indexOf('claude') === 0;

  if (isClaude) {
    var res = await fetch(base + '/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model: model, max_tokens: maxTokens, temperature: temp, system: system, messages: messages })
    });
    if (!res.ok) {
      var e = await res.json().catch(function() { return {}; });
      throw new Error((e && e.error && e.error.message) || 'HTTP ' + res.status);
    }
    return (await res.json()).content[0].text;
  } else {
    var oaiMsgs = [{ role: 'system', content: system }].concat(messages);
    var res2 = await fetch(base + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model: model, max_tokens: maxTokens, temperature: temp, messages: oaiMsgs, stream: false })
    });
    if (!res2.ok) {
      var e2 = await res2.json().catch(function() { return {}; });
      throw new Error((e2 && e2.error && e2.error.message) || 'HTTP ' + res2.status);
    }
    var data2 = await res2.json();
    if (!data2.choices || !data2.choices.length) throw new Error('没有收到回复');
    return data2.choices[0].message.content;
  }
}
