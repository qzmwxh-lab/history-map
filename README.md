[Uploading vr.html…]()
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>环视台 · VR全景托管平台</title>
<link rel="preconnect" href="https://fonts.font.im">
<link href="https://fonts.font.im/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<style>
  :root{
    --bg:#0d0e12; --panel:#15171d; --panel-2:#1c1f27; --panel-3:#23262f;
    --border:#272b35; --border-soft:#1e212a;
    --ink:#e7e8ec; --ink-dim:#9498a3; --ink-faint:#666b78;
    --accent:#6c6ff0; --accent-deep:#5457c9; --accent-soft:rgba(108,111,240,.18);
    --warn:#e0a23c; --warn-soft:rgba(224,162,60,.18);
    --danger:#e1574c; --danger-soft:rgba(225,87,76,.16);
    --ok:#3fc488;
    --sans:'Inter',system-ui,-apple-system,sans-serif;
    --mono:'JetBrains Mono',monospace;
    --rail-w:300px;
  }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;height:100%;font-family:var(--sans);color:var(--ink);background:var(--bg);}
  body{overflow:hidden;}
  button,input,select,textarea{font-family:var(--sans);}
  a{color:var(--accent);text-decoration:none;}
  ::-webkit-scrollbar{width:6px;height:6px;}
  ::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}

  .view{position:fixed;inset:0;display:none;}
  .view.active{display:block;}

  /* ---------- 顶部全局条 ---------- */
  #topbar{
    position:fixed;top:0;left:0;right:0;height:56px;z-index:300;
    display:flex;align-items:center;gap:14px;padding:0 18px;
    background:rgba(13,14,18,.78);backdrop-filter:blur(10px);
    border-bottom:1px solid var(--border-soft);
  }
  #topbar .brand{font-weight:800;font-size:17px;letter-spacing:.5px;display:flex;align-items:center;gap:8px;cursor:pointer;}
  #topbar .brand .dot{width:8px;height:8px;border-radius:50%;background:var(--accent);box-shadow:0 0 10px var(--accent);}
  #topbar .sp{flex:1;}
  .btn{
    font-size:13px;font-weight:600;padding:8px 15px;border-radius:9px;border:1px solid var(--border);
    background:var(--panel-2);color:var(--ink);cursor:pointer;transition:.15s;display:inline-flex;align-items:center;gap:6px;
  }
  .btn:hover{background:var(--panel-3);border-color:#343845;}
  .btn-accent{background:var(--accent);border-color:var(--accent-deep);color:#fff;}
  .btn-accent:hover{background:var(--accent-deep);}
  .btn-danger{background:transparent;border-color:var(--danger);color:var(--danger);}
  .btn-danger:hover{background:var(--danger-soft);}
  .btn-ghost{background:transparent;border-color:transparent;color:var(--ink-dim);}
  .btn-ghost:hover{background:var(--panel-2);color:var(--ink);}
  .btn[disabled]{opacity:.4;cursor:not-allowed;}
  .btn.admin-on{background:var(--accent);border-color:var(--accent-deep);color:#fff;animation:pulseGlow 1.6s ease-in-out infinite;}
  @keyframes pulseGlow{0%,100%{box-shadow:0 0 0 0 rgba(108,111,240,.55);}50%{box-shadow:0 0 0 7px rgba(108,111,240,0);}}
  .sync-dot{width:7px;height:7px;border-radius:50%;background:var(--ink-faint);}
  .sync-dot.live{background:var(--ok);animation:pulseGlow2 1.8s ease-in-out infinite;}
  @keyframes pulseGlow2{0%,100%{box-shadow:0 0 0 0 rgba(63,196,136,.5);}50%{box-shadow:0 0 0 6px rgba(63,196,136,0);}}

  /* ---------- 作品列表 ---------- */
  #view-list{padding-top:90px;overflow-y:auto;}
  #list-inner{max-width:1080px;margin:0 auto;padding:0 24px 60px;}
  #list-inner h1{font-size:26px;font-weight:800;margin:0 0 6px;}
  #list-inner .sub{color:var(--ink-dim);font-size:14px;margin:0 0 28px;}
  #works-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px;}
  .work-card{
    background:var(--panel);border:1px solid var(--border);border-radius:14px;overflow:hidden;cursor:pointer;
    transition:.2s;
  }
  .work-card:hover{border-color:var(--accent);transform:translateY(-2px);}
  .work-card .cover{width:100%;height:130px;background:var(--panel-2);object-fit:cover;display:block;}
  .work-card .body{padding:13px 14px;}
  .work-card .title{font-weight:700;font-size:14.5px;margin:0 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .work-card .meta{font-size:11.5px;color:var(--ink-faint);font-family:var(--mono);}
  .new-work-card{
    border:1.5px dashed var(--border);border-radius:14px;display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:8px;min-height:178px;cursor:pointer;color:var(--ink-dim);transition:.2s;
  }
  .new-work-card:hover{border-color:var(--accent);color:var(--accent);}
  .new-work-card .plus{font-size:30px;line-height:1;}
  #list-empty{color:var(--ink-faint);font-size:13.5px;padding:40px 0;text-align:center;display:none;}

  /* ---------- 首页控制条：搜索 + 列表/地图切换 ---------- */
  #home-controls{display:flex;align-items:center;gap:10px;margin-bottom:20px;}
  #home-search{
    flex:1;max-width:340px;padding:9px 14px;border-radius:10px;border:1px solid var(--border);
    background:var(--panel-2);color:var(--ink);font-size:13.5px;
  }
  #home-search:focus{outline:2px solid var(--accent);outline-offset:1px;}
  #home-search::placeholder{color:var(--ink-faint);}
  .view-toggle{display:flex;border:1px solid var(--border);border-radius:10px;overflow:hidden;flex-shrink:0;}
  .view-toggle button{
    padding:9px 16px;font-size:13px;font-weight:600;border:none;background:var(--panel-2);color:var(--ink-dim);
    cursor:pointer;display:flex;align-items:center;gap:6px;
  }
  .view-toggle button.active{background:var(--accent);color:#fff;}
  .view-toggle button:not(.active):hover{background:var(--panel-3);color:var(--ink);}
  #filter-chip{
    display:none;align-items:center;gap:8px;background:var(--accent-soft);color:var(--accent);
    border:1px solid var(--accent-deep);border-radius:20px;padding:7px 14px;font-size:12.5px;font-weight:600;
    margin-bottom:16px;width:fit-content;
  }
  #filter-chip.show{display:flex;}
  #filter-chip button{background:none;border:none;color:var(--accent);cursor:pointer;font-weight:700;font-size:13px;padding:0;}

  /* ---------- 首页地图模式 ---------- */
  #works-map-wrap{display:none;height:calc(100vh - 230px);min-height:420px;border-radius:14px;overflow:hidden;border:1px solid var(--border);position:relative;}
  #works-map-wrap.show{display:block;}
  #works-map{width:100%;height:100%;background:var(--panel);}
  /* AMap 默认是浅色底图，用滤镜翻转成符合本站暗色调性的底图，不依赖额外的深色图源 key */
  #works-map .leaflet-tile-pane{filter:invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.92) saturate(0.7);}
  .cluster-bubble{
    display:flex;align-items:center;justify-content:center;border-radius:50%;
    background:rgba(108,111,240,.78);border:2px solid #fff;color:#fff;font-weight:700;font-family:var(--mono);
    box-shadow:0 4px 14px rgba(108,111,240,.45);cursor:pointer;
  }
  .cluster-bubble.single{background:rgba(63,196,136,.85);box-shadow:0 4px 14px rgba(63,196,136,.4);}
  #map-empty-hint{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:var(--ink-faint);font-size:13px;text-align:center;z-index:2;display:none;}
  #map-empty-hint.show{display:block;}

  /* ---------- 新建作品弹窗中的位置选择 ---------- */
  .modal.wide{max-width:420px;}
  #nw-pick-map{width:100%;height:170px;border-radius:10px;overflow:hidden;border:1px solid var(--border);margin-top:6px;}
  #nw-pick-map .leaflet-tile-pane{filter:invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.92) saturate(0.7);}
  #nw-coords{font-family:var(--mono);font-size:11px;color:var(--accent);margin-top:6px;min-height:14px;}
  #nw-clear-loc{background:none;border:none;color:var(--ink-faint);font-size:11px;cursor:pointer;text-decoration:underline;padding:0;margin-left:8px;}

  /* ---------- 全景查看 / 编辑器 ---------- */
  #view-viewer{background:#000;}
  #pano-canvas-wrap{position:absolute;inset:0;}
  #pano-canvas-wrap canvas{display:block;width:100%;height:100%;}
  #pano-loading{
    position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
    color:var(--ink-dim);font-size:13px;font-family:var(--mono);background:#000;z-index:5;pointer-events:none;
  }
  #pano-loading.hide{display:none;}

  .compass{position:fixed;left:18px;bottom:18px;z-index:250;width:54px;height:54px;border-radius:50%;
    background:rgba(21,23,29,.8);border:1px solid var(--border);backdrop-filter:blur(6px);}
  .compass svg{width:100%;height:100%;}
  .compass .needle{transform-origin:27px 27px;transition:transform .05s linear;}

  .scene-title-pill{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:250;
    background:rgba(21,23,29,.8);border:1px solid var(--border);backdrop-filter:blur(6px);
    padding:8px 18px;border-radius:20px;font-size:13px;font-weight:600;color:var(--ink);
    display:flex;align-items:center;gap:10px;}
  .scene-title-pill .tour-btn{background:none;border:none;color:var(--accent);cursor:pointer;font-size:13px;font-weight:700;padding:0;}

  .hotspot-tooltip{position:fixed;z-index:280;background:var(--panel-2);border:1px solid var(--border);
    border-radius:10px;padding:9px 13px;font-size:12.5px;max-width:240px;pointer-events:none;
    box-shadow:0 8px 24px rgba(0,0,0,.4);display:none;}
  .hotspot-tooltip.show{display:block;}
  .hotspot-tooltip .t-title{font-weight:700;margin-bottom:3px;}
  .hotspot-tooltip .t-text{color:var(--ink-dim);}

  /* ---------- 右侧编辑/导航侧栏 ---------- */
  #rail{
    position:fixed;top:56px;right:0;bottom:0;width:var(--rail-w);z-index:260;
    background:rgba(21,23,29,.92);backdrop-filter:blur(10px);border-left:1px solid var(--border-soft);
    display:flex;flex-direction:column;transform:translateX(100%);transition:transform .35s cubic-bezier(.22,.61,.36,1);
  }
  #rail.open{transform:translateX(0);}
  #rail-toggle{position:fixed;top:66px;right:18px;z-index:270;}
  .rail-section{padding:16px 16px 8px;}
  .rail-section h4{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-faint);margin:0 0 10px;font-weight:700;}
  #scene-list{list-style:none;margin:0;padding:0 10px 6px;overflow-y:auto;flex:0 1 auto;max-height:34vh;}
  #scene-list li{
    display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:9px;cursor:pointer;font-size:13px;margin-bottom:3px;
  }
  #scene-list li:hover{background:var(--panel-2);}
  #scene-list li.active{background:var(--accent-soft);color:var(--accent);}
  #scene-list li .stype{font-size:10px;color:var(--ink-faint);font-family:var(--mono);flex-shrink:0;width:16px;}
  #scene-list li .sname{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  #scene-list li .sdel{opacity:0;color:var(--danger);font-size:14px;padding:0 2px;}
  #scene-list li:hover .sdel{opacity:1;}
  #scene-list li[draggable="true"]{cursor:grab;}
  #scene-list li.dragging{opacity:.4;}
  #scene-list li.drag-over{border-top:2px solid var(--accent);}

  #hotspot-list{list-style:none;margin:0;padding:0 10px 16px;overflow-y:auto;flex:1;}
  #hotspot-list li{padding:9px 10px;border-radius:9px;font-size:12.5px;margin-bottom:3px;cursor:pointer;display:flex;align-items:center;gap:8px;}
  #hotspot-list li:hover{background:var(--panel-2);}
  #hotspot-list li .htag{font-size:10px;padding:2px 6px;border-radius:6px;font-family:var(--mono);flex-shrink:0;}
  .htag.scene{background:var(--accent-soft);color:var(--accent);}
  .htag.info{background:var(--warn-soft);color:var(--warn);}
  #hotspot-list li .hname{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  #hotspot-list li .hdel{opacity:0;color:var(--danger);font-size:13px;}
  #hotspot-list li:hover .hdel{opacity:1;}
  #hotspot-empty{color:var(--ink-faint);font-size:12px;padding:6px 10px;}

  .upload-strip{display:flex;gap:8px;padding:0 16px 14px;}
  .upload-strip label.btn{flex:1;text-align:center;justify-content:center;font-size:12px;}
  .upload-strip input[type=file]{display:none;}
  #scene-upload-status{padding:0 16px 12px;font-size:11.5px;color:var(--ink-dim);min-height:14px;}
  #scene-upload-status.ok{color:var(--ok);}
  #scene-upload-status.err{color:var(--danger);}

  #add-hotspot-toggle.on{background:var(--accent);border-color:var(--accent-deep);color:#fff;}
  #editor-toolbar{position:fixed;left:18px;top:70px;z-index:260;display:flex;flex-direction:column;gap:8px;}
  #editor-toolbar.hidden{display:none;}

  /* ---------- 锚点编辑小表单（悬浮在点击位置） ---------- */
  #hotspot-editor{position:fixed;z-index:290;background:var(--panel);border:1px solid var(--border);border-radius:12px;
    padding:14px;width:240px;box-shadow:0 16px 40px rgba(0,0,0,.5);display:none;}
  #hotspot-editor.show{display:block;}
  #hotspot-editor .f{margin-bottom:10px;}
  #hotspot-editor label{display:block;font-size:11px;color:var(--ink-faint);margin-bottom:4px;}
  #hotspot-editor input,#hotspot-editor select,#hotspot-editor textarea{
    width:100%;padding:7px 9px;border-radius:7px;border:1px solid var(--border);background:var(--panel-2);color:var(--ink);font-size:12.5px;
  }
  #hotspot-editor textarea{resize:vertical;min-height:46px;}
  #hotspot-editor .row{display:flex;gap:8px;margin-top:10px;}
  #hotspot-editor .row .btn{flex:1;padding:7px;font-size:12px;justify-content:center;}

  /* ---------- 通用蒙层/弹窗（登录 / 新建作品） ---------- */
  .overlay{position:fixed;inset:0;background:rgba(5,5,8,.6);z-index:700;display:none;align-items:center;justify-content:center;padding:20px;}
  .overlay.show{display:flex;}
  .modal{background:var(--panel);border:1px solid var(--border);border-radius:16px;width:100%;max-width:360px;padding:24px;box-shadow:0 24px 60px rgba(0,0,0,.5);}
  .modal h3{margin:0 0 16px;font-size:19px;font-weight:800;}
  .field{margin-bottom:13px;}
  .field label{display:block;font-size:11.5px;color:var(--ink-dim);margin-bottom:5px;font-weight:600;}
  .field input,.field textarea{
    width:100%;padding:9px 11px;border-radius:8px;border:1px solid var(--border);background:var(--panel-2);color:var(--ink);font-size:13px;
  }
  .field input:focus,.field textarea:focus{outline:2px solid var(--accent);outline-offset:1px;}
  .modal-actions{display:flex;gap:9px;margin-top:6px;}
  .modal-actions .btn{flex:1;justify-content:center;}
  .form-err{color:var(--danger);font-size:12px;margin:-3px 0 9px;min-height:14px;}

  #toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--panel-3);color:var(--ink);
    border:1px solid var(--border);padding:11px 20px;border-radius:24px;font-size:13px;z-index:900;opacity:0;transition:.3s;pointer-events:none;}
  #toast.show{opacity:1;transform:translateX(-50%) translateY(0);}

  @media (max-width:760px){
    :root{--rail-w:84vw;}
    #editor-toolbar{left:10px;}
  }
