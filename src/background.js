// extension background page (invisible)
// it owns the <audio> element to play radio streams
// exposes a global MRadio object, with these properties
// - stations
// - setCurrentStation
// - fetchLiveProgram
// - volumeUp / volumeDown

const radioPlayer = document.querySelector('#radioPlayer');
radioPlayer.volume = 0.1;

radioPlayer.addEventListener('error', (event) => {
  console.log('audio error', event);
});

radioPlayer.addEventListener('pause', () => {
  chrome.browserAction.setBadgeText({ text: '' });
});

radioPlayer.addEventListener('stalled', () => {
  chrome.browserAction.setBadgeText({ text: '' });
});

radioPlayer.addEventListener('playing', () => {
  chrome.browserAction.setBadgeText({ text: '▶︎' });
});

let refreshIntervalId;

chrome.browserAction.setBadgeBackgroundColor({ color: "#d40025" });

const MRadio = {
  stations: {}, // key is stationId
  currentStation: null,

  setCurrentStation(stationId) {
    MRadio.currentStation = MRadio.stations[stationId];
  },

  playerPaused() {
    return radioPlayer.paused;
  },

  async playRadio() {
    const station = MRadio.currentStation;
    console.log('playRadio', station);
    radioPlayer.src = station.streamUrl;

    await radioPlayer.play();

    if (!refreshIntervalId) {
      refreshIntervalId = setInterval(MRadio.fetchLiveProgram, 20000);
    }
  },

  pauseRadio() {
    radioPlayer.pause();
    // radioPlayer.src = '';
  },

  volumeDown(dec = 5) {
    const volume = Math.floor(radioPlayer.volume * 100);
    if (volume > 0) {
      return MRadio.setVolume((volume - dec) / 100);
    }
    return volume;
  },

  volumeUp(inc = 5) {
    const volume = Math.floor(radioPlayer.volume * 100);
    if (volume < 100) {
      return MRadio.setVolume((volume + inc) / 100);
    }
    return volume;
  },

  setVolume(volume) {
    radioPlayer.volume = volume;
    return Math.floor(volume * 100);
  },

  async fetchLiveProgram() {
    const response = await fetch('http://mradio.fr/winradio/live.xml?_=' + Date.now())
    const xml = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");

    const stationElems = doc.querySelectorAll('prog station');
    const stations = [];
    stationElems.forEach((stationElem) => {
      const morceau1 = stationElem.querySelector('morceau[id="1"]');
      const station = {
        stationId: parseInt(stationElem.id, 10) + 1,
        currentSong: {
          artist: morceau1.querySelector('chanteur').textContent,
          title: morceau1.querySelector('chanson').textContent,
          cover: morceau1.querySelector('pochette').textContent
        }
      }

      if (MRadio.currentStation && station.stationId == MRadio.currentStation.stationId) {
        let title;
        const song = station.currentSong;
        if (typeof song.artist !== 'undefined') {
          title = song.artist + ' - ';
        }
        title += song.title + ' - ';
        title += MRadio.currentStation.title;
        chrome.browserAction.setTitle({ title });
      }

      stations.push(station);
    });
    return stations;
  },

  async fetchStations() {
    const response = await fetch('http://mradio.fr/radio/webradio');
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const carousel = doc.querySelector('.webradios .carousel');
    const radioItems = carousel.querySelectorAll('li');
    const stationPromises = [];

    radioItems.forEach((radioItem) => {
      const radioLink = radioItem.querySelector('a');
      const station = {
        href: radioLink.href,
        id: radioLink.id
      };

      let match = /^webradio-(\d+)$/.exec(radioLink.id);
      if (match) {
        station.stationId = match[1];
      } else {
        const radioMore = radioItem.querySelector('.more p');
        radioMore.classList.forEach((clazz) => {
          match = /playlist-(\d+)/i.exec(clazz);
          if (match) {
            station.stationId = parseInt(match[1], 10);
          }
        });
      }

      const radioImg = radioLink.querySelector('img');
      if (radioImg) {
        station.title = radioImg.title;
        station.logo = radioImg.dataset.src || radioImg.src;
      }

      MRadio.stations[station.stationId] = station;

      if (station.href) {
        const stationPromise = fetch(station.href)
          .then((response) => response.text())
          .then((html) => {
            const match = /mp3:\s*"(http.*mp3)"/.exec(html);
            if (match) {
              station.streamUrl = match[1];
            }
          });

        stationPromises.push(stationPromise);
      }
    });

    await Promise.all(stationPromises);

    if (!MRadio.currentStation) {
      MRadio.currentStation = MRadio.stations[0];
    }
  },

  log(msg) {
    console.log('MRadio', msg);
  }
};

MRadio.fetchStations();

// expose to other extension pages (ex: popup)
window.MRadio = MRadio;

