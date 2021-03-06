// extension background page (invisible)
// it owns the <audio> element to play radio streams
// exposes a global MRadio object, with these properties
// - stations
// - setCurrentStation
// - fetchLivePrograms
// - volumeUp / volumeDown

const radioPlayer = document.querySelector('#radioPlayer');
radioPlayer.volume = 0.1;

radioPlayer.addEventListener('error', (event) => {
  console.log('audio error', event);
});

radioPlayer.addEventListener('pause', () => {
  chrome.browserAction.setBadgeText({ text: '' });
});

radioPlayer.addEventListener('playing', () => {
  chrome.browserAction.setBadgeText({ text: '▶︎' });
});

let refreshIntervalId;

chrome.browserAction.setBadgeBackgroundColor({ color: "#d40025" });

// view page source of https://mradio.fr/radio/webradio
// and search for load_prog
// key is station id, value is program id (in live.xml)
let stationProgramMap = {}

function mapPrograms(html = '') {
  stationProgramMap = {}

  // load_prog('7', 8);
  const re = /load_prog\('(\d+)', (\d+)\);/ig;
  let match;
  while ((match = re.exec(html)) !== null) {
    const programId = match[1];
    const stationId = match[2];
    stationProgramMap[stationId] = programId
  }
  console.log('stationProgramMap', stationProgramMap);
}

const MRadio = {
  stations: {}, // key is stationId
  currentStation: null,
  radioPlayer: radioPlayer,

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
      refreshIntervalId = setInterval(MRadio.fetchLivePrograms, 20000);
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

  getStationProgramId(stationId) {
    const stationIdInt = parseInt(stationId, 10)
    // if (stationIdInt === 12) {
    //   // load_prog('21', 12) should be load_prog('11', 12);
    //   return '11';
    // }
    // check in map, otherwise program id is "station id - 1"
    if (stationIdInt in stationProgramMap) {
      return stationProgramMap[stationIdInt];
    }
    return Math.max(0, stationIdInt - 1);
  },

  async fetchLivePrograms() {
    const response = await fetch('http://mradio.fr/winradio/live.xml?_=' + Date.now())
    const xml = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");

    const stationElems = doc.querySelectorAll('prog station');
    const programs = {}
    stationElems.forEach((stationElem) => {
      const programId = stationElem.id;
      const morceau1 = stationElem.querySelector('morceau[id="1"]');
      programs[programId] = {
        programId,
        currentSong: {
          artist: morceau1.querySelector('chanteur').textContent,
          title: morceau1.querySelector('chanson').textContent,
          cover: morceau1.querySelector('pochette').textContent
        }
      }
    });

    if (MRadio.currentStation) {
      const programId = MRadio.getStationProgramId(MRadio.currentStation.stationId);
      const program = programs[programId];
      let title;
      const song = program.currentSong;
      if (typeof song.artist !== 'undefined') {
        title = song.artist + ' - ';
      }
      title += song.title + ' - ';
      title += MRadio.currentStation.title;
      chrome.browserAction.setTitle({ title });
    }

    return programs;
  },

  async fetchStations() {
    MRadio.stations = [];

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

    mapPrograms(html)
  },

  log(msg) {
    console.log('MRadio', msg);
  }
};

MRadio.fetchStations();

// expose to other extension pages (ex: popup)
window.MRadio = MRadio;