</style>
</head>
<body>

<div id="topbar">
  <div class="brand" id="brand-home"><span class="dot"></span>环视台 <span style="font-weight:400;color:var(--ink-faint);font-size:12px;">VR全景托管平台</span></div>
  <span class="sync-dot" id="sync-dot" title="实时同步未连接"></span>
  <a href="/index.html" class="btn btn-ghost" style="text-decoration:none;">← 拓荒者足迹</a>
  <div class="sp"></div>
  <button class="btn" id="login-btn" data-login>⚿ 后台管理</button>
</div>

<!-- 作品列表 -->
<div class="view active" id="view-list">
  <div id="list-inner">
    <h1>作品列表</h1>
    <p class="sub">点击作品进入 360° 全景查看；登录主控模式后可以新建作品、上传场景与设置锚点。</p>
    <div id="home-controls">
      <input type="text" id="home-search" placeholder="搜索作品标题…">
      <div class="view-toggle">
        <button id="toggle-list-btn" class="active">▦ 列表</button>
        <button id="toggle-map-btn">🗺 地图</button>
      </div>
    </div>
    <div id="filter-chip"><span id="filter-chip-text"></span><button id="filter-chip-clear">✕ 清除筛选</button></div>
    <div id="works-grid"></div>
    <div id="list-empty">还没有任何作品，登录后台后点击上方"新建作品"开始创作。</div>
    <div id="works-map-wrap">
      <div id="works-map"></div>
      <div id="map-empty-hint">还没有作品设置了地理位置<br>新建作品时可以在小地图上选点</div>
    </div>
  </div>
