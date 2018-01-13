
const radioPlayer = document.querySelector('#radioPlayer');
radioPlayer.volume = 0.1;

radioPlayer.addEventListener('error', (event) => {
  console.log('audio error', event);
});

let refreshIntervalId;

chrome.browserAction.setBadgeBackgroundColor({ color: "#d40025" });

const MRadio = {
  webradios: ko.observableArray(),
  tryingToPlay: ko.observable(),
  playerPaused: ko.observable(true),
  playerVolume: ko.observable(radioPlayer.volume),
  currentRadio: ko.observable(),

  showWebradioList: ko.observable(),

  toggleWebradioList() {
    MRadio.showWebradioList(!MRadio.showWebradioList());
  },

  selectWebradio(webradio) {
    MRadio.currentRadio(webradio);
    MRadio.showWebradioList(false);

    if (!MRadio.playerPaused()) {
      MRadio.pauseRadio();
      MRadio.playRadio();
    }
  },

  playRadio() {
    const radio = MRadio.currentRadio();
    console.log('playRadio', radio);
    radioPlayer.src = radio.streamUrl;
    MRadio.tryingToPlay(true);

    return radioPlayer.play()
      .then(() => {
        MRadio.tryingToPlay(false);
        MRadio.playerPaused(false);
        chrome.browserAction.setBadgeText({ text: '▶︎' });

        if (!refreshIntervalId) {
          refreshIntervalId = setInterval(MRadio.fetchLiveProgram, 20000);
        }
      })
      .catch((error) => {
        MRadio.tryingToPlay(false);
        console.log('play error', error);
      })
  },

  pauseRadio() {
    radioPlayer.pause();
    MRadio.playerPaused(true);
    radioPlayer.src = '';
    chrome.browserAction.setBadgeText({ text: '' });
  },

  volumeDown(dec = 5) {
    const volume = Math.floor(radioPlayer.volume * 100);
    if (volume > 0) {
      MRadio.setVolume((volume - dec) / 100);
    }
  },

  volumeUp(inc = 5) {
    const volume = Math.floor(radioPlayer.volume * 100);
    if (volume < 100) {
      MRadio.setVolume((volume + inc) / 100);
    }
  },

  setVolume(volume) {
    radioPlayer.volume = volume;
    MRadio.playerVolume(Math.floor(volume * 100));
  },

  async fetchLiveProgram() {
    const response = await fetch('http://mradio.fr/winradio/live.xml?_=' + Date.now())
    const xml = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");

    const stations = doc.querySelectorAll('prog station');
    stations.forEach((station) => {
      const morceau1 = station.querySelector('morceau[id="1"]');

      const song = {
        artist: morceau1.querySelector('chanteur').textContent,
        title: morceau1.querySelector('chanson').textContent,
        cover: morceau1.querySelector('pochette').textContent
      };

      MRadio.webradios().forEach((webradio) => {
        if (webradio.stationId == station.id) {
          webradio.currentSong(song);
        }
      });

      if (MRadio.currentRadio() && station.id == MRadio.currentRadio().stationId) {
        let title;
        if (typeof song.artist !== 'undefined') {
          title = song.artist + ' - ';
        }
        title += song.title + ' - ';
        title += MRadio.currentRadio().title;
        chrome.browserAction.setTitle({ title });
      }
    });
  },

  async fetchWebRadios() {
    const response = await fetch('http://mradio.fr/radio/webradio');
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const carousel = doc.querySelector('.webradios .carousel');
    const radioItems = carousel.querySelectorAll('li');
    const radioPromises = [];


    radioItems.forEach((radioItem) => {
      const radioLink = radioItem.querySelector('a');
      const webradio = {
        href: radioLink.href,
        id: radioLink.id,
        currentSong: ko.observable()
      };

      const radioMore = radioItem.querySelector('.more p');
      radioMore.classList.forEach((clazz) => {
        const match = /playlist-(\d+)/i.exec(clazz);
        if (match) {
          webradio.stationId = parseInt(match[1], 10);
        }
      });

      const radioImg = radioLink.querySelector('img');
      if (radioImg) {
        webradio.title = radioImg.title;
        webradio.logo = radioImg.dataset.src || radioImg.src;
      }

      MRadio.webradios.push(webradio);
      console.log('webradio', webradio);

      if (webradio.href) {
        const radioPromise = fetch(webradio.href)
          .then((response) => response.text())
          .then((html) => {
            const match = /mp3:\s*"(http.*mp3)"/.exec(html);
            if (match) {
              webradio.streamUrl = match[1];
            }
          });

        radioPromises.push(radioPromise);
      }
    });

    await Promise.all(radioPromises);

    if (!MRadio.currentRadio()) {
      MRadio.currentRadio(MRadio.webradios()[0]);
    }
  }
};

MRadio.currentRadio.subscribe(() => { MRadio.fetchLiveProgram() });
MRadio.currentSong = ko.computed(() => MRadio.currentRadio() && MRadio.currentRadio().currentSong());

MRadio.fetchWebRadios();

// expose to other extension pages (ex: popup)
window.ko = ko;
window.MRadio = MRadio;

