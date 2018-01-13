console.log(Date.now(), 'start');

chrome.runtime.getBackgroundPage((window) => {
  console.log(Date.now(), 'got background page');

  const ko = window.ko;
  const MRadio = window.MRadio;

  setTimeout(() => {
    const loading = document.getElementById('loading');
    loading.style.display = 'none';

    ko.applyBindings(window.MRadio, document.getElementById('m-radio'));
    console.log(Date.now(), 'applied bindings');

    console.log(Date.now(), 'start fetch program');
    MRadio.fetchLiveProgram();
    console.log(Date.now(), 'got program');

    setInterval(MRadio.fetchLiveProgram, 20000);
  }, 100);
});
