import { generateScopedName } from 'hash-css-selector';
import { RollupOptions } from 'rollup';
import esbuild from 'rollup-plugin-esbuild';
import postcss from "rollup-plugin-postcss";

export function rollupConfig(): RollupOptions {
    const plugins = [
        esbuild({
            tsconfig: 'tsconfig.json',
            target: 'esnext',
            minify: true,
        }),
        postcss({
            extract: 'styles.css',
            modules: { generateScopedName },
        }),
    ];

    return {
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
        ],
        external: [
            'react', 'react-dom', 'react/jsx-runtime',
            'tslib', 'jotai', 'jotai/react',
            'd3-format', 'd3-array', 'd3-interpolate', 'd3-color',
            '@lume/kiwi', 'clsx',
        ],
        plugins,
        onLog: (level, { message }) => {
            switch (level) {
                case 'warn': return console.warn(message);
                case 'debug': return console.debug(message);

                default: return console.info(message);
            }
        }
    } satisfies RollupOptions;
}