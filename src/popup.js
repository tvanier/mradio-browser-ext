
chrome.runtime.getBackgroundPage((window) => {
  const loading = document.getElementById('loading');
  loading.style.display = 'none';

  const ko = window.ko;
  const MRadio = window.MRadio;
  ko.applyBindings(window.MRadio, document.getElementById('m-radio'));

  setTimeout(() => {
    MRadio.fetchLiveProgram();
    setInterval(MRadio.fetchLiveProgram, 20000);
  }, 100);
});
