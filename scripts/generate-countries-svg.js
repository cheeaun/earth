const fs = require('fs');
const path = require('path');

const mapsiconDir = path.resolve(__dirname, '../node_modules/mapsicon/');

const countriesDir = path.resolve(__dirname, '../data/countries');
if (!fs.existsSync(countriesDir)) fs.mkdirSync(countriesDir);

const dirs = fs.readdirSync(mapsiconDir + '/all');
dirs.forEach(dir => {
  if (dir.length !== 2) return;
  const buffer = fs.readFileSync(mapsiconDir + '/all/' + dir + '/vector.svg');
  fs.writeFileSync(path.resolve(__dirname, '../data/countries/' + dir + '.svg'), buffer);
});
