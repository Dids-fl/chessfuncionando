// Injeta o botão "Revisão Lance Certo" nas páginas de partida do chess.com e abre o painel de revisão.
(() => {
  if (window.__lanceCerto) return;
  window.__lanceCerto = true;

  const GAME_RE = /\/game\/(?:(live|daily|computer)\/)?(\d+)/;
  const LABEL_RE = /^(game review|review|revis[aã]o( da| de)? partida|revisar( partida)?|analy[sz]e|analis(ar|e)( partida)?)$/i;
  const EXT_ORIGIN = new URL(chrome.runtime.getURL('')).origin;

  function gameInfo() {
    let id = null, type = null;
    const m = location.pathname.match(GAME_RE);
    if (m) { id = m[2]; type = m[1] || 'live'; }
    if (!id) {
      // Ex.: modal de fim de partida com link para a página do jogo
      const links = [...document.querySelectorAll('a[href*="/game/"]')].map((a) => (a.getAttribute('href') || '').match(GAME_RE)).filter(Boolean);
      if (links.length) { const l = links[links.length - 1]; id = l[2]; type = l[1] || 'live'; }
    }
    const users = [];
    const add = (name) => { name = (name || '').trim().toLowerCase(); if (/^[a-z0-9_-]{3,25}$/.test(name) && !users.includes(name)) users.push(name); };
    document.querySelectorAll('[data-test-element="user-tagline-username"], .user-tagline-username, .cc-user-username-component').forEach((el) => add(el.textContent));
    document.querySelectorAll('.board-layout-top a[href*="/member/"], .board-layout-bottom a[href*="/member/"], [class*="player"] a[href*="/member/"]').forEach((a) => add((a.getAttribute('href').match(/\/member\/([\w-]+)/) || [])[1]));
    // Lado do jogador: o site mostra o tabuleiro invertido ("flipped") quando você joga de pretas,
    // e o seu nome fica na barra de baixo
    const board = document.querySelector('wc-chess-board#board-single, wc-chess-board, chess-board');
    const orientation = board && board.classList.contains('flipped') ? 'b' : 'w';
    const bottom = document.querySelector('#board-layout-player-bottom, .board-layout-bottom, .player-bottom');
    let me = null;
    if (bottom) {
      const el = bottom.querySelector('[data-test-element="user-tagline-username"], .user-tagline-username, .cc-user-username-component, a[href*="/member/"]');
      const href = el && el.getAttribute('href');
      me = ((href && (href.match(/\/member\/([\w-]+)/) || [])[1]) || (el && el.textContent) || '').trim().toLowerCase() || null;
      if (me && !/^[a-z0-9_-]{3,25}$/.test(me)) me = null;
      if (me && !users.includes(me)) users.unshift(me);
    }
    return { id, type, users: users.slice(0, 6), url: location.href, orientation, me, theme: siteTheme(board) };
  }

  // Tema do site (peças e tabuleiro que o seu navegador já carrega), para usar no overlay
  function siteTheme(board) {
    if (!board) return null;
    let pieces = null, boardImg = null;
    const urlOf = (el) => { const m = el && getComputedStyle(el).backgroundImage.match(/url\(["']?(https:[^"')]+)["']?\)/); return m ? m[1] : null; };
    for (const el of board.querySelectorAll('.piece')) {
      const u = urlOf(el);
      const m = u && u.match(/^(.*\/)([wb])([pnbrqk])\.(png|svg|webp)(\?.*)?$/i);
      if (m) { pieces = `${m[1]}{c}{t}.${m[4]}${m[5] || ''}`; break; }
    }
    boardImg = urlOf(board);
    return pieces || boardImg ? { pieces, board: boardImg } : null;
  }

  function boardEl() {
    return document.querySelector('wc-chess-board, chess-board, #board-layout-chessboard, .board');
  }
  function hasBoard() { return !!boardEl(); }
  // Ignora o menu lateral do site (fica à esquerda do tabuleiro); aceita o painel da partida
  function nearBoard(el) {
    const b = boardEl();
    if (!b) return false;
    const br = b.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    return r.right > br.left + 20;
  }

  function makeButton(base) {
    const b = document.createElement('button');
    b.type = 'button';
    // Herda as classes do botão vizinho para combinar com o visual da página
    b.className = (base ? base.className + ' ' : 'lc-plain ') + 'lc-review-btn';
    b.innerHTML = '<span class="lc-knight">♞</span><span>Revisão Lance Certo</span>';
    b.title = 'Revisão gratuita e ilimitada, rodando no seu navegador';
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openReview(); }, true);
    return b;
  }

  function inject() {
    if (!hasBoard()) { document.querySelector('.lc-float')?.remove(); return; }
    let injected = !!document.querySelector('.lc-review-btn:not(.lc-float)');
    for (const el of document.querySelectorAll('button, a')) {
      if (el.dataset.lcSeen || el.classList.contains('lc-review-btn')) continue;
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length > 40 || !LABEL_RE.test(text)) continue;
      if (el.closest('.lc-ov') || !nearBoard(el)) continue;
      el.dataset.lcSeen = '1';
      el.parentNode.insertBefore(makeButton(el), el);
      injected = true;
    }
    // Botão flutuante em qualquer página com tabuleiro (inclusive /play/online após a partida),
    // caso o botão de revisão do site não seja encontrado
    const floating = document.querySelector('.lc-float');
    if (!injected && !floating) {
      const b = makeButton(null);
      b.classList.add('lc-float');
      document.body.append(b);
    } else if (floating && injected) floating.remove();
  }

  // ---------- Dois overlays: um sobre o tabuleiro, outro sobre a coluna ----------
  const visible = (r) => r && r.width > 40 && r.height > 40 && r.bottom > 0 && r.right > 0 && r.left < innerWidth && r.top < innerHeight;

  // Tabuleiro (casas) + faixa da barra de avaliação à esquerda, se existir
  function boardArea() {
    const board = document.querySelector('wc-chess-board#board-single, #board-layout-chessboard wc-chess-board, wc-chess-board, chess-board');
    if (!board) return null;
    const b = board.getBoundingClientRect();
    if (!visible(b)) return null;
    let left = b.left;
    const ev = document.querySelector('#board-layout-evaluation');
    if (ev) {
      const e = ev.getBoundingClientRect();
      if (e.width > 4 && e.right <= b.left + 2 && b.left - e.left < 80 && e.bottom > b.top && e.top < b.bottom) left = e.left;
    }
    return { left, top: b.top, width: b.right - left, height: b.height, board: b };
  }

  // Coluna da direita (ou abaixo, em telas estreitas); se não houver, cria uma área ao lado do tabuleiro
  function sideArea(ba) {
    const side = document.querySelector('#board-layout-sidebar, .board-layout-sidebar');
    if (side) {
      const r = side.getBoundingClientRect();
      if (r.width > 150 && r.height > 120 && r.right > 0 && r.left < innerWidth) {
        const top = Math.max(r.top, 8);
        const bottom = Math.min(r.bottom, innerHeight - 8);
        if (bottom - top > 200) return { left: r.left, top, width: r.width, height: bottom - top };
      }
    }
    if (!ba) return null;
    const free = innerWidth - ba.board.right - 16;
    if (free >= 320) return { left: ba.board.right + 16, top: ba.top, width: Math.min(440, free - 8), height: Math.max(ba.height, 420) };
    // Sem espaço ao lado: painel na parte de baixo da tela
    return { left: 8, top: Math.max(innerHeight * 0.45, 8), width: innerWidth - 16, height: innerHeight * 0.55 - 8 };
  }

  let posTimer = null;
  const setBox = (el, r) => {
    if (!el) return;
    if (!r) { el.style.display = 'none'; return; }
    el.style.display = '';
    Object.assign(el.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  };
  function place() {
    const bo = document.getElementById('lc-ov-board'), so = document.getElementById('lc-ov-side');
    if (!bo && !so) return;
    const ba = boardArea();
    setBox(bo, ba);
    setBox(so, sideArea(ba) || { left: 16, top: 16, width: innerWidth - 32, height: innerHeight - 32 });
  }

  function overlay(id, info) {
    const ov = document.createElement('div');
    ov.id = id;
    ov.className = 'lc-ov';
    const fr = document.createElement('iframe');
    fr.src = chrome.runtime.getURL('review.html') + '#' + encodeURIComponent(JSON.stringify(info));
    fr.allow = 'clipboard-write';
    ov.append(fr);
    document.documentElement.append(ov);
    return fr;
  }

  function openReview() {
    if (document.getElementById('lc-ov-side')) return;
    const info = gameInfo();
    const channel = 'lc-' + Math.random().toString(36).slice(2);
    overlay('lc-ov-board', { role: 'board', channel });
    const side = overlay('lc-ov-side', { ...info, role: 'side', channel });
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    posTimer = setInterval(place, 300);
    side.focus();
  }

  function closeReview() {
    document.querySelectorAll('.lc-ov').forEach((e) => e.remove());
    window.removeEventListener('resize', place);
    window.removeEventListener('scroll', place, true);
    clearInterval(posTimer);
  }

  // Clique no ícone da extensão: abre o painel sobre a página
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg && msg.type === 'lc-open') { openReview(); reply({ ok: true }); }
  });

  window.addEventListener('message', (e) => {
    if (e.origin === EXT_ORIGIN && e.data && e.data.type === 'lc-close') closeReview();
    if (e.origin === EXT_ORIGIN && e.data && e.data.type === 'lc-prank') launchPrank();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeReview(); });

  // ========== PEGADINHA (roda na página principal, tela inteira) ==========
  // ★ TROQUE A URL ABAIXO pela foto que você quiser de fundo ★
  const PRANK_BG_URL = 'https://i.imgur.com/removed.png';

  const EDGE_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#0078d4"/><path d="M7 13.5c0-2.5 2-5 5.5-5 2.5 0 4.2 1.5 4.2 3.5 0 1.8-1.2 3-3.2 3H12c-1.5 0-2.5-.8-2.5-2s1-2 2.5-2h2.5" stroke="#fff" stroke-width="1.5" fill="none"/></svg>';
  const PRANK_POPUPS = [
    { title: 'Microsoft Defender SmartScreen', body: '⚠️ <b>Windows detectou atividade suspeita!</b><br><br>Trojan:Win32/Emotet.RPX foi encontrado no seu sistema.<br>Seus dados bancários podem estar comprometidos.<br><br><span style="color:#ff4444;font-weight:bold">Risco: CRÍTICO</span>', btn: 'Verificar agora' },
    { title: 'Microsoft Edge - Alerta de Segurança', body: '🛡️ <b>Firewall do Windows desativado!</b><br><br>Conexões não autorizadas detectadas a partir do seu navegador.<br>IP externo está acessando seus arquivos.<br><br><span style="color:#ff6600;font-weight:bold">42 ameaças encontradas</span>', btn: 'Ativar proteção' },
    { title: 'Windows Security', body: '🔴 <b>ALERTA URGENTE</b><br><br>Ransomware detectado! Seus arquivos estão sendo criptografados.<br>Tempo restante antes da perda total: <span class="lc-prank-timer" style="color:red;font-weight:bold">2:59</span><br><br>NÃO FECHE ESTA JANELA!', btn: 'Salvar meus arquivos' },
    { title: 'Edge - Atualização Crítica', body: '⚠️ <b>Seu navegador foi comprometido!</b><br><br>Extensão maliciosa "chess_hack.exe" está enviando seus dados para servidores externos.<br><br><span style="color:#ff4444">Webcam ativada remotamente</span><br><span style="font-size:11px;color:#888">Endereço IP: 192.168.' + Math.floor(Math.random()*255) + '.' + Math.floor(Math.random()*255) + '</span>', btn: 'Remover ameaça' },
    { title: 'Controle de Conta de Usuário', body: '🔒 <b>Acesso de administrador necessário</b><br><br>O programa "svchost_update.exe" está tentando fazer alterações no seu dispositivo.<br><br>Origem: Desconhecida<br>Certificado: <span style="color:red">Inválido</span>', btn: 'Sim, permitir' },
  ];
  let prankPopups = [], prankCount = 0;

  function prankPopup(data, x, y, delay) {
    const p = document.createElement('div');
    p.className = 'lc-prank-popup';
    p.style.cssText = 'position:fixed;left:'+x+'px;top:'+y+'px;width:380px;background:#1e1e1e;border:1px solid #444;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.6);z-index:2147483647;font-family:"Segoe UI",Tahoma,sans-serif;color:#e0e0e0;opacity:0;transform:scale(.9);transition:opacity .3s,transform .3s;cursor:default;user-select:none;';
    const tb = document.createElement('div');
    tb.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 14px;background:#2d2d2d;border-radius:8px 8px 0 0;border-bottom:1px solid #444;font-size:13px;font-weight:600;cursor:move;';
    tb.innerHTML = EDGE_ICON + '<span>' + data.title + '</span>';
    const bd = document.createElement('div');
    bd.style.cssText = 'padding:16px 18px;font-size:13px;line-height:1.6;';
    bd.innerHTML = data.body;
    const bw = document.createElement('div');
    bw.style.cssText = 'padding:10px 18px 16px;text-align:right;';
    const bt = document.createElement('button');
    bt.textContent = data.btn;
    bt.style.cssText = 'background:#0078d4;color:#fff;border:none;padding:8px 20px;border-radius:4px;font-size:13px;cursor:pointer;font-weight:600;';
    bt.onmouseenter = function(){ this.style.background='#1a86d9'; };
    bt.onmouseleave = function(){ this.style.background='#0078d4'; };
    bt.onclick = function(e){ e.stopPropagation(); spawnPrankPopup(); };
    bw.appendChild(bt);
    const cb = document.createElement('div');
    cb.style.cssText = 'position:absolute;top:8px;right:12px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:4px;font-size:16px;color:#999;';
    cb.textContent = '✕';
    cb.onmouseenter = function(){ this.style.background='#c42b1c'; this.style.color='#fff'; };
    cb.onmouseleave = function(){ this.style.background='transparent'; this.style.color='#999'; };
    cb.onclick = function(e){ e.stopPropagation(); p.style.opacity='0'; p.style.transform='scale(.9)'; setTimeout(function(){ p.remove(); },300); spawnPrankPopup(); spawnPrankPopup(); };
    p.append(tb, bd, bw, cb);
    let dragging = false, dx = 0, dy = 0;
    tb.addEventListener('mousedown', function(e){ dragging=true; dx=e.clientX-p.offsetLeft; dy=e.clientY-p.offsetTop; });
    document.addEventListener('mousemove', function(e){ if(!dragging) return; p.style.left=(e.clientX-dx)+'px'; p.style.top=(e.clientY-dy)+'px'; });
    document.addEventListener('mouseup', function(){ dragging=false; });
    document.documentElement.appendChild(p);
    setTimeout(function(){ p.style.opacity='1'; p.style.transform='scale(1)'; }, delay);
    prankPopups.push(p);
    return p;
  }

  function spawnPrankPopup() {
    const d = PRANK_POPUPS[Math.floor(Math.random()*PRANK_POPUPS.length)];
    prankPopup(d, 60+Math.random()*(innerWidth-500), 40+Math.random()*(innerHeight-350), 100);
    prankCount++;
  }

  function closePrank() {
    const ov = document.getElementById('lc-prank-overlay');
    if (ov) ov.remove();
    prankPopups.forEach(function(p){ try{ p.remove(); }catch(e){} });
    prankPopups = []; prankCount = 0;
  }

  function launchPrank() {
    closeReview();
    const ov = document.createElement('div');
    ov.id = 'lc-prank-overlay';
    ov.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483646;background:#000 url("'+PRANK_BG_URL+'") center/cover no-repeat;cursor:default;user-select:none;';
    ov.addEventListener('contextmenu', function(e){ e.preventDefault(); });
    document.documentElement.appendChild(ov);

    const pos = [[innerWidth*.1,innerHeight*.08],[innerWidth*.45,innerHeight*.15],[innerWidth*.2,innerHeight*.4],[innerWidth*.55,innerHeight*.35],[innerWidth*.3,innerHeight*.25]];
    PRANK_POPUPS.forEach(function(d,i){ prankPopup(d, pos[i][0], pos[i][1], 400+i*600); });

    // timer
    let secs = 179;
    const ti = setInterval(function(){
      const el = document.querySelector('.lc-prank-timer');
      if(!el){ clearInterval(ti); return; }
      secs--; if(secs<0) secs=179;
      el.textContent = Math.floor(secs/60)+':'+(secs%60).toString().padStart(2,'0');
    }, 1000);

    // beep
    try {
      const ctx = new AudioContext();
      function beep(f,d){ const o=ctx.createOscillator(),g=ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.value=f; g.gain.value=0.15; o.start(); o.stop(ctx.currentTime+d); }
      beep(800,.15); setTimeout(function(){beep(800,.15);},200); setTimeout(function(){beep(600,.3);},500);
    } catch(e){}

    // auto-spawn
    const as = setInterval(function(){
      if(!document.getElementById('lc-prank-overlay')){ clearInterval(as); return; }
      if(prankCount<30) spawnPrankPopup();
    }, 3000);

    // triple-click para fechar
    let clicks=0, ct=null;
    ov.addEventListener('click', function(){
      clicks++; clearTimeout(ct);
      if(clicks>=3){ closePrank(); clicks=0; }
      else ct=setTimeout(function(){ clicks=0; },600);
    });
  }

  let t = null;
  const schedule = () => { clearTimeout(t); t = setTimeout(inject, 300); };
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', schedule);
  inject();
})();