</div>

<!-- 全景查看 / 编辑器 -->
<div class="view" id="view-viewer">
  <div id="pano-canvas-wrap"></div>
  <div id="pano-loading">加载全景中…</div>

  <div class="compass" id="compass">
    <svg viewBox="0 0 54 54">
      <circle cx="27" cy="27" r="25" fill="none" stroke="#343845" stroke-width="1.5"/>
      <text x="27" y="10" fill="#9498a3" font-size="7" text-anchor="middle" font-family="JetBrains Mono">N</text>
      <g class="needle" id="compass-needle">
        <line x1="27" y1="27" x2="27" y2="9" stroke="#6c6ff0" stroke-width="2.5" stroke-linecap="round"/>
      </g>
      <circle cx="27" cy="27" r="2.5" fill="#6c6ff0"/>
    </svg>
  </div>

  <div class="scene-title-pill" id="scene-title-pill">
    <span id="scene-title-text">场景</span>
    <button class="tour-btn" id="tour-btn">▶ 自动漫游</button>
  </div>

  <div class="hotspot-tooltip" id="hotspot-tooltip">
    <div class="t-title" id="tooltip-title"></div>
    <div class="t-text" id="tooltip-text"></div>
  </div>

  <div id="editor-toolbar" class="hidden">
    <button class="btn" id="back-to-list-btn">← 作品列表</button>
    <label class="btn" for="scene-file-input">+ 添加场景</label>
    <input type="file" id="scene-file-input" accept="image/*,video/*">
    <button class="btn" id="add-hotspot-toggle">⊕ 添加锚点</button>
  </div>

  <button class="btn" id="rail-toggle">☰ 场景与锚点</button>
  <div id="rail">
    <div class="rail-section">
      <h4>场景（拖拽排序 = 漫游路线）</h4>
    </div>
    <ul id="scene-list"></ul>
    <div class="upload-strip" id="editor-upload-strip" style="display:none;">
      <span id="scene-upload-status"></span>
    </div>
    <div class="rail-section" style="padding-top:4px;">
      <h4>当前场景锚点</h4>
    </div>
    <ul id="hotspot-list"></ul>
    <div id="hotspot-empty">点击"添加锚点"后，在全景图上点一下即可放置。</div>
  </div>
</div>

<!-- 锚点编辑小表单 -->
<div id="hotspot-editor">
  <div class="f"><label>类型</label>
    <select id="hs-type">
      <option value="info">信息说明</option>
      <option value="scene">跳转到场景</option>
    </select>
  </div>
  <div class="f" id="hs-title-f"><label>标题</label><input id="hs-title" type="text"></div>
  <div class="f" id="hs-text-f"><label>说明文字</label><textarea id="hs-text"></textarea></div>
  <div class="f" id="hs-target-f" style="display:none;"><label>目标场景</label><select id="hs-target"></select></div>
  <div class="row">
    <button class="btn btn-ghost" id="hs-cancel">取消</button>
    <button class="btn btn-accent" id="hs-save">保存</button>
  </div>
</div>

<!-- 登录弹窗 -->
<div class="overlay" id="login-overlay">
  <div class="modal">
    <h3>主控登录</h3>
    <form id="login-form">
      <div class="field"><label>管理员邮箱</label><input type="email" id="login-email" required autocomplete="username"></div>
      <div class="field"><label>密码</label><input type="password" id="login-pass" required autocomplete="current-password"></div>
      <p class="form-err" id="login-err"></p>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-close-login>取消</button>
        <button type="submit" class="btn btn-accent">登录</button>
      </div>
    </form>
  </div>
</div>

<!-- 新建作品弹窗 -->
<div class="overlay" id="newwork-overlay">
  <div class="modal wide">
    <h3>新建作品</h3>
    <form id="newwork-form">
      <div class="field"><label>作品标题</label><input type="text" id="nw-title" required></div>
      <div class="field"><label>简介（可选）</label><textarea id="nw-desc" rows="2"></textarea></div>
      <div class="field">
        <label>地理位置（可选，用于首页地图模式聚合显示；不设置则只出现在列表里）</label>
        <input type="text" id="nw-location-name" placeholder="地点名称，例如：广东省 汕头市">
        <div id="nw-pick-map"></div>
        <div id="nw-coords">点击上方小地图选择位置<button type="button" id="nw-clear-loc" style="display:none;">清除位置</button></div>
      </div>
      <p class="form-err" id="newwork-err"></p>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-close-newwork>取消</button>
        <button type="submit" class="btn btn-accent">创建并进入编辑</button>
      </div>
    </form>
  </div>
</div>

<div id="toast"></div>

<script src="https://npm.elemecdn.com/@supabase/supabase-js@2.47.3/dist/umd/supabase.js"></script>
<script src="https://cdn.bootcdn.net/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.bootcdn.net/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<script>
/* =========================================================================
   0. 配置
   ========================================================================= */
