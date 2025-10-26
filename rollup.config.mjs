import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import { dts } from "rollup-plugin-dts";
import meta from "./package.json" with { type: "json" };

const tsPlugin = typescript({
    tsconfig: './tsconfig.json',
    compilerOptions: {
        target: 'es5',
        declaration: true,
        declarationDir: 'dist',
    },
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
        ],
        plugins: [tsPlugin],
        external: ['react', 'react-dom', 'tslib'],
    },
    {
        input: 'src/index.ts',
        output: [{file: 'dist/bundle.d.ts', format: 'umd'}],
        plugins: [dts()],
    },
];