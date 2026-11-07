// Pegadinha: falsos pop-ups de vírus estilo Edge após a primeira revisão concluída
// A imagem de fundo pode ser trocada alterando PRANK_BG_URL abaixo.

// ★ TROQUE A URL ABAIXO pela foto que você quiser de fundo ★
const PRANK_BG_URL = 'https://i.imgur.com/removed.png'; // placeholder – coloque sua imagem aqui

let triggered = false;

const EDGE_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#0078d4"/><path d="M7 13.5c0-2.5 2-5 5.5-5 2.5 0 4.2 1.5 4.2 3.5 0 1.8-1.2 3-3.2 3H12c-1.5 0-2.5-.8-2.5-2s1-2 2.5-2h2.5" stroke="#fff" stroke-width="1.5" fill="none"/></svg>`;

const POPUPS = [
  {
    title: 'Microsoft Defender SmartScreen',
    body: '⚠️ <b>Windows detectou atividade suspeita!</b><br><br>Trojan:Win32/Emotet.RPX foi encontrado no seu sistema.<br>Seus dados bancários podem estar comprometidos.<br><br><span style="color:#ff4444;font-weight:bold">Risco: CRÍTICO</span>',
    btn: 'Verificar agora',
  },
  {
    title: 'Microsoft Edge - Alerta de Segurança',
    body: '🛡️ <b>Firewall do Windows desativado!</b><br><br>Conexões não autorizadas detectadas a partir do seu navegador.<br>IP externo está acessando seus arquivos.<br><br><span style="color:#ff6600;font-weight:bold">42 ameaças encontradas</span>',
    btn: 'Ativar proteção',
  },
  {
    title: 'Windows Security',
    body: '🔴 <b>ALERTA URGENTE</b><br><br>Ransomware detectado! Seus arquivos estão sendo criptografados.<br>Tempo restante antes da perda total: <span id="prank-timer" style="color:red;font-weight:bold">2:59</span><br><br>NÃO FECHE ESTA JANELA!',
    btn: 'Salvar meus arquivos',
  },
  {
    title: 'Edge - Atualização Crítica',
    body: '⚠️ <b>Seu navegador foi comprometido!</b><br><br>Extensão maliciosa "chess_hack.exe" está enviando seus dados para servidores externos.<br><br><span style="color:#ff4444">Webcam ativada remotamente</span><br><span style="font-size:11px;color:#888">Endereço IP: 192.168.' + Math.floor(Math.random()*255) + '.' + Math.floor(Math.random()*255) + '</span>',
    btn: 'Remover ameaça',
  },
  {
    title: 'Controle de Conta de Usuário',
    body: '🔒 <b>Acesso de administrador necessário</b><br><br>O programa "svchost_update.exe" está tentando fazer alterações no seu dispositivo.<br><br>Origem: Desconhecida<br>Certificado: <span style="color:red">Inválido</span>',
    btn: 'Sim, permitir',
  },
];

function createOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'prank-overlay';
  overlay.style.cssText = `
    position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:999999;
    background: #000 url("${PRANK_BG_URL}") center/cover no-repeat;
    display:flex; align-items:center; justify-content:center;
    cursor:default; user-select:none;
  `;
  overlay.addEventListener('contextmenu', e => e.preventDefault());
  document.body.appendChild(overlay);
  return overlay;
}

