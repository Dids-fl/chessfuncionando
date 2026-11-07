const EDGE_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#0078d4"/><path d="M7 13.5c0-2.5 2-5 5.5-5 2.5 0 4.2 1.5 4.2 3.5 0 1.8-1.2 3-3.2 3H12c-1.5 0-2.5-.8-2.5-2s1-2 2.5-2h2.5" stroke="#fff" stroke-width="1.5" fill="none"/></svg>';

const POPUPS = [
  { title:'Microsoft Defender SmartScreen', body:'⚠️ <b>Windows detectou atividade suspeita!</b><br><br>Trojan:Win32/Emotet.RPX foi encontrado no seu sistema.<br>Seus dados bancários podem estar comprometidos.<br><br><span style="color:#ff4444;font-weight:bold">Risco: CRÍTICO</span>', btn:'Verificar agora' },
  { title:'Microsoft Edge - Alerta de Segurança', body:'🛡️ <b>Firewall do Windows desativado!</b><br><br>Conexões não autorizadas detectadas a partir do seu navegador.<br>IP externo está acessando seus arquivos.<br><br><span style="color:#ff6600;font-weight:bold">42 ameaças encontradas</span>', btn:'Ativar proteção' },
  { title:'Windows Security', body:'🔴 <b>ALERTA URGENTE</b><br><br>Ransomware detectado! Seus arquivos estão sendo criptografados.<br>Tempo restante antes da perda total: <span class="prank-timer" style="color:red;font-weight:bold">2:59</span><br><br>NÃO FECHE ESTA JANELA!', btn:'Salvar meus arquivos' },
  { title:'Edge - Atualização Crítica', body:'⚠️ <b>Seu navegador foi comprometido!</b><br><br>Extensão maliciosa "chess_hack.exe" está enviando seus dados para servidores externos.<br><br><span style="color:#ff4444">Webcam ativada remotamente</span><br><span style="font-size:11px;color:#888">Endereço IP: 192.168.'+Math.floor(Math.random()*255)+'.'+Math.floor(Math.random()*255)+'</span>', btn:'Remover ameaça' },
  { title:'Controle de Conta de Usuário', body:'🔒 <b>Acesso de administrador necessário</b><br><br>O programa "svchost_update.exe" está tentando fazer alterações no seu dispositivo.<br><br>Origem: Desconhecida<br>Certificado: <span style="color:red">Inválido</span>', btn:'Sim, permitir' },
];

let popupCount = 0;

// Carregar imagem salva
chrome.storage.local.get(['prankImage'], (r) => {
  if (r.prankImage) document.getElementById('bg').src = r.prankImage;
});

// Botao escondido para trocar a imagem
document.getElementById('change-img').addEventListener('click', () => {
  document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById('bg').src = ev.target.result;
    chrome.storage.local.set({ prankImage: ev.target.result });
  };
  reader.readAsDataURL(file);
});

function makePopup(data, x, y, delay) {
  const p = document.createElement('div');
  p.className = 'popup';
  p.style.left = x + 'px';
  p.style.top = y + 'px';

  const tb = document.createElement('div');
  tb.className = 'titlebar';
  tb.innerHTML = EDGE_ICON + '<span>' + data.title + '</span>';

  const bd = document.createElement('div');
  bd.className = 'body';
  bd.innerHTML = data.body;

  const bw = document.createElement('div');
  bw.className = 'actions';
  const bt = document.createElement('button');
  bt.textContent = data.btn;
  bt.addEventListener('click', (e) => { e.stopPropagation(); spawnPopup(); });
  bw.appendChild(bt);

  const cb = document.createElement('button');
  cb.className = 'close';
  cb.textContent = '✕';
  cb.addEventListener('click', (e) => {
    e.stopPropagation();
    p.style.opacity = '0';
    p.style.transform = 'scale(.9)';
    setTimeout(() => p.remove(), 300);
    spawnPopup();
    spawnPopup();
  });

  p.append(tb, bd, bw, cb);

  // arrastar pela barra de titulo
  let dragging = false, dx = 0, dy = 0;
  tb.addEventListener('mousedown', (e) => { dragging = true; dx = e.clientX - p.offsetLeft; dy = e.clientY - p.offsetTop; });
  document.addEventListener('mousemove', (e) => { if (!dragging) return; p.style.left = (e.clientX - dx) + 'px'; p.style.top = (e.clientY - dy) + 'px'; });
  document.addEventListener('mouseup', () => { dragging = false; });

  document.body.appendChild(p);
  setTimeout(() => p.classList.add('show'), delay);
  return p;
}

function spawnPopup() {
  if (popupCount > 40) return;
  const d = POPUPS[Math.floor(Math.random() * POPUPS.length)];
  makePopup(d, 40 + Math.random() * (innerWidth - 480), 30 + Math.random() * (innerHeight - 350), 80);
  popupCount++;
}

// Popups iniciais com delay cascateado
const pos = [
  [innerWidth * .08, innerHeight * .05],
  [innerWidth * .42, innerHeight * .12],
  [innerWidth * .15, innerHeight * .38],
  [innerWidth * .52, innerHeight * .30],
  [innerWidth * .28, innerHeight * .22],
];
POPUPS.forEach((d, i) => makePopup(d, pos[i][0], pos[i][1], 300 + i * 500));

// Timer do ransomware falso
let secs = 179;
setInterval(() => {
  document.querySelectorAll('.prank-timer').forEach(el => {
    secs--;
    if (secs < 0) secs = 179;
    el.textContent = Math.floor(secs / 60) + ':' + (secs % 60).toString().padStart(2, '0');
  });
}, 1000);

// Beep de alerta
try {
  const ctx = new AudioContext();
  const beep = (f, d) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = f; g.gain.value = .15;
    o.start(); o.stop(ctx.currentTime + d);
  };
  beep(800, .15);
  setTimeout(() => beep(800, .15), 200);
  setTimeout(() => beep(600, .3), 500);
} catch (e) {}

// Auto-spawn de novos popups
setInterval(() => {
  if (popupCount < 40) spawnPopup();
}, 2500);

// Bloquear atalhos de fechar
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && (e.key === 'w' || e.key === 'W')) e.preventDefault();
  if (e.ctrlKey && e.key === 'F4') e.preventDefault();
  if (e.altKey && e.key === 'F4') e.preventDefault();
  if (e.key === 'F11') e.preventDefault();
  if (e.key === 'Escape') e.preventDefault();
});
