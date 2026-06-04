import path from 'node:path';
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
    stories: ['../src/**/*.stor(y|ies).@(ts|tsx)'],
    addons: ['@storybook/addon-vitest'],
    framework: {
        name: '@storybook/react-vite',
        options: {},
    },
    viteFinal: async (config) => {
        config.resolve ??= {};
        config.resolve.alias = {
            ...config.resolve.alias,
            '@hexane/plotlib': path.resolve(import.meta.dirname, '../src/index.ts'),
        };
        config.esbuild = {
            ...config.esbuild, jsx: 'automatic',
        };
        // Force Vite 6 to eagerly pre-bundle React before any browser test tab
        // opens. Without this, lazy optimization races with parallel test startup
        // and React's default export transiently resolves to null.
        config.optimizeDeps = {
            ...config.optimizeDeps,
            include: [
                ...(config.optimizeDeps?.include ?? []),
                'react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime',
            ],
        };
        return config;
    },
};

export default config;