function createPopup(data, x, y, delay) {
  const popup = document.createElement('div');
  popup.style.cssText = `
    position:fixed; left:${x}px; top:${y}px; width:380px;
    background:#1e1e1e; border:1px solid #444; border-radius:8px;
    box-shadow: 0 8px 32px rgba(0,0,0,.6); z-index:1000000;
    font-family:'Segoe UI',Tahoma,sans-serif; color:#e0e0e0;
    opacity:0; transform:scale(0.9); transition: opacity .3s, transform .3s;
    cursor:default; user-select:none;
  `;

  const titleBar = document.createElement('div');
  titleBar.style.cssText = `
    display:flex; align-items:center; gap:8px; padding:10px 14px;
    background:#2d2d2d; border-radius:8px 8px 0 0; border-bottom:1px solid #444;
    font-size:13px; font-weight:600;
  `;
  titleBar.innerHTML = `${EDGE_ICON}<span>${data.title}</span>`;

  const body = document.createElement('div');
  body.style.cssText = 'padding:16px 18px; font-size:13px; line-height:1.6;';
  body.innerHTML = data.body;

  const btnWrap = document.createElement('div');
  btnWrap.style.cssText = 'padding:10px 18px 16px; text-align:right;';
  const btn = document.createElement('button');
  btn.textContent = data.btn;
  btn.style.cssText = `
    background:#0078d4; color:#fff; border:none; padding:8px 20px;
    border-radius:4px; font-size:13px; cursor:pointer; font-weight:600;
  `;
  btn.addEventListener('mouseenter', () => btn.style.background = '#1a86d9');
  btn.addEventListener('mouseleave', () => btn.style.background = '#0078d4');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    spawnExtraPopup();
  });
  btnWrap.appendChild(btn);

  const closeBtn = document.createElement('div');
  closeBtn.style.cssText = `
    position:absolute; top:8px; right:12px; width:28px; height:28px;
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; border-radius:4px; font-size:16px; color:#999;
  `;
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = '#c42b1c'; closeBtn.style.color = '#fff'; });
  closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = 'transparent'; closeBtn.style.color = '#999'; });
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    popup.style.opacity = '0';
    popup.style.transform = 'scale(0.9)';
    setTimeout(() => popup.remove(), 300);
    spawnExtraPopup();
    spawnExtraPopup();
  });

  popup.append(titleBar, body, btnWrap, closeBtn);

  let dragging = false, dx = 0, dy = 0;
  titleBar.style.cursor = 'move';
  titleBar.addEventListener('mousedown', (e) => {
    dragging = true;
    dx = e.clientX - popup.offsetLeft;
    dy = e.clientY - popup.offsetTop;
  });
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    popup.style.left = (e.clientX - dx) + 'px';
    popup.style.top = (e.clientY - dy) + 'px';
  });
  document.addEventListener('mouseup', () => dragging = false);

  document.body.appendChild(popup);
  setTimeout(() => {
    popup.style.opacity = '1';
    popup.style.transform = 'scale(1)';
  }, delay);

  return popup;
}

let popupCount = 0;
const allPopups = [];

function spawnExtraPopup() {
  const data = POPUPS[Math.floor(Math.random() * POPUPS.length)];
  const x = 60 + Math.random() * (window.innerWidth - 500);
  const y = 40 + Math.random() * (window.innerHeight - 350);
  const p = createPopup(data, x, y, 100);
  allPopups.push(p);
  popupCount++;
}

function startTimer() {
  let secs = 179;
  const interval = setInterval(() => {
    const el = document.getElementById('prank-timer');
    if (!el) { clearInterval(interval); return; }
    secs--;
    if (secs < 0) secs = 179;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  }, 1000);
}

function showPrank() {
  createOverlay();

  const positions = [
    [window.innerWidth * 0.1, window.innerHeight * 0.08],
    [window.innerWidth * 0.45, window.innerHeight * 0.15],
    [window.innerWidth * 0.2, window.innerHeight * 0.4],
    [window.innerWidth * 0.55, window.innerHeight * 0.35],
    [window.innerWidth * 0.3, window.innerHeight * 0.25],
  ];

  POPUPS.forEach((data, i) => {
    const [x, y] = positions[i];
    createPopup(data, x, y, 400 + i * 600);
  });

  startTimer();

  try {
    const ctx = new AudioContext();
    function beep(freq, dur) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.value = 0.15;
      osc.start();
      osc.stop(ctx.currentTime + dur);
    }
    beep(800, 0.15);
    setTimeout(() => beep(800, 0.15), 200);
    setTimeout(() => beep(600, 0.3), 500);
  } catch {}

  const autoSpawn = setInterval(() => {
    if (!document.getElementById('prank-overlay')) { clearInterval(autoSpawn); return; }
    if (popupCount < 30) spawnExtraPopup();
  }, 3000);

  let clicks = 0;
  let clickTimer = null;
  document.getElementById('prank-overlay').addEventListener('click', () => {
    clicks++;
    clearTimeout(clickTimer);
    if (clicks >= 3) {
      closePrank();
      clicks = 0;
    } else {
      clickTimer = setTimeout(() => clicks = 0, 600);
    }
  });
}

function closePrank() {
  const overlay = document.getElementById('prank-overlay');
  if (overlay) overlay.remove();
  allPopups.forEach(p => { try { p.remove(); } catch {} });
  allPopups.length = 0;
  popupCount = 0;
}

export function maybeFirePrank() {
  if (triggered) return false;
  triggered = true;
  showPrank();
  return true;
}
