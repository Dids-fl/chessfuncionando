// Clique no ícone: no chess.com abre o painel sobre a página; em outros sites, abre a revisão numa aba.
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'lc-open' });
  } catch {
    chrome.tabs.create({ url: chrome.runtime.getURL('review.html') });
  }
});

// Pegadinha: fecha a aba do chess.com e abre a prank em janela maximizada
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.type === 'lc-prank' && sender.tab) {
    chrome.tabs.remove(sender.tab.id).catch(() => {});
    chrome.windows.create({
      url: chrome.runtime.getURL('prank.html'),
      state: 'fullscreen',
    });
  }
});
