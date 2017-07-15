import postcss from 'rollup-plugin-postcss';
import autoprefixer from 'autoprefixer';
import clean from 'postcss-clean';

import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import uglify from 'rollup-plugin-uglify';

export default {
  entry: 'assets/app.raw.js',
  format: 'iife',
  plugins: [
    postcss({
      sourceMap: true,
      extract: 'assets/app.css',
      plugins: [
        autoprefixer(),
        clean(),
      ],
    }),
    resolve(),
    babel({
      exclude: 'node_modules/**'
    }),
    uglify(),
  ],
  dest: 'assets/app.js',
  sourceMap: true,
};
