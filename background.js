// Clique no ícone: no chess.com abre o painel sobre a página; em outros sites, abre a revisão numa aba.
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'lc-open' });
  } catch {
    chrome.tabs.create({ url: chrome.runtime.getURL('review.html') });
  }
});