const SUPABASE_URL = "https://zjtofadvudkfijlpptmb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_QM9V7Vr7MsnW4aqPj1GPGg_1iX6dyRb";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const UPLOAD_LIMITS_MB = { image: 20, video: 200 };
/* 注意：Supabase 项目对单文件大小有全局上限（默认通常 50MB），
   360 视频较大时如果上传失败，去 Dashboard → Storage → Settings 调整。*/

/* =========================================================================
   1. 全局状态
   ========================================================================= */
let adminMode = false;
let works = [];
let currentWorkId = null;
let currentWork = null;
let scenes = [];           // 当前作品的全部场景，按 sort_order 排序
let currentSceneId = null;
let hotspots = [];         // 当前场景的锚点
let addHotspotMode = false;
let tourPlaying = false;
let tourTimer = null;
let suppressRealtimeToastUntil = 0;
function markSelfUpdate(ms = 3000) { suppressRealtimeToastUntil = Date.now() + ms; }

/* =========================================================================
   2. 工具函数
   ========================================================================= */
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2600);
}
function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
}
function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* =========================================================================
   3. 路由（基于 location.hash 的极简路由）
   ========================================================================= */
function go(hash) { location.hash = hash; }
function parseRoute() {
  const h = location.hash.replace(/^#\/?/, "");
  const parts = h.split("/").filter(Boolean);
  if (parts[0] === "work" && parts[1]) return { view: "viewer", workId: Number(parts[1]) };
  return { view: "list" };
}
async function handleRoute() {
  const r = parseRoute();
  if (r.view === "viewer") {
    await enterViewer(r.workId);
  } else {
    enterList();
  }
}
window.addEventListener("hashchange", handleRoute);
document.getElementById("brand-home").addEventListener("click", () => go("#/"));
document.getElementById("back-to-list-btn").addEventListener("click", () => go("#/"));

function showView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === id));
}

/* =========================================================================
   4. 作品列表（含搜索 / 列表-地图切换 / 地图聚合下钻）
   ========================================================================= */
let sceneCounts = {};
let homeViewMode = "list";       // "list" | "map"
let workSearchTerm = "";
let clusterFilterIds = null;     // 非 null 时：地图下钻后筛选的作品 id 数组

async function fetchWorks() {
  const { data, error } = await sb.from("vr_works").select("*").order("created_at", { ascending: false });
  if (error) { toast("读取作品列表失败：" + error.message); return []; }
  return data || [];
}
async function fetchSceneCounts(workIds) {
  if (!workIds.length) return {};
  const { data, error } = await sb.from("vr_scenes").select("work_id");
  if (error) return {};
  const counts = {};
  (data || []).forEach(r => { counts[r.work_id] = (counts[r.work_id] || 0) + 1; });
  return counts;
}
async function enterList() {
  destroyEngine();
  stopTour();
  showView("view-list");
  works = await fetchWorks();
  sceneCounts = await fetchSceneCounts(works.map(w => w.id));
  clusterFilterIds = null;
  renderHomeView();
}

function getFilteredWorks() {
  let list = works;
  if (workSearchTerm) {
    const q = workSearchTerm.toLowerCase();
    list = list.filter(w => (w.title || "").toLowerCase().includes(q));
  }
  if (clusterFilterIds) {
    const idSet = new Set(clusterFilterIds);
    list = list.filter(w => idSet.has(w.id));
  }
  return list;
}

function renderHomeView() {
  const filtered = getFilteredWorks();
  document.getElementById("toggle-list-btn").classList.toggle("active", homeViewMode === "list");
  document.getElementById("toggle-map-btn").classList.toggle("active", homeViewMode === "map");
  document.getElementById("works-grid").style.display = homeViewMode === "list" ? "grid" : "none";
  document.getElementById("works-map-wrap").classList.toggle("show", homeViewMode === "map");

  const chip = document.getElementById("filter-chip");
  if (clusterFilterIds) {
    chip.classList.add("show");
    document.getElementById("filter-chip-text").textContent = `已按地图区域筛选：${filtered.length} 个作品`;
  } else {
    chip.classList.remove("show");
  }

  if (homeViewMode === "list") {
    renderWorksGrid(filtered);
  } else {
    renderWorksMap(filtered);
  }
}

function renderWorksGrid(list) {
  const grid = document.getElementById("works-grid");
  const emptyEl = document.getElementById("list-empty");
  let html = "";
  if (adminMode) {
    html += `<div class="new-work-card" id="new-work-card"><div class="plus">＋</div><div>新建作品</div></div>`;
  }
  list.forEach(w => {
    const cnt = sceneCounts[w.id] || 0;
    const locBit = w.location_name ? ` · ${escapeHtml(w.location_name)}` : "";
    html += `<div class="work-card" data-id="${w.id}">
      ${w.cover ? `<img class="cover" src="${w.cover}" alt="${escapeHtml(w.title)}">` : `<div class="cover"></div>`}
      <div class="body">
        <div class="title">${escapeHtml(w.title)}</div>
        <div class="meta">${cnt} 个场景 · ${fmtDate(w.created_at)}${locBit}</div>
      </div>
      ${adminMode ? `<div class="btn-danger" data-del="${w.id}" style="margin:0 14px 12px;text-align:center;padding:6px;border-radius:7px;font-size:11.5px;cursor:pointer;">删除作品</div>` : ""}
    </div>`;
  });
  grid.innerHTML = html;
  if (list.length === 0) {
    emptyEl.style.display = "block";
    emptyEl.textContent = (workSearchTerm || clusterFilterIds) ? "没有找到匹配的作品" : "还没有任何作品，登录后台后点击上方“新建作品”开始创作。";
  } else {
    emptyEl.style.display = "none";
  }
  const newCard = document.getElementById("new-work-card");
  if (newCard) newCard.addEventListener("click", () => openNewWorkModal());
  grid.querySelectorAll(".work-card").forEach(card => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-del]")) return;
      go(`#/work/${card.dataset.id}`);
    });
  });
  grid.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm("删除整个作品及其所有场景与锚点？此操作不可恢复。")) return;
      const id = Number(btn.dataset.del);
      const { error } = await sb.from("vr_works").delete().eq("id", id);
      if (error) { toast("删除失败：" + error.message); return; }
      toast("作品已删除");
      works = await fetchWorks();
      sceneCounts = await fetchSceneCounts(works.map(w => w.id));
      renderHomeView();
    });
  });
}

document.getElementById("home-search").addEventListener("input", (e) => {
  workSearchTerm = e.target.value.trim();
  renderHomeView();
});
document.getElementById("toggle-list-btn").addEventListener("click", () => { homeViewMode = "list"; renderHomeView(); });
document.getElementById("toggle-map-btn").addEventListener("click", () => {
  homeViewMode = "map";
  renderHomeView();
});
document.getElementById("filter-chip-clear").addEventListener("click", () => {
  clusterFilterIds = null;
  homeViewMode = "list";
  renderHomeView();
});

function openNewWorkModal() {
  document.getElementById("newwork-overlay").classList.add("show");
  document.getElementById("newwork-form").reset();
  document.getElementById("newwork-err").textContent = "";
  clearNwLocation();
  setTimeout(initNwPickMap, 60);
}

