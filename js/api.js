/* ============================================
   api.js — API 调用
   ============================================ */

async function callAPI(system, messages, maxTokens) {
  maxTokens = maxTokens || 400;
  const s = await getConfig('apiSettings', {});
  const base = (s.apiBase || '').replace(/\/+$/, '');
  const key = s.apiKey || '';
  const model = s.apiModel || 'claude-sonnet-4-5';
  const temp = parseFloat(s.temperature) || 1.0;

  if (!base) throw new Error('未配置反代地址');
  if (!key) throw new Error('未配置 API Key');

  const isClaude = base.indexOf('anthropic') >= 0 || model.indexOf('claude') === 0;

  if (isClaude) {
    const res = await fetch(base + '/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, temperature: temp, system, messages })
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error((e && e.error && e.error.message) || 'HTTP ' + res.status);
    }
    return (await res.json()).content[0].text;
  } else {
    const oaiMsgs = [{ role: 'system', content: system }].concat(messages);
    const res = await fetch(base + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model, max_tokens: maxTokens, temperature: temp, messages: oaiMsgs, stream: false })
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error((e && e.error && e.error.message) || 'HTTP ' + res.status);
    }
    const data = await res.json();
    if (!data.choices || !data.choices.length) throw new Error('没有收到回复');
    return data.choices[0].message.content;
  }
}

async function fetchModels() {
  const s = await getConfig('apiSettings', {});
  const base = (s.apiBase || '').replace(/\/+$/, '');
  const key = s.apiKey || '';
  if (!base) { toast('请先填写反代地址'); return []; }
  if (!key) { toast('请先填写Key'); return []; }

  const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key };
  if (base.indexOf('anthropic') >= 0) {
    headers['x-api-key'] = key;
    headers['anthropic-version'] = '2023-06-01';
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
  }

  const res = await fetch(base + '/v1/models', { method: 'GET', headers });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();

  let models = [];
  if (Array.isArray(data)) models = data.map(m => typeof m === 'string' ? m : (m.id || m.name || ''));
  else if (data.data) models = data.data.map(m => typeof m === 'string' ? m : (m.id || m.name || ''));
  else if (data.models) models = data.models.map(m => typeof m === 'string' ? m : (m.id || m.name || ''));
  return models.filter(m => m && m.length > 0);
}

/* ====== API Settings UI ====== */
async function loadApiSettings() {
  const s = await getConfig('apiSettings', {});
  const body = document.getElementById('api-settings-body');
  if (!body) return;
  body.innerHTML =
    '<div class="hs-sec"><div class="hs-sec-t">API 配置</div><div class="hs-group">' +
    '<input class="hs-inp" id="s-base" placeholder="反代地址 https://..." value="' + esc(s.apiBase || '') + '">' +
    '<input class="hs-inp" id="s-key" type="password" placeholder="API Key" value="' + esc(s.apiKey || '') + '">' +
    '<div style="display:flex;gap:8px;margin-bottom:10px"><input class="hs-inp" id="s-model" placeholder="模型名称" value="' + esc(s.apiModel || '') + '" style="flex:1;margin:0"><button class="hs-btn sec" onclick="doFetchModels()" style="width:auto;padding:0 16px;margin:0" id="fetch-btn">拉取</button></div>' +
    '<select id="model-dd" onchange="document.getElementById(\'s-model\').value=this.value" style="display:none;width:100%;padding:11px;background:#f2f2f7;border:1.5px solid #e5e5ea;border-radius:10px;font-size:14px;font-family:inherit;color:#1c1c1e;outline:none;margin-top:8px"><option value="">选择模型</option></select>' +
    '</div></div>' +
    '<div class="hs-sec"><div class="hs-sec-t">回复随机性</div><div class="hs-group"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Temperature</span><span id="temp-val" style="color:#007aff;font-weight:600">' + (s.temperature || 1.0) + '</span></div>' +
    '<input type="range" id="temp-sl" min="0" max="2" step="0.1" value="' + (s.temperature || 1.0) + '" oninput="document.getElementById(\'temp-val\').textContent=this.value" style="width:100%;accent-color:#007aff">' +
    '</div></div>' +
    '<div style="padding:0 16px"><button class="hs-btn" onclick="saveApiSettings()">保存设置</button><button class="hs-btn sec" onclick="closeSh(\'sh-hset\')">取消</button></div>';
}

async function saveApiSettings() {
  const s = {
    apiBase: document.getElementById('s-base').value.trim(),
    apiKey: document.getElementById('s-key').value.trim(),
    apiModel: document.getElementById('s-model').value.trim(),
    temperature: parseFloat(document.getElementById('temp-sl').value) || 1.0
  };
  await setConfig('apiSettings', s);
  toast('设置已保存 ✓');
  closeSh('sh-hset');
}

async function doFetchModels() {
  const btn = document.getElementById('fetch-btn');
  btn.textContent = '拉取中...'; btn.disabled = true;
  try {
    // Save current inputs first
    const tempSettings = {
      apiBase: document.getElementById('s-base').value.trim(),
      apiKey: document.getElementById('s-key').value.trim(),
      apiModel: document.getElementById('s-model').value.trim(),
      temperature: parseFloat(document.getElementById('temp-sl').value) || 1.0
    };
    await setConfig('apiSettings', tempSettings);

    const models = await fetchModels();
    if (!models.length) throw new Error('没有找到模型');
    const dd = document.getElementById('model-dd');
    dd.innerHTML = '<option value="">选择模型</option>' + models.map(m => '<option value="' + m + '">' + m + '</option>').join('');
    dd.style.display = 'block';
    btn.textContent = '✓ 已拉取';
    toast('拉取成功！共 ' + models.length + ' 个模型');
  } catch (e) {
    btn.textContent = '拉取';
    toast('拉取失败：' + e.message);
  }
  btn.disabled = false;
}
