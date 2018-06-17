import postcss from 'rollup-plugin-postcss';
import autoprefixer from 'autoprefixer';
import clean from 'postcss-clean';

import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import { uglify } from 'rollup-plugin-uglify';

export default {
  input: 'assets/app.raw.js',
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
  output: {
    file: 'assets/app.js',
    format: 'iife',
    sourcemap: true,
  },
};
