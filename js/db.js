/* ================================================================
   db.js — 数据库层 (Dexie / IndexedDB)
   替代 localStorage，容量从 5MB → 几百MB
================================================================ */

const db = new Dexie('MyPocketDB');

db.version(1).stores({
  // 角色表：每个角色一条记录
  chars: 'id, real, nick, createdAt',
  // 消息表：每条消息一条记录，按角色ID索引
  messages: '++id, charId, role, t, type',
  // 表情包表
  stickers: '++id, name, url, group',
  // 世界书表
  worldbooks: '++id, name, isGlobal',
  // 动态表
  dynamics: '++id, type, time',
  // NPC表
  npcs: '++id, name',
  // 心声表
  hearts: '++id, charId, time',
  // 设置表：key-value存储
  settings: 'key'
});

/* ---- 设置读写 ---- */
async function getSetting(key, defaultVal) {
  var row = await db.settings.get(key);
  return row ? row.value : defaultVal;
}

async function setSetting(key, value) {
  await db.settings.put({ key: key, value: value });
}

/* ---- 角色 CRUD ---- */
async function getAllChars() {
  return await db.chars.toArray();
}

async function getCharById(id) {
  return await db.chars.get(id);
}

async function saveChar(charData) {
  await db.chars.put(charData);
}

async function deleteChar(id) {
  await db.chars.delete(id);
  await db.messages.where('charId').equals(id).delete();
  await db.hearts.where('charId').equals(id).delete();
}

/* ---- 消息 CRUD ---- */
async function getMessages(charId) {
  return await db.messages.where('charId').equals(charId).sortBy('t');
}

async function addMessage(charId, msg) {
  msg.charId = charId;
  return await db.messages.add(msg);
}

async function updateMessage(id, changes) {
  await db.messages.update(id, changes);
}

async function deleteMessage(id) {
  await db.messages.delete(id);
}

async function deleteMessages(ids) {
  await db.messages.bulkDelete(ids);
}

async function getRecentMessages(charId, count) {
  var all = await db.messages.where('charId').equals(charId).sortBy('t');
  return all.slice(-count);
}

/* ---- 心声 CRUD ---- */
async function getHearts(charId) {
  return await db.hearts.where('charId').equals(charId).sortBy('time');
}

async function addHeart(charId, text) {
  await db.hearts.add({
    charId: charId,
    time: new Date().toLocaleString(),
    text: text
  });
  // 最多保留50条
  var all = await getHearts(charId);
  if (all.length > 50) {
    await db.hearts.delete(all[0].id);
  }
}

async function deleteHeart(id) {
  await db.hearts.delete(id);
}

/* ---- 表情包 CRUD ---- */
async function getAllStickers() {
  return await db.stickers.toArray();
}

async function addSticker(stickerData) {
  return await db.stickers.add(stickerData);
}

async function deleteSticker(id) {
  await db.stickers.delete(id);
}

/* ---- 世界书 CRUD ---- */
async function getAllWorldbooks() {
  return await db.worldbooks.toArray();
}

async function saveWorldbook(wbData) {
  await db.worldbooks.put(wbData);
}

async function deleteWorldbook(id) {
  await db.worldbooks.delete(id);
}

/* ---- 动态 CRUD ---- */
async function getAllDynamics() {
  return await db.dynamics.toArray();
}

async function addDynamic(dynData) {
  return await db.dynamics.add(dynData);
}

async function deleteDynamic(id) {
  await db.dynamics.delete(id);
}

/* ---- NPC CRUD ---- */
async function getAllNpcs() {
  return await db.npcs.toArray();
}

async function addNpc(npcData) {
  return await db.npcs.add(npcData);
}

async function deleteNpc(id) {
  await db.npcs.delete(id);
}

/* ---- 数据迁移：从 localStorage 导入旧数据 ---- */
async function migrateFromLocalStorage() {
  var migrated = await getSetting('migrated', false);
  if (migrated) return;

  var raw = localStorage.getItem('mp_data');
  if (!raw) {
    await setSetting('migrated', true);
    return;
  }

  try {
    var old = JSON.parse(raw);
    console.log('开始迁移旧数据...');

    // 迁移角色
    if (old.chars && old.chars.length) {
      for (var c of old.chars) {
        var msgs = c.messages || [];
        delete c.messages; // 消息单独存
        await db.chars.put(c);
        // 迁移消息，拆分合并的assistant消息
        for (var m of msgs) {
          if (m.role === 'assistant' && m.content && m.content.indexOf('\n\n') >= 0 && (!m.type || m.type === 'text')) {
            var parts = m.content.split(/\n{2,}/).map(function(p) { return p.trim(); }).filter(function(p) { return p.length > 0; });
            if (parts.length > 1) {
              for (var k = 0; k < parts.length; k++) {
                await db.messages.add({ charId: c.id, role: 'assistant', content: parts[k], t: (m.t || Date.now()) + k });
              }
              continue;
            }
          }
          m.charId = c.id;
          await db.messages.add(m);
        }
        // 迁移心声
        if (c.hearts && c.hearts.length) {
          for (var h of c.hearts) {
            await db.hearts.add({ charId: c.id, time: h.time, text: h.text });
          }
        }
      }
    }

    // 迁移表情包
    if (old.stickers && old.stickers.length) {
      for (var s of old.stickers) {
        var url = typeof s === 'string' ? s : s.url;
        var name = typeof s === 'string' ? '' : (s.name || '');
        await db.stickers.add({ url: url, name: name, group: '默认' });
      }
    }

    // 迁移世界书
    if (old.worldbooks && old.worldbooks.length) {
      for (var w of old.worldbooks) {
        await db.worldbooks.put(w);
      }
    }

    // 迁移动态
    if (old.dynamics && old.dynamics.length) {
      for (var d of old.dynamics) {
        await db.dynamics.add(d);
      }
    }

    // 迁移NPC
    if (old.npcs && old.npcs.length) {
      for (var n of old.npcs) {
        await db.npcs.add(n);
      }
    }

    // 迁移设置
    var apiSettings = localStorage.getItem('mypocket_settings');
    if (apiSettings) await setSetting('api', JSON.parse(apiSettings));

    var presets = localStorage.getItem('mp_presets');
    if (presets) await setSetting('presets', JSON.parse(presets));

    if (old.dynP) await setSetting('dynProfile', old.dynP);
    if (old.bme) await setSetting('bubbleMe', old.bme);
    if (old.bthem) await setSetting('bubbleThem', old.bthem);

    var wp = localStorage.getItem('mp_wp');
    if (wp) await setSetting('wallpaper', wp);

    var wpCustom = localStorage.getItem('mp_wp_c');
    if (wpCustom) await setSetting('wallpaperCustom', JSON.parse(wpCustom));

    var icons = localStorage.getItem('mp_custom_icons');
    if (icons) await setSetting('customIcons', JSON.parse(icons));

    await setSetting('migrated', true);
    console.log('数据迁移完成！');
  } catch (e) {
    console.error('迁移失败：', e);
  }
}