document.getElementById("newwork-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = document.getElementById("newwork-err");
  const title = document.getElementById("nw-title").value.trim();
  const desc = document.getElementById("nw-desc").value.trim();
  const locName = document.getElementById("nw-location-name").value.trim();
  if (!title) { errEl.textContent = "请输入标题"; return; }
  const payload = { title, description: desc };
  if (nwPickedLatLng) { payload.lat = nwPickedLatLng.lat; payload.lng = nwPickedLatLng.lng; }
  if (locName) { payload.location_name = locName; }
  const { data, error } = await sb.from("vr_works").insert(payload).select().single();
  if (error) { errEl.textContent = "创建失败：" + error.message; return; }
  document.getElementById("newwork-overlay").classList.remove("show");
  document.getElementById("newwork-form").reset();
  toast("作品已创建，开始添加第一个场景吧");
  go(`#/work/${data.id}`);
});
document.querySelectorAll("[data-close-newwork]").forEach(b => b.addEventListener("click", () => {
  document.getElementById("newwork-overlay").classList.remove("show");
}));

/* ---- 新建作品弹窗内的小地图选点（点击即放置标记，可清除） ---- */
let nwPickMap = null, nwPickMarker = null, nwPickedLatLng = null;
function initNwPickMap() {
  if (nwPickMap) { nwPickMap.invalidateSize(); return; }
  nwPickMap = L.map("nw-pick-map", { zoomControl: false, attributionControl: false }).setView([34.5, 108.5], 3.3);
  L.tileLayer("https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}", {
    subdomains: ["1","2","3","4"], maxZoom: 18, minZoom: 2
  }).addTo(nwPickMap);
  nwPickMap.on("click", (e) => {
    nwPickedLatLng = e.latlng;
    if (nwPickMarker) { nwPickMarker.setLatLng(e.latlng); }
    else { nwPickMarker = L.marker(e.latlng).addTo(nwPickMap); }
    document.getElementById("nw-coords").innerHTML =
      `已选：${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)} <button type="button" id="nw-clear-loc">清除位置</button>`;
    document.getElementById("nw-clear-loc").addEventListener("click", clearNwLocation);
  });
}
function clearNwLocation() {
  nwPickedLatLng = null;
  if (nwPickMarker && nwPickMap) { nwPickMap.removeLayer(nwPickMarker); nwPickMarker = null; }
  const coordsEl = document.getElementById("nw-coords");
  if (coordsEl) coordsEl.innerHTML = "点击上方小地图选择位置";
}

/* ---- 首页地图模式：按网格聚合 + 气泡点击下钻到列表 ---- */
let worksMap = null, worksMapLayer = null;
function initWorksMap() {
  if (worksMap) return;
  worksMap = L.map("works-map", { zoomControl: true, attributionControl: false }).setView([34.5, 108.5], 4);
  L.tileLayer("https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}", {
    subdomains: ["1","2","3","4"], maxZoom: 18, minZoom: 2
  }).addTo(worksMap);
  worksMapLayer = L.layerGroup().addTo(worksMap);
  worksMap.on("moveend zoomend", () => renderClusters(getFilteredWorks()));
}
function cellSizeForZoom(zoom) {
  if (zoom <= 4) return 8;
  if (zoom <= 6) return 4;
  if (zoom <= 8) return 2;
  if (zoom <= 10) return 1;
  return 0.4;
}
function buildClusters(list, zoom) {
  const cell = cellSizeForZoom(zoom);
  const groups = {};
  list.forEach(w => {
    if (w.lat == null || w.lng == null) return;
    const key = Math.floor(w.lat / cell) + "_" + Math.floor(w.lng / cell);
    if (!groups[key]) groups[key] = [];
    groups[key].push(w);
  });
  return Object.values(groups).map(group => {
    const lat = group.reduce((s, w) => s + w.lat, 0) / group.length;
    const lng = group.reduce((s, w) => s + w.lng, 0) / group.length;
    return { lat, lng, items: group };
  });
}
function renderWorksMap(list) {
  initWorksMap();
  setTimeout(() => worksMap.invalidateSize(), 30);
  renderClusters(list);
}
function renderClusters(list) {
  if (!worksMap) return;
  worksMapLayer.clearLayers();
  const withLoc = list.filter(w => w.lat != null && w.lng != null);
  document.getElementById("map-empty-hint").classList.toggle("show", withLoc.length === 0);
  if (!withLoc.length) return;
  const clusters = buildClusters(withLoc, worksMap.getZoom());
  clusters.forEach(c => {
    const count = c.items.length;
    const size = count === 1 ? 30 : Math.min(64, 36 + Math.sqrt(count) * 8);
    const icon = L.divIcon({
      className: "",
      html: `<div class="cluster-bubble ${count === 1 ? 'single' : ''}" style="width:${size}px;height:${size}px;font-size:${count === 1 ? '16' : '13'}px;">${count === 1 ? '●' : count}</div>`,
      iconSize: [size, size], iconAnchor: [size / 2, size / 2]
    });
    const marker = L.marker([c.lat, c.lng], { icon }).addTo(worksMapLayer);
    marker.on("click", () => {
      if (count === 1) {
        go(`#/work/${c.items[0].id}`);
      } else {
        clusterFilterIds = c.items.map(w => w.id);
        homeViewMode = "list";
        renderHomeView();
      }
    });
  });
}

/* =========================================================================
   5. 全景渲染引擎（Three.js：图片与视频统一走球体+精灵锚点）
   ========================================================================= */
let renderer, scene3d, camera, sphereMesh, currentTexture, currentVideoEl;
let lon = 0, lat = 0, targetFov = 90;
let isDragging = false, dragStart = { x: 0, y: 0, lon: 0, lat: 0 }, dragMoved = 0;
let lastInteraction = Date.now();
let spriteGroup = [];
const raycaster = new THREE.Raycaster();
const hotspotTexCache = {};
let animFrameId = null;

function initEngineOnce() {
  if (renderer) return;
  const wrap = document.getElementById("pano-canvas-wrap");
  scene3d = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(targetFov, wrap.clientWidth / wrap.clientHeight, 0.1, 1200);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);
  wrap.appendChild(renderer.domElement);

  const geo = new THREE.SphereGeometry(500, 60, 40);
  geo.scale(-1, 1, 1);
  sphereMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x111318 }));
  scene3d.add(sphereMesh);

  const canvas = renderer.domElement;
  canvas.style.cursor = "grab";
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("resize", onResize);

  animate();
}
function onResize() {
  if (!renderer) return;
  const wrap = document.getElementById("pano-canvas-wrap");
  if (!wrap.clientWidth || !wrap.clientHeight) return;
  camera.aspect = wrap.clientWidth / wrap.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);
}

function disposeCurrentMedia() {
  if (currentVideoEl) { currentVideoEl.pause(); currentVideoEl.src = ""; currentVideoEl.remove(); currentVideoEl = null; }
  if (currentTexture) { currentTexture.dispose(); currentTexture = null; }
}

function loadSceneMedia(sceneRec) {
  disposeCurrentMedia();
  document.getElementById("pano-loading").classList.remove("hide");
  if (sceneRec.media_type === "video") {
    const video = document.createElement("video");
    video.src = sceneRec.media_url;
    video.crossOrigin = "anonymous";
    video.loop = true; video.muted = true; video.playsInline = true; video.autoplay = true;
    video.style.display = "none";
    document.body.appendChild(video);
    currentVideoEl = video;
    const tex = new THREE.VideoTexture(video);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    currentTexture = tex;
    sphereMesh.material.map = tex;
    sphereMesh.material.color.set(0xffffff);
    sphereMesh.material.needsUpdate = true;
    video.play().catch(() => {});
    document.getElementById("pano-loading").classList.add("hide");
  } else {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(sceneRec.media_url, (tex) => {
      currentTexture = tex;
      sphereMesh.material.map = tex;
      sphereMesh.material.color.set(0xffffff);
      sphereMesh.material.needsUpdate = true;
      document.getElementById("pano-loading").classList.add("hide");
    }, undefined, () => {
      document.getElementById("pano-loading").classList.add("hide");
      toast("场景媒体加载失败，请检查链接");
    });
  }
  lon = sceneRec.yaw || 0;
  lat = sceneRec.pitch || 0;
  targetFov = sceneRec.fov || 90;
  camera.fov = targetFov;
  camera.updateProjectionMatrix();
}

