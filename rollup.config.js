import postcss from 'rollup-plugin-postcss';
import autoprefixer from 'autoprefixer';
import clean from 'postcss-clean';

import commonjs from 'rollup-plugin-commonjs';
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
        autoprefixer({
          browsers: [
            'defaults',
            'not ie <= 10',
            'not Android <= 5',
            'not BlackBerry <= 7',
            'not ie_mob <= 10',
            'not op_mini all'
          ],
        }),
        clean(),
      ],
    }),
    resolve(),
    commonjs(),
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
