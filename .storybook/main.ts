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
        return config;
    },
};

export default config;