function sphericalToVec3(yawDeg, pitchDeg, radius) {
  const phi = THREE.MathUtils.degToRad(90 - pitchDeg);
  const theta = THREE.MathUtils.degToRad(yawDeg);
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}
function vec3ToSpherical(p) {
  const r = p.length();
  const phi = Math.acos(THREE.MathUtils.clamp(p.y / r, -1, 1));
  const theta = Math.atan2(p.z, p.x);
  return { yaw: THREE.MathUtils.radToDeg(theta), pitch: 90 - THREE.MathUtils.radToDeg(phi) };
}

function makeHotspotTexture(type) {
  if (hotspotTexCache[type]) return hotspotTexCache[type];
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const ctx = c.getContext("2d");
  const color = type === "scene" ? "#6c6ff0" : "#e0a23c";
  ctx.beginPath(); ctx.arc(64, 64, 50, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(13,14,18,0.55)"; ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = color; ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "bold 56px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(type === "scene" ? "\u279c" : "i", 64, 70);
  const tex = new THREE.CanvasTexture(c);
  hotspotTexCache[type] = tex;
  return tex;
}

function clearSprites() {
  spriteGroup.forEach(s => scene3d.remove(s));
  spriteGroup = [];
}
function buildSprites(hsList) {
  clearSprites();
  hsList.forEach(h => {
    const mat = new THREE.SpriteMaterial({ map: makeHotspotTexture(h.type), depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(mat);
    const pos = sphericalToVec3(h.yaw, h.pitch, 480);
    sprite.position.copy(pos);
    sprite.scale.set(26, 26, 1);
    sprite.userData.hotspot = h;
    scene3d.add(sprite);
    spriteGroup.push(sprite);
  });
}

function animate() {
  animFrameId = requestAnimationFrame(animate);
  if (!isDragging && !addHotspotMode && Date.now() - lastInteraction > 4000) {
    lon += 0.02;
  }
  const target = sphericalToVec3(lon, lat, 100);
  camera.lookAt(target);
  const needle = document.getElementById("compass-needle");
  if (needle) needle.setAttribute("transform", `rotate(${-lon} 27 27)`);
  renderer.render(scene3d, camera);
}

function onPointerDown(e) {
  isDragging = true; dragMoved = 0;
  dragStart = { x: e.clientX, y: e.clientY, lon, lat };
  lastInteraction = Date.now();
  renderer.domElement.style.cursor = "grabbing";
}
function onPointerMove(e) {
  hoverCheck(e);
  if (!isDragging) return;
  const dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
  dragMoved = Math.max(dragMoved, Math.abs(dx) + Math.abs(dy));
  lon = dragStart.lon - dx * 0.15;
  lat = THREE.MathUtils.clamp(dragStart.lat + dy * 0.15, -85, 85);
  lastInteraction = Date.now();
}
function onPointerUp(e) {
  if (!isDragging) return;
  isDragging = false;
  if (renderer) renderer.domElement.style.cursor = "grab";
  if (dragMoved < 6) handleClick(e);
}
function onWheel(e) {
  e.preventDefault();
  camera.fov = THREE.MathUtils.clamp(camera.fov + e.deltaY * 0.04, 30, 100);
  camera.updateProjectionMatrix();
  lastInteraction = Date.now();
}

function pointerToNdc(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  return new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
}

function hoverCheck(e) {
  const tooltip = document.getElementById("hotspot-tooltip");
  if (addHotspotMode || !renderer) { tooltip.classList.remove("show"); return; }
  raycaster.setFromCamera(pointerToNdc(e), camera);
  const hits = raycaster.intersectObjects(spriteGroup);
  if (hits.length) {
    const h = hits[0].object.userData.hotspot;
    document.getElementById("tooltip-title").textContent = h.title || (h.type === "scene" ? "前往场景" : "");
    document.getElementById("tooltip-text").textContent = h.text || "";
    tooltip.style.left = (e.clientX + 16) + "px";
    tooltip.style.top = (e.clientY + 10) + "px";
    tooltip.classList.add("show");
    renderer.domElement.style.cursor = "pointer";
  } else {
    tooltip.classList.remove("show");
    renderer.domElement.style.cursor = isDragging ? "grabbing" : "grab";
  }
}

function handleClick(e) {
  if (addHotspotMode) {
    if (!adminMode) return;
    raycaster.setFromCamera(pointerToNdc(e), camera);
    const hit = raycaster.intersectObject(sphereMesh)[0];
    if (!hit) return;
    const { yaw, pitch } = vec3ToSpherical(hit.point);
    openHotspotEditor(e.clientX, e.clientY, { yaw, pitch });
    return;
  }
  raycaster.setFromCamera(pointerToNdc(e), camera);
  const hits = raycaster.intersectObjects(spriteGroup);
  if (!hits.length) return;
  const h = hits[0].object.userData.hotspot;
  if (h.type === "scene" && h.target_scene_id) {
    stopTour();
    loadScene(h.target_scene_id);
  } else {
    document.getElementById("tooltip-title").textContent = h.title || "信息";
    document.getElementById("tooltip-text").textContent = h.text || "";
    const tooltip = document.getElementById("hotspot-tooltip");
    tooltip.style.left = (e.clientX + 16) + "px";
    tooltip.style.top = (e.clientY + 10) + "px";
    tooltip.classList.add("show");
    setTimeout(() => tooltip.classList.remove("show"), 3200);
  }
}

function destroyEngine() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = null;
  disposeCurrentMedia();
  clearSprites();
  if (renderer) {
    renderer.dispose();
    const wrap = document.getElementById("pano-canvas-wrap");
    if (wrap) wrap.innerHTML = "";
    renderer = null; scene3d = null; camera = null; sphereMesh = null;
  }
}

/* =========================================================================
   6. 作品查看器：场景与锚点的数据加载与渲染
   ========================================================================= */
async function fetchScenesForWork(workId) {
  const { data, error } = await sb.from("vr_scenes").select("*").eq("work_id", workId).order("sort_order", { ascending: true });
  if (error) { toast("读取场景失败：" + error.message); return []; }
  return data || [];
}
async function fetchHotspotsForScene(sceneId) {
  const { data, error } = await sb.from("vr_hotspots").select("*").eq("scene_id", sceneId);
  if (error) { toast("读取锚点失败：" + error.message); return []; }
  return data || [];
}

async function enterViewer(workId) {
  stopTour();
  showView("view-viewer");
  initEngineOnce();
  currentWorkId = workId;
  const { data: workData, error: werr } = await sb.from("vr_works").select("*").eq("id", workId).single();
  if (werr || !workData) { toast("作品不存在或已被删除"); go("#/"); return; }
  currentWork = workData;
  scenes = await fetchScenesForWork(workId);
  document.getElementById("editor-toolbar").classList.toggle("hidden", !adminMode);
  document.getElementById("editor-upload-strip").style.display = adminMode ? "flex" : "none";
  renderSceneList();
  if (!scenes.length) {
    currentSceneId = null; hotspots = []; clearSprites();
    document.getElementById("scene-title-text").textContent = currentWork.title;
    document.getElementById("pano-loading").textContent = adminMode ? "还没有场景，点击左上角“+ 添加场景”上传第一张全景图或视频" : "该作品暂无场景";
    document.getElementById("pano-loading").classList.remove("hide");
    renderHotspotList();
    return;
  }
  await loadScene(scenes[0].id, true);
}

async function loadScene(sceneId, fromTour) {
  const rec = scenes.find(s => s.id === sceneId);
  if (!rec) return;
  currentSceneId = sceneId;
  setAddHotspotMode(false);
  loadSceneMedia(rec);
  document.getElementById("scene-title-text").textContent = rec.name;
  hotspots = await fetchHotspotsForScene(sceneId);
  buildSprites(hotspots);
  renderSceneList();
  renderHotspotList();
}

let dragSrcSceneId = null;
function renderSceneList() {
  const ul = document.getElementById("scene-list");
  ul.innerHTML = scenes.map(s => `
    <li data-id="${s.id}" class="${s.id === currentSceneId ? 'active' : ''}" ${adminMode ? 'draggable="true"' : ''}>
      <span class="stype">${s.media_type === 'video' ? '视' : '图'}</span>
      <span class="sname">${escapeHtml(s.name)}</span>
      ${adminMode ? `<span class="sdel" data-sdel="${s.id}">✕</span>` : ''}
    </li>`).join("");
  ul.querySelectorAll("li").forEach(li => {
    li.addEventListener("click", (e) => {
      if (e.target.closest("[data-sdel]")) return;
      stopTour();
      loadScene(Number(li.dataset.id));
    });
    if (adminMode) {
      li.addEventListener("dragstart", () => { dragSrcSceneId = Number(li.dataset.id); li.classList.add("dragging"); });
      li.addEventListener("dragend", () => li.classList.remove("dragging"));
      li.addEventListener("dragover", (e) => { e.preventDefault(); li.classList.add("drag-over"); });
      li.addEventListener("dragleave", () => li.classList.remove("drag-over"));
      li.addEventListener("drop", (e) => { e.preventDefault(); li.classList.remove("drag-over"); reorderScenes(dragSrcSceneId, Number(li.dataset.id)); });
    }
  });
  ul.querySelectorAll("[data-sdel]").forEach(btn => btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!confirm("删除该场景及其所有锚点？")) return;
    const id = Number(btn.dataset.sdel);
    const { error } = await sb.from("vr_scenes").delete().eq("id", id);
    if (error) { toast("删除失败：" + error.message); return; }
    toast("场景已删除");
    scenes = await fetchScenesForWork(currentWorkId);
    if (currentSceneId === id) {
      if (scenes.length) { await loadScene(scenes[0].id); }
      else {
        currentSceneId = null; hotspots = []; clearSprites();
        renderHotspotList(); renderSceneList();
        document.getElementById("pano-loading").textContent = "该作品暂无场景";
        document.getElementById("pano-loading").classList.remove("hide");
      }
    } else { renderSceneList(); }
  }));
}

async function reorderScenes(srcId, targetId) {
  if (!srcId || srcId === targetId) return;
  const srcIdx = scenes.findIndex(s => s.id === srcId);
  const tgtIdx = scenes.findIndex(s => s.id === targetId);
  if (srcIdx < 0 || tgtIdx < 0) return;
  const [moved] = scenes.splice(srcIdx, 1);
  scenes.splice(tgtIdx, 0, moved);
  scenes.forEach((s, i) => { s.sort_order = i + 1; });
  renderSceneList();
  markSelfUpdate();
  await Promise.all(scenes.map(s => sb.from("vr_scenes").update({ sort_order: s.sort_order }).eq("id", s.id)));
  toast("漫游顺序已更新");
}

function renderHotspotList() {
  const ul = document.getElementById("hotspot-list");
  const empty = document.getElementById("hotspot-empty");
  ul.innerHTML = hotspots.map(h => `
    <li data-id="${h.id}">
      <span class="htag ${h.type}">${h.type === 'scene' ? '跳转' : '信息'}</span>
      <span class="hname">${escapeHtml(h.title || h.text || '未命名锚点')}</span>
      ${adminMode ? `<span class="hdel" data-hdel="${h.id}">✕</span>` : ''}
    </li>`).join("");
  empty.style.display = hotspots.length ? "none" : "block";
  ul.querySelectorAll("li").forEach(li => li.addEventListener("click", (e) => {
    if (e.target.closest("[data-hdel]")) return;
    const h = hotspots.find(x => x.id === Number(li.dataset.id));
    if (h) { lon = h.yaw; lat = h.pitch; lastInteraction = Date.now(); }
  }));
  ul.querySelectorAll("[data-hdel]").forEach(btn => btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!confirm("删除该锚点？")) return;
    const id = Number(btn.dataset.hdel);
    const { error } = await sb.from("vr_hotspots").delete().eq("id", id);
    if (error) { toast("删除失败：" + error.message); return; }
    hotspots = await fetchHotspotsForScene(currentSceneId);
    buildSprites(hotspots);
    renderHotspotList();
  }));
}

/* =========================================================================
   7. 自动漫游（按场景顺序定时切换，作为"路线漫游"的轻量实现）
   ========================================================================= */
function startTour() {
  if (!scenes.length) return;
  tourPlaying = true;
  document.getElementById("tour-btn").textContent = "■ 停止漫游";
  const stepTour = async () => {
    if (!tourPlaying) return;
    const idx = scenes.findIndex(s => s.id === currentSceneId);
    const next = scenes[(idx + 1) % scenes.length];
    await loadScene(next.id);
    tourTimer = setTimeout(stepTour, 6000);
  };
  tourTimer = setTimeout(stepTour, 6000);
}
function stopTour() {
  tourPlaying = false;
  clearTimeout(tourTimer);
  const btn = document.getElementById("tour-btn");
  if (btn) btn.textContent = "▶ 自动漫游";
}
document.getElementById("tour-btn").addEventListener("click", () => {
  if (tourPlaying) stopTour(); else startTour();
});

/* =========================================================================
   8. 锚点编辑表单（点击全景图后弹出的小卡片）
   ========================================================================= */
let pendingHotspotPos = null;
function openHotspotEditor(clientX, clientY, pos) {
  pendingHotspotPos = pos;
  const editor = document.getElementById("hotspot-editor");
  document.getElementById("hs-type").value = "info";
  document.getElementById("hs-title").value = "";
  document.getElementById("hs-text").value = "";
  toggleHsFields();
  const targetSel = document.getElementById("hs-target");
  targetSel.innerHTML = scenes.filter(s => s.id !== currentSceneId)
    .map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("");
  const maxLeft = window.innerWidth - 260, maxTop = window.innerHeight - 260;
  editor.style.left = Math.min(clientX, maxLeft) + "px";
  editor.style.top = Math.min(clientY, maxTop) + "px";
  editor.classList.add("show");
}
function toggleHsFields() {
  const type = document.getElementById("hs-type").value;
  document.getElementById("hs-target-f").style.display = type === "scene" ? "block" : "none";
  document.getElementById("hs-text-f").style.display = type === "info" ? "block" : "none";
}
document.getElementById("hs-type").addEventListener("change", toggleHsFields);
document.getElementById("hs-cancel").addEventListener("click", () => {
  document.getElementById("hotspot-editor").classList.remove("show");
  pendingHotspotPos = null;
});
document.getElementById("hs-save").addEventListener("click", async () => {
  if (!pendingHotspotPos || !currentSceneId) return;
  const type = document.getElementById("hs-type").value;
  const title = document.getElementById("hs-title").value.trim();
  const text = document.getElementById("hs-text").value.trim();
  const targetId = document.getElementById("hs-target").value;
  if (type === "scene" && !targetId) { toast("请选择目标场景"); return; }
  const payload = {
    scene_id: currentSceneId,
    yaw: pendingHotspotPos.yaw,
    pitch: pendingHotspotPos.pitch,
    type,
    title: title || null,
    text: type === "info" ? (text || null) : null,
    target_scene_id: type === "scene" ? Number(targetId) : null
  };
  markSelfUpdate();
  const { error } = await sb.from("vr_hotspots").insert(payload);
  if (error) { toast("锚点保存失败：" + error.message); return; }
  document.getElementById("hotspot-editor").classList.remove("show");
  pendingHotspotPos = null;
  toast("锚点已添加");
  hotspots = await fetchHotspotsForScene(currentSceneId);
  buildSprites(hotspots);
  renderHotspotList();
  setAddHotspotMode(false);
});

