((document, mapboxgl) => {
  if (!mapboxgl.supported()) {
    alert("Hi sorry, looks like your browser is not supported to render the map 😢.\n\nYou could try to load this site on another (latest) browser perhaps? 🙏");
    return;
  }

  mapboxgl.accessToken = 'pk.eyJ1IjoiY2hlZWF1biIsImEiOiJjaXhmb3o3bTEwMDAzMnRudTJuNjh1eXQ1In0.yO6WeKJwx6yIPoVx5aPavQ';

  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/cheeaun/cixol8ezg002g2rqs007w3jmt',
    maxZoom: 14,
    logoPosition: 'top-right',
    attributionControl: false,
    pitchWithRotate: false,
    dragRotate: false,
    boxZoom: false,
    zoom: 0.1,
  });
  map.touchZoomRotate.disableRotation();

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
  map.addControl(new mapboxgl.NavigationControl(), 'top-right');

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

    data.features = data.features.filter((f) => {
      const { id, country } = f.properties;
      const isUnique = !_places[id];
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
        const coordinates = f.geometry.coordinates;
        _countries[country].bounds.extend([coordinates[0], coordinates[1]]);
        _countries[country].places_count++;
        _places[id] = true;
      }
      _countries[country].checkins_count++;
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

    countries.sort((a, b) => b.checkins_count - a.checkins_count);
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
        'circle-color': '#14B7F4',
        'circle-opacity': .9,
        'circle-stroke-width': {
          property: 'point_count',
          stops: [
            [3, 3],
            [50, 6],
          ],
        },
        'circle-stroke-color': '#14B7F4',
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
        'circle-color': '#14B7F4',
        'circle-opacity': .9,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#14B7F4',
        'circle-stroke-opacity': .1,
      },
    });

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
      map.flyTo({
        center: e.lngLat,
        zoom: map.getZoom() + 2,
      });
    });

    map.on('mouseleave', 'cluster', () => {
      map.getCanvas().style.cursor = '';
    });

    const filterByDate = (startDate, endDate) => {
      map.setFilter('checkins', [
        'all',
        ['>=', 'date', startDate],
        ['<=', 'date', endDate],
        map.getFilter('checkins'),
      ]);
    };
    // TODO: filter by date
    // filterByDate(20160101, 20161212);
  });
})(document, mapboxgl);
