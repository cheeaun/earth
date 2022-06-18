import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken =
  'pk.eyJ1IjoiY2hlZWF1biIsImEiOiJjam9yZDY3OGkwZGVkM3dsaGQ3c3B5YWdpIn0.sg3ArlzdkBagspUgNEOyMA';

const color = '#14B7F4';

const map = (window._map = new mapboxgl.Map({
  container: 'map',
  // style: 'mapbox://styles/mapbox/satellite-v9',
  style: 'mapbox://styles/cheeaun/ckbm8ln3w15d01ilp38k7xll8',
  // style: 'mapbox://styles/mapbox/streets-v11',
  maxZoom: 16,
  logoPosition: 'top-right',
  attributionControl: false,
  boxZoom: false,
  zoom: 0.5,
  minZoom: 0.5,
  projection: 'globe',
  center: [103.8198, 1.3521], // Singapore
}));

// const $info = document.getElementById('info');
const $infoCountries = document.getElementById('info-countries');
const $infoPlaces = document.getElementById('info-places');
const $infoCheckins = document.getElementById('info-checkins');
const $countries = document.getElementById('countries');

const bodyClass = document.body.classList;
function startInteractive() {
  bodyClass.add('interactive');
}
map.on('dragstart', startInteractive);
map.on('zoomstart', startInteractive);

function endInteractive() {
  bodyClass.remove('interactive');
}
$countries.addEventListener('touchstart', endInteractive, false);
$countries.addEventListener('mouseenter', endInteractive);

function toggleInteractive() {
  bodyClass.toggle('interactive');
}
map.on('click', toggleInteractive);

const numberWithCommas = (x) =>
  x > 999 ? x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : x;

map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'top-right');

class LayersControl {
  onAdd(map) {
    const container = document.createElement('div');
    container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';

    const linesButton = document.createElement('button');
    linesButton.innerHTML = `<svg width='20' height='20' viewBox='0 0 24 24'>
      <path d='M23 8c0 1.1-.9 2-2 2-.18 0-.35-.02-.5-.07l-3.57 3.55c.05.16.07.34.07.52 0 1.1-.9 2-2 2s-2-.9-2-2c0-.18.02-.36.07-.52l-2.55-2.55c-.16.05-.34.07-.52.07s-.36-.02-.52-.07L4.93 15.5c.05.15.07.32.07.5 0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.18 0 .35.02.5.07l4.57-4.55C8.02 9.36 8 9.18 8 9c0-1.1.9-2 2-2s2 .9 2 2c0 .18-.02.36-.07.52l2.55 2.55c.16-.05.34-.07.52-.07s.36.02.52.07l3.55-3.56c-.05-.14-.07-.3-.07-.5 0-1.1.9-2 2-2s2 .9 2 2z'/>
    </svg>`;
    linesButton.type = 'button';
    linesButton.title = 'Show/hide journey lines';
    linesButton.addEventListener(
      'click',
      () => {
        const visibility = map.getLayoutProperty('lines', 'visibility');
        if (visibility === 'visible') {
          map.setLayoutProperty('lines', 'visibility', 'none');
          linesButton.classList.remove('active');
        } else {
          map.setLayoutProperty('lines', 'visibility', 'visible');
          linesButton.classList.add('active');
        }
      },
      false,
    );

    container.appendChild(linesButton);
    return container;
  }
}
map.addControl(new LayersControl(), 'top-right');

map.addControl(new mapboxgl.NavigationControl(), 'top-right');

// let slider;
// class PitchControl {
//   onAdd() {
//     const container = document.createElement('div');
//     container.className = 'mapboxgl-ctrl pitch-ctrl';

//     container.innerHTML = `<svg viewBox='0 0 24 24'>
//       <title>Pitch</title>
//       <path d='M14 6l-3.8 5 3 3.8-1.7 1.2L7 10l-6 8h22L14 6z'/>
//     </svg>`;

//     slider = document.createElement('input');
//     slider.type = 'range';
//     slider.step = 5;
//     slider.min = slider.value = 0;
//     slider.max = 60;
//     slider.className = 'pitch-slider';
//     slider.addEventListener('change', (e) => {
//       map.easeTo({ pitch: e.target.value });
//     }, false);

//     container.appendChild(slider);
//     return container;
//   }
// }
// map.addControl(new PitchControl(), 'top-right');
// map.on('pitchend', () => {
//   slider.value = map.getPitch();
// });

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
}

