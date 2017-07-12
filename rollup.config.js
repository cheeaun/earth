import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import uglify from 'rollup-plugin-uglify';

export default {
  entry: 'assets/app.raw.js',
  format: 'iife',
  plugins: [
    resolve(),
    babel({
      exclude: 'node_modules/**'
    }),
    uglify(),
  ],
  dest: 'assets/app.js',
  sourceMap: true,
};
