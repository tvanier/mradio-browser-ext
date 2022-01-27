console.log(Date.now(), 'start');

const createPopup = (MRadio) => {
  const popup = {
    tryingToPlay: ko.observable(),
    playerPaused: ko.observable(MRadio.playerPaused()),
    playerVolume: ko.observable(),
    currentStation: ko.observable(),
    showStationList: ko.observable()
  };

  MRadio.radioPlayer.addEventListener('playing', () => {
    popup.tryingToPlay(false);
    popup.playerPaused(false);
  });

  MRadio.radioPlayer.addEventListener('pause', () => {
    popup.tryingToPlay(false);
    popup.playerPaused(true);
  });

  popup.stations = ko.observableArray([]);

  popup.populateStations = () => {
    popup.stations.removeAll();

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

        const programId = MRadio.getStationProgramId(station.stationId);
        const program = MRadio.programs()[programId];
        if (program) {
          observableStation.currentSong(program.currentSong);
        }
      }
    });

    console.log('stations', popup.stations());
  };

  popup.populateStations();

  popup.toggleStationList = () => {
    popup.showStationList(!popup.showStationList());
    if (popup.showStationList()) {
      MRadio.startFetchLivePrograms();
    }
  };

  popup.selectStation = (station, autoPlay = true) => {
    popup.currentStation(station);
    popup.showStationList(false);
    MRadio.startFetchLivePrograms({ station });

    if (autoPlay) {
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

  // popup.fetchLivePrograms = async () => {
  //   const programs = await MRadio.fetchLivePrograms();

  MRadio.programs.subscribe((programs) => {
    popup.stations().forEach((station) => {
      const programId = MRadio.getStationProgramId(station.stationId);
      const program = programs[programId];
      if (program) {
        station.currentSong(program.currentSong);
        station.currentSong.valueHasMutated();
      } else {
        console.log('no program for', station)
      }
    })
  });

  popup.refreshStations = async () => {
    await MRadio.fetchStations();
    popup.populateStations();
    MRadio.startFetchLivePrograms();
  };

  popup.currentSong = ko.computed(() => {
    return popup.currentStation() && popup.currentStation().currentSong();
  });

  popup.currentStation.subscribe((currentStation) => {
    MRadio.setCurrentStation(currentStation.stationId);
  });

  if (!popup.currentStation()) {
    popup.selectStation(popup.stations()[0], false);
  }
  console.log('currentStation', popup.currentStation());

  return popup;
};


chrome.runtime.getBackgroundPage((bgWindow) => {
  console.log(Date.now(), 'got background page');

  const MRadio = bgWindow.MRadio;

  const popup = createPopup(MRadio);
  window.popup = popup; // debugging

  window.onclose = () => MRadio.onHidden();

  setTimeout(() => {
    const loading = document.getElementById('loading');
    loading.style.display = 'none';

    ko.applyBindings(popup, document.getElementById('popup'));
    console.log(Date.now(), 'applied bindings');
  }, 100);
});
