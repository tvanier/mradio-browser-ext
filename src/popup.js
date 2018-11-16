console.log(Date.now(), 'start');

const createPopup = (MRadio) => {
  const popup = {
    tryingToPlay: ko.observable(),
    playerPaused: ko.observable(MRadio.playerPaused()),
    playerVolume: ko.observable(),
    currentStation: ko.observable(),
    showStationList: ko.observable()
  };

  popup.stations = ko.observableArray([]);
  Object.keys(MRadio.stations).forEach((stationId) => {
    const station = MRadio.stations[stationId];
    const observableStation = {
      stationId: station.stationId,
      title: station.title,
      logo: station.logo,
      streamUrl: station.streamUrl,
      currentSong: ko.observable()
    };
    popup.stations.push(observableStation);
    if (MRadio.currentStation && MRadio.currentStation.stationId === observableStation.stationId) {
      popup.currentStation(observableStation);
    }
  });

  console.log('stations', popup.stations());

  popup.toggleStationList = () => {
    popup.showStationList(!popup.showStationList());
  };

  popup.selectStation = (station) => {
    popup.currentStation(station);
    popup.showStationList(false);

    if (!popup.playerPaused()) {
      popup.pauseRadio();
      popup.playRadio();
    }
  };

  popup.playRadio = async () => {
    try {
      popup.tryingToPlay(true);
      await MRadio.playRadio();
      popup.tryingToPlay(false);
      popup.playerPaused(false);
    } catch(e) {
      console.log('playRadio error', e);
      popup.tryingToPlay(false);
    }
  };

  popup.pauseRadio = () => {
    popup.playerPaused(true);
    MRadio.pauseRadio();
  };

  popup.volumeDown = () => popup.playerVolume(MRadio.volumeDown());
  popup.volumeUp = () => popup.playerVolume(MRadio.volumeUp());

  popup.fetchLiveProgram = async () => {
    const liveStations = await MRadio.fetchLiveProgram();

    liveStations.forEach((liveStation) => {
      const station = popup.stations().find((s) => s.stationId == liveStation.stationId);
      if (station) {
        station.currentSong(liveStation.currentSong);
      }
    })
  };

  popup.currentSong = ko.computed(() => {
    return popup.currentStation() && popup.currentStation().currentSong();
  });

  popup.currentStation.subscribe((currentStation) => {
    MRadio.setCurrentStation(currentStation.stationId);
    MRadio.playRadio();
    popup.fetchLiveProgram();
  });

  return popup;
};


chrome.runtime.getBackgroundPage((bgWindow) => {
  console.log(Date.now(), 'got background page');

  const MRadio = bgWindow.MRadio;

  const popup = createPopup(MRadio);
  window.popup = popup; // debugging

  setTimeout(() => {
    const loading = document.getElementById('loading');
    loading.style.display = 'none';

    ko.applyBindings(popup, document.getElementById('popup'));
    console.log(Date.now(), 'applied bindings');

    console.log(Date.now(), 'start fetch program');
    MRadio.fetchLiveProgram();
    console.log(Date.now(), 'got program');

    popup.fetchLiveProgram();
    setInterval(popup.fetchLiveProgram, 20000);
  }, 100);
});
