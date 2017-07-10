const fs = require('fs');
const path = require('path');

const countriesDir = path.resolve(__dirname, '../data/countries/');
const files = fs.readdirSync(countriesDir);
files.forEach(file => {
  if (!/\.svg$/.test(file)) return;
  console.log(`Simplifying ${file}...`);
  const filePath = path.resolve(countriesDir, file);
  const svg = fs.readFileSync(filePath, { encoding: 'utf-8' });

  const paper = require('paper');
  paper.setup();

  let onePath = new paper.CompoundPath('');
  const newSVG = svg.replace(/\sd="([^"]+)"/ig, (match, pathData) => {
    const path = new paper.CompoundPath(pathData);
    onePath = onePath.unite(path);
  });

  onePath.scale(0.075);
  let { x, y } = onePath.bounds;
  onePath.translate(new paper.Point(-x, -y));
  onePath.flatten(20);

  const optimizedSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${onePath.bounds.width} ${onePath.bounds.height}">
      <path d="${onePath.pathData}"/>
    </svg>`;
  const outputPath = path.resolve(__dirname, '../data/countries/' + file);
  fs.writeFileSync(outputPath, optimizedSVG);

  console.log(`Simplified ${(svg.length/1024).toPrecision(2)}KB -> ${(optimizedSVG.length/1024).toPrecision(2)}KB\n`);
});