const dataUrl = new URL('../data/checkins.min.json', import.meta.url);

map.once('load', async () => {
  const data = await fetch(dataUrl).then((res) => res.json());
  const _countries = {};
  const _places = {};

  const checkinsCount = data.features.length;

  const lines = [];

  data.features = data.features.filter((f, i) => {
    const { id, country } = f.properties;
    const isUnique = !_places[id];
    const [lng, lat] = f.geometry.coordinates;
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
      _countries[country].bounds.extend([lng, lat]);
      _countries[country].places_count++;
      _places[id] = true;
    }
    _countries[country].checkins_count++;

    const nextFeature = data.features[i + 1];
    if (nextFeature && f.properties.date === nextFeature.properties.date) {
      let [nextLng, nextLat] = nextFeature.geometry.coordinates;
      // Magic below from https://github.com/mapbox/mapbox-gl-js/issues/3250#issuecomment-294887678
      // This make sure the lines can cross the 180th meridian
      nextLng += nextLng - lng > 180 ? -360 : lng - nextLng > 180 ? 360 : 0;
      lines.push([
        [lng, lat],
        [nextLng, nextLat],
      ]);
    }

    return isUnique;
  });

  map.getSource('checkins').setData(data);
  map.getSource('lines').setData({
    type: 'Feature',
    geometry: {
      type: 'MultiLineString',
      coordinates: lines,
    },
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
    $button.addEventListener(
      'click',
      (e) => {
        map.fitBounds(bounds, { padding: 150 });
      },
      false,
    );
    $button.innerHTML = `
      <img src="data/countries/${cc}.svg" intrinsicsize="50x50" width="50" height="50" alt="">
      <br>
      <b>${name}</b>
      <br>
      ${numberWithCommas(checkins_count)} check-in${
      checkins_count > 1 ? 's' : ''
    }
      <br>
      ${numberWithCommas(places_count)} place${places_count > 1 ? 's' : ''}
    `;
    $countries.appendChild($button);
  });

  requestAnimationFrame(() => {
    renderNumber($infoCheckins, checkinsCount);
    renderNumber($infoPlaces, placesCount);
    renderNumber($infoCountries, countriesCount);
    bodyClass.add('render');
  });
});

map.once('styledata', () => {
  map.setFog({
    color: 'rgba(255,255,255,.5)',
    'high-color': color,
    'horizon-blend': 0.025,
  });

  map.addSource('checkins', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [],
    },
    cluster: true,
    clusterMaxZoom: 10,
    clusterRadius: 10,
    tolerance: 10,
    buffer: 0,
  });

  map.addLayer({
    id: 'cluster',
    type: 'circle',
    source: 'checkins',
    filter: ['has', 'point_count'],
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['get', 'point_count'],
        3,
        7,
        10,
        10,
        100,
        13,
        200,
        16,
      ],
      'circle-color': color,
      'circle-opacity': 0.9,
      'circle-stroke-width': [
        'interpolate',
        ['linear'],
        ['get', 'point_count'],
        3,
        3,
        50,
        6,
      ],
      'circle-stroke-color': '#fff',
      'circle-stroke-opacity': 0.3,
    },
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
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3, 16, 6],
      'circle-color': color,
      'circle-opacity': 0.9,
      'circle-stroke-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        12,
        1,
        16,
        3,
      ],
      'circle-stroke-color': '#fff',
      'circle-stroke-opacity': 0.1,
    },
  });

  const canvas = map.getCanvas();
  map.on('mouseenter', 'cluster', () => {
    canvas.style.cursor = 'pointer';
  });

  map.on('click', 'cluster', (e) => {
    e.originalEvent.stopPropagation();
    map.flyTo({
      center: e.lngLat,
      zoom: map.getZoom() + 2,
    });
  });

  map.on('mouseleave', 'cluster', () => {
    canvas.style.cursor = '';
  });

  map.addSource('lines', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [],
    },
    tolerance: 10,
    buffer: 0,
  });
  map.addLayer({
    id: 'lines',
    type: 'line',
    source: 'lines',
    layout: {
      visibility: 'none',
    },
    paint: {
      'line-color': '#fff',
      'line-opacity': 0.3,
    },
  });

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
    const reload = confirm(
      'Oops, the map is acting weird now. Reload this page? 😅',
    );
    if (reload) location.reload();
    console.error(e);
  };
  map.on('error', err);
  window.onerror = err;
});
