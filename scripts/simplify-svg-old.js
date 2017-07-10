const fs = require('fs');
const path = require('path');

const countriesDir = path.resolve(__dirname, '../data/countries/');
const files = fs.readdirSync(countriesDir);
files.forEach(file => {
  if (!/\.svg$/.test(file)) return;
  const filePath = path.resolve(countriesDir, file);
  const svg = fs.readFileSync(filePath, { encoding: 'utf-8' });

  const paper = require('paper');
  paper.setup();

  const [_, width, height] = svg.match(/viewBox="0 0 (\d+) (\d+)"/i) || [,0,0];
  const svgArea = width * height;
  const newSVG = svg.replace(/\sd="([^"]+)"/ig, (match, pathData) => {
    const path = new paper.CompoundPath({ pathData });
    path.simplify(4);
    path.flatten(20);
    const pathArea = Math.abs(Math.round(path.area));
    const areaPercentage = pathArea / svgArea * 100;
    // If the <path> covers less than 10% of the whole canvas, remove it
    if (areaPercentage <= 10) return ` d=""`;
    return ` d="${path.pathData}"`;
  });

  const outputPath = path.resolve(__dirname, '../data/countries/' + file);
  fs.writeFileSync(outputPath, newSVG);
});
