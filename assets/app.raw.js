import './app.raw.css';
import fetch from 'unfetch';

const color = '#14B7F4';

if (!mapboxgl.supported()) {
  alert("Hi sorry, looks like your browser is not supported to render the map 😢.\n\nYou could try to load this site on another (latest) browser perhaps? 🙏");
}

mapboxgl.accessToken = 'pk.eyJ1IjoiY2hlZWF1biIsImEiOiJjaXhmb3o3bTEwMDAzMnRudTJuNjh1eXQ1In0.yO6WeKJwx6yIPoVx5aPavQ';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/cheeaun/cixol8ezg002g2rqs007w3jmt?optimize=true',
  maxZoom: 15.5,
  logoPosition: 'top-right',
  attributionControl: false,
  boxZoom: false,
  zoom: 0.1,
});

const $info = document.getElementById('info');
const $infoCountries = document.getElementById('info-countries');
const $infoPlaces = document.getElementById('info-places');
const $infoCheckins = document.getElementById('info-checkins');
const $countries = document.getElementById('countries');

const bodyClass = document.body.classList;
function startInteractive(){
  bodyClass.add('interactive');
}
map.on('dragstart', startInteractive);
map.on('zoomstart', startInteractive);

function endInteractive(){
  bodyClass.remove('interactive');
}
$countries.addEventListener('touchstart', endInteractive, false);
$countries.addEventListener('mouseenter', endInteractive);

function toggleInteractive(){
  bodyClass.toggle('interactive');
}
map.on('click', toggleInteractive);

const numberWithCommas = x => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'top-right');