function setAddHotspotMode(on) {
  addHotspotMode = on;
  const btn = document.getElementById("add-hotspot-toggle");
  btn.classList.toggle("on", on);
  btn.textContent = on ? "● 点击全景图放置锚点" : "⊕ 添加锚点";
  if (renderer) renderer.domElement.style.cursor = on ? "crosshair" : "grab";
}
document.getElementById("add-hotspot-toggle").addEventListener("click", () => {
  if (!adminMode) return;
  setAddHotspotMode(!addHotspotMode);
});

/* =========================================================================
   9. 场景上传（图片 / 360 视频 → Supabase Storage → 写入 vr_scenes）
   ========================================================================= */
async function uploadToVrMedia(file, folder) {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${folder}/${Date.now()}_${safeName}`;
  const { error } = await sb.storage.from("vr-media").upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) return { error: error.message };
  const { data } = sb.storage.from("vr-media").getPublicUrl(path);
  return { url: data.publicUrl };
}
document.getElementById("scene-file-input").addEventListener("change", async () => {
  const input = document.getElementById("scene-file-input");
  const file = input.files[0];
  if (!file || !currentWorkId) return;
  const isVideo = file.type.startsWith("video/");
  const limit = isVideo ? UPLOAD_LIMITS_MB.video : UPLOAD_LIMITS_MB.image;
  const statusEl = document.getElementById("scene-upload-status");
  if (file.size > limit * 1024 * 1024) {
    statusEl.textContent = `文件过大，上限 ${limit}MB`;
    statusEl.className = "err";
    input.value = ""; return;
  }
  statusEl.textContent = "上传中…"; statusEl.className = "";
  const { url, error } = await uploadToVrMedia(file, isVideo ? "video" : "image");
  if (error) { statusEl.textContent = "上传失败：" + error; statusEl.className = "err"; input.value = ""; return; }
  const nextOrder = scenes.length ? Math.max(...scenes.map(s => s.sort_order)) + 1 : 1;
  const name = file.name.replace(/\.[^.]+$/, "") || `场景 ${nextOrder}`;
  markSelfUpdate();
  const { data, error: insErr } = await sb.from("vr_scenes").insert({
    work_id: currentWorkId, name, media_type: isVideo ? "video" : "image",
    media_url: url, yaw: 0, pitch: 0, fov: 90, sort_order: nextOrder
  }).select().single();
  if (insErr) { statusEl.textContent = "写入失败：" + insErr.message; statusEl.className = "err"; input.value = ""; return; }
  statusEl.textContent = "已上传 ✓ " + file.name; statusEl.className = "ok";
  input.value = "";
  scenes = await fetchScenesForWork(currentWorkId);
  if (!currentWork.cover && !isVideo) {
    currentWork.cover = url;
    await sb.from("vr_works").update({ cover: url }).eq("id", currentWorkId);
  }
  await loadScene(data.id);
});

/* =========================================================================
   10. 登录 / 主控模式
   ========================================================================= */
const loginOverlay = document.getElementById("login-overlay");
document.getElementById("login-btn").addEventListener("click", () => {
  if (adminMode) { doLogout(); return; }
  document.getElementById("login-err").textContent = "";
  loginOverlay.classList.add("show");
});
document.querySelectorAll("[data-close-login]").forEach(b => b.addEventListener("click", () => loginOverlay.classList.remove("show")));

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-pass").value;
  const errEl = document.getElementById("login-err");
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) { errEl.textContent = "登录失败：" + error.message; return; }
  loginOverlay.classList.remove("show");
  document.getElementById("login-form").reset();
  await setAdminMode(true);
  toast("已进入主控模式 ⚡");
});

async function doLogout() {
  await sb.auth.signOut();
  await setAdminMode(false);
  toast("已退出主控模式");
}

async function setAdminMode(on) {
  adminMode = on;
  const btn = document.getElementById("login-btn");
  btn.classList.toggle("admin-on", on);
  btn.textContent = on ? "⚡ 主控中" : "⚿ 后台管理";
  if (!on) { setAddHotspotMode(false); }
  // 重新渲染当前视图以显示/隐藏管理控件
  const r = parseRoute();
  if (r.view === "viewer" && currentWorkId) {
    document.getElementById("editor-toolbar").classList.toggle("hidden", !adminMode);
    document.getElementById("editor-upload-strip").style.display = adminMode ? "flex" : "none";
    renderSceneList();
    renderHotspotList();
  } else {
    works = await fetchWorks();
    sceneCounts = await fetchSceneCounts(works.map(w => w.id));
    renderHomeView();
  }
}

/* =========================================================================
   11. 右侧抽屉开关
   ========================================================================= */
document.getElementById("rail-toggle").addEventListener("click", () => {
  document.getElementById("rail").classList.toggle("open");
});

/* =========================================================================
   12. Realtime（作品/场景/锚点变化时跨终端同步）
   ========================================================================= */
function subscribeRealtime() {
  const dot = document.getElementById("sync-dot");
  const refreshCurrent = async () => {
    if (Date.now() < suppressRealtimeToastUntil) {
      // 自己刚操作过，静默刷新即可
    } else {
      toast("数据已实时更新");
    }
    const r = parseRoute();
    if (r.view === "viewer" && currentWorkId) {
      scenes = await fetchScenesForWork(currentWorkId);
      renderSceneList();
      if (currentSceneId) {
        hotspots = await fetchHotspotsForScene(currentSceneId);
        buildSprites(hotspots);
        renderHotspotList();
      }
    } else {
      works = await fetchWorks();
      sceneCounts = await fetchSceneCounts(works.map(w => w.id));
      renderHomeView();
    }
  };
  sb.channel("vr-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "vr_works" }, refreshCurrent)
    .on("postgres_changes", { event: "*", schema: "public", table: "vr_scenes" }, refreshCurrent)
    .on("postgres_changes", { event: "*", schema: "public", table: "vr_hotspots" }, refreshCurrent)
    .subscribe((status) => {
      const live = status === "SUBSCRIBED";
      dot.classList.toggle("live", live);
      dot.title = live ? "实时同步中" : "实时同步未连接";
    });
}

/* =========================================================================
   13. 启动
   ========================================================================= */
(async function init() {
  const { data } = await sb.auth.getSession();
  if (data && data.session) { adminMode = true; document.getElementById("login-btn").classList.add("admin-on"); document.getElementById("login-btn").textContent = "⚡ 主控中"; }
  subscribeRealtime();
  await handleRoute();
})();

</script>
</body>
</html>
