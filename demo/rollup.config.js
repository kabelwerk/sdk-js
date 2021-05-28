import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import serve from 'rollup-plugin-serve';


export default {
    input: 'src/index.js',
    output: {
        file: 'demo/kabelwerk.sdk.js',
        format: 'iife',
        name: 'Kabelwerk',
    },
    plugins: [
        nodeResolve(),
        commonjs(),
        serve({
            contentBase: 'demo',
            port: 8080
        }),
    ],
    watch: {
        clearScreen: false,
    }
};