class LayersControl {
  onAdd(map) {
    const container = document.createElement('div');
    container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';

    const linesButton = document.createElement('button');
    linesButton.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M23 8c0 1.1-.9 2-2 2-.18 0-.35-.02-.5-.07l-3.57 3.55c.05.16.07.34.07.52 0 1.1-.9 2-2 2s-2-.9-2-2c0-.18.02-.36.07-.52l-2.55-2.55c-.16.05-.34.07-.52.07s-.36-.02-.52-.07L4.93 15.5c.05.15.07.32.07.5 0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.18 0 .35.02.5.07l4.57-4.55C8.02 9.36 8 9.18 8 9c0-1.1.9-2 2-2s2 .9 2 2c0 .18-.02.36-.07.52l2.55 2.55c.16-.05.34-.07.52-.07s.36.02.52.07l3.55-3.56c-.05-.14-.07-.3-.07-.5 0-1.1.9-2 2-2s2 .9 2 2z"/>
    </svg>`;
    linesButton.type = 'button';
    linesButton.title = 'Show/hide journey lines';
    linesButton.addEventListener('click', () => {
      const visibility = map.getLayoutProperty('lines', 'visibility');
      if (visibility === 'visible') {
        map.setLayoutProperty('lines', 'visibility', 'none');
        linesButton.classList.remove('active');
      } else {
        map.setLayoutProperty('lines', 'visibility', 'visible');
        linesButton.classList.add('active');
      }
    }, false);

    container.appendChild(linesButton);
    return container;
  }
}
map.addControl(new LayersControl(), 'top-right');

map.addControl(new mapboxgl.NavigationControl(), 'top-right');

let slider;
class PitchControl {
  onAdd() {
    const container = document.createElement('div');
    container.className = 'mapboxgl-ctrl pitch-ctrl';

    container.innerHTML = `<svg viewBox="0 0 24 24">
      <title>Pitch</title>
      <path d="M14 6l-3.8 5 3 3.8-1.7 1.2L7 10l-6 8h22L14 6z"/>
    </svg>`;

    slider = document.createElement('input');
    slider.type = 'range';
    slider.step = 5;
    slider.min = slider.value = 0;
    slider.max = 60;
    slider.className = 'pitch-slider';
    slider.addEventListener('change', (e) => {
      map.easeTo({ pitch: e.target.value });
    }, false);

    container.appendChild(slider);
    return container;
  }
}
map.addControl(new PitchControl(), 'top-right');
map.on('pitchend', () => {
  slider.value = map.getPitch();
});

function renderNumber(el, number) {
  const frames = 60;
  const inc = Math.ceil(number / frames);
  let num = 0;
  function render() {
    if (num >= number) return;
    num = num + inc;
    if (num > number) num = number;
    el.textContent = numberWithCommas(num);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
};

Promise.all([
  new Promise((resolve, reject) => {
    map.on('load', resolve);
    map.on('error', reject);
  }),
  fetch('data/checkins.min.geojson').then((data) => data.json()),
]).then(([_, data]) => {
  const _countries = {};
  const _places = {};

  const checkinsCount = data.features.length;

  const lines = [];

  data.features = data.features.filter((f, i) => {
    const { id, country } = f.properties;
    const isUnique = !_places[id];
    const [lat, lng] = f.geometry.coordinates;
    if (isUnique) {
      if (!_countries[country]) {
        const cc = f.properties.cc.toLowerCase();
        _countries[country] = {
          cc: cc,
          bounds: new mapboxgl.LngLatBounds(),
          places_count: 0,
          checkins_count: 0,
        };
      }
      _countries[country].bounds.extend([lat, lng]);
      _countries[country].places_count++;
      _places[id] = true;
    }
    _countries[country].checkins_count++;

    const nextFeature = data.features[i+1];
    if (nextFeature && f.properties.date === nextFeature.properties.date){
      let [ nextLat, nextLng ] = nextFeature.geometry.coordinates;
      // Magic below from https://github.com/mapbox/mapbox-gl-js/issues/3250#issuecomment-294887678
      // This make sure the lines can cross the 180th meridian
      nextLat += nextLat - lat > 180 ? -360 : lat - nextLat > 180 ? 360 : 0;
      lines.push([[lat, lng], [nextLat, nextLng]]);
    }

    return isUnique;
  });

  const placesCount = Object.keys(_places).length;

  const countries = Object.keys(_countries).map((country) => {
    const c = _countries[country];
    return {
      name: country,
      cc: c.cc,
      bounds: c.bounds,
      places_count: c.places_count,
      checkins_count: c.checkins_count,
    };
  });

  const countriesCount = countries.length;

  countries.sort((a, b) => b.places_count - a.places_count);
  countries.forEach((country, i) => {
    const { cc, name, bounds, checkins_count, places_count } = country;
    const $button = document.createElement('button');
    $button.type = 'button';
    $button.addEventListener('click', (e) => {
      map.fitBounds(bounds, { padding: 150 });
    }, false);
    $button.innerHTML = `
      <img src="data/countries/${cc}.svg" width="50" height="50" alt=""><br>
      <b>${name}</b>
      <br>
      ${numberWithCommas(checkins_count)} check-in${checkins_count > 1 ? 's' : ''}
      <br>
      ${numberWithCommas(places_count)} place${places_count > 1 ? 's' : ''}
    `;
    $countries.appendChild($button);
  });

  const layers = map.getStyle().layers.reverse();
  const labelLayerIdx = layers.findIndex(function (layer) {
    return layer.type !== 'symbol';
  });
  const labelLayerId = labelLayerIdx !== -1 ? layers[labelLayerIdx].id : undefined;

  map.addSource('checkins', {
    type: 'geojson',
    data: data,
    cluster: true,
    clusterMaxZoom: 10,
    clusterRadius: 10,
  });

  map.addLayer({
    id: 'cluster',
    type: 'circle',
    source: 'checkins',
    filter: ['has', 'point_count'],
    paint: {
      'circle-radius': {
        property: 'point_count',
        stops: [
          [{zoom: 0, value: 3}, 7],
          [{zoom: 0, value: 10}, 10],
          [{zoom: 0, value: 100}, 13],
          [{zoom: 0, value: 200}, 16],
        ],
      },
      'circle-color': color,
      'circle-opacity': .9,
      'circle-stroke-width': {
        property: 'point_count',
        stops: [
          [3, 3],
          [50, 6],
        ],
      },
      'circle-stroke-color': color,
      'circle-stroke-opacity': .3,
    }
  });

  map.addLayer({
    id: 'checkins-count',
    type: 'symbol',
    source: 'checkins',
    filter: ['has', 'point_count'],
    maxzoom: 11,
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-size': 10,
    },
  });

  map.addLayer({
    id: 'checkins',
    type: 'circle',
    source: 'checkins',
    minzoom: 8,
    filter: ['!has', 'point_count'],
    paint: {
      'circle-radius': 3,
      'circle-color': color,
      'circle-opacity': .9,
      'circle-stroke-width': 3,
      'circle-stroke-color': color,
      'circle-stroke-opacity': .1,
    },
  }, labelLayerId);

  map.once('data', () => {
    requestAnimationFrame(() => {
      renderNumber($infoCheckins, checkinsCount);
      renderNumber($infoPlaces, placesCount);
      renderNumber($infoCountries, countriesCount);
      bodyClass.add('render');
    });
  });

  map.on('mouseenter', 'cluster', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('click', 'cluster', (e) => {
    e.originalEvent.stopPropagation();
    map.flyTo({
      center: e.lngLat,
      zoom: map.getZoom() + 2,
    });
  });

  map.on('mouseleave', 'cluster', () => {
    map.getCanvas().style.cursor = '';
  });

  map.addLayer({
    id: 'lines',
    type: 'line',
    source: {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'MultiLineString',
          coordinates: lines,
        },
      },
    },
    layout: {
      visibility: 'none',
    },
    paint: {
      'line-color': "#fff",
      'line-opacity': .3,
    },
  }, labelLayerId);

  map.addLayer({
    id: '3d-buildings',
    source: 'composite',
    'source-layer': 'building',
    filter: ['==', 'extrude', 'true'],
    type: 'fill-extrusion',
    minzoom: 15,
    paint: {
      'fill-extrusion-color': '#999',
      'fill-extrusion-height': {
        type: 'identity',
        property: 'height',
      },
      'fill-extrusion-base': {
        type: 'identity',
        property: 'min_height',
      },
      'fill-extrusion-opacity': .6,
    },
  }, labelLayerId);

  // TODO: filter by date
  // const filterByDate = (startDate, endDate) => {
  //   map.setFilter('checkins', [
  //     'all',
  //     ['>=', 'date', startDate],
  //     ['<=', 'date', endDate],
  //     map.getFilter('checkins'),
  //   ]);
  // };
  // filterByDate(20160101, 20161212);

  const err = (e) => {
    const reload = confirm('Oops, the map is acting weird now. Reload this page? 😅');
    if (reload) location.reload();
    console.error(e);
  };
  map.on('error', err);
  window.onerror = err;
});
