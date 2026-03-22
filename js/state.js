/* ================================================================
   state.js — 全局状态 & 常量
================================================================ */

// 当前状态
var currentCharId = null;
var editMode = false;
var multiMode = false;
var multiSel = [];
var avatarTarget = null; // 'char' or 'user'
var pageStack = ['pg-home'];

// App 图标配置
var APPS = [
  { id: 'chat',  label: '聊天',    emoji: '💬', cls: 'ic-chat',  dock: true,  action: function() { goTo('pg-chat'); } },
  { id: 'set',   label: '设置',    emoji: '⚙️', cls: 'ic-set',   dock: false, action: function() { openApiSettings(); } },
  { id: 'wb',    label: '世界书',  emoji: '📖', cls: 'ic-wb',    dock: false, action: function() { goTo('pg-wb'); } },
  { id: 'phone', label: '他的手机', emoji: '📱', cls: 'ic-phone', dock: false, action: function() { toast('他的手机 — 开发中'); } },
  { id: 'weibo', label: '微博',    emoji: '🌸', cls: 'ic-weibo', dock: false, action: function() { toast('微博 — 开发中'); } },
  { id: 'x',     label: 'X',       emoji: '✖️', cls: 'ic-x',     dock: false, action: function() { toast('X — 开发中'); } },
  { id: 'grp',   label: '小组',    emoji: '👥', cls: 'ic-grp',   dock: false, action: function() { toast('小组 — 开发中'); } },
  { id: 'look',  label: '外观',    emoji: '🎨', cls: 'ic-look',  dock: false, action: function() { renderLookPage(); goTo('pg-look'); } }
];

// 壁纸预设
var WP_PRESETS = [
  { id: 'p0', g: 'linear-gradient(160deg,#1a1a2e,#16213e,#0f3460)' },
  { id: 'p1', g: 'linear-gradient(160deg,#2d1b69,#11998e,#38ef7d)' },
  { id: 'p2', g: 'linear-gradient(160deg,#141e30,#243b55)' },
  { id: 'p3', g: 'linear-gradient(160deg,#f093fb,#f5576c,#fda085)' },
  { id: 'p4', g: 'linear-gradient(160deg,#4facfe,#00f2fe)' },
  { id: 'p5', g: 'linear-gradient(160deg,#43e97b,#38f9d7)' }
];

// 新角色默认数据
function createDefaultChar(name) {
  return {
    id: 'c' + Date.now(),
    real: name,
    nick: '',
    charNick: '',
    rel: '',
    cGender: '',
    cAge: '',
    cJob: '',
    cFrom: '',
    cLive: '',
    uName: '',
    uGender: '',
    uAge: '',
    uJob: '',
    history: '',
    emoji: '🧑',
    charAv: '',
    userAv: '',
    charDesc: '',
    userDesc: '',
    wbIds: [],
    ctx: 20,
    memOn: false,
    autoSum: false,
    sumCt: 50,
    sumPrompt: '',
    summaries: [],
    timeOn: true,
    chatBg: '',
    bubbleMe: '#a78bfa',
    bubbleThem: '#f0f0f2',
    status: '',
    blacklist: null,
    createdAt: Date.now()
  };
}
