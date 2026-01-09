import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import { dts } from "rollup-plugin-dts";
import postcss from "rollup-plugin-postcss";
import meta from "./package.json" with { type: "json" };

const tsPlugin = typescript({
    tsconfig: './tsconfig.json',
    compilerOptions: {
        target: 'es6',
        declaration: true,
        declarationDir: 'dist',
    },
});

const postcssPlugin = postcss({
    extract: false,
    modules: true,
});

export default [
    {
        input: 'src/index.ts',
        output: [
            {
                dir: 'dist',
                format: 'esm',
                preserveModules: true,
                preserveModulesRoot: 'src',
                sourcemap: true,
                plugins: [],
            },
            /*
            {
                file: 'dist/bundle.js',
                name: meta.name,
                format: 'umd',
                banner: `// plotlib Version ${meta.version} MIT License`,
                sourcemap: true,
                plugins: [],
            },
            {
                file: 'dist/bundle.min.js',
                name: meta.name,
                format: 'iife',
                sourcemap: true,
                plugins: [terser()],
            },
            */
        ],
        plugins: [postcssPlugin, tsPlugin],
        external: ['react', 'react-dom', 'tslib', 'jotai', 'jotai/react', 'd3-format', 'd3-array', '@lume/kiwi', 'clsx'],
    },
    /*{
        input: 'src/index.ts',
        output: [{file: 'dist/bundle.d.ts', format: 'umd'}],
        plugins: [dts()],
        external: ['react', 'react-dom', 'tslib', 'jotai', 'jotai/react', 'd3-format', 'd3-array', '@lume/kiwi', 'clsx'],
    },*/
];