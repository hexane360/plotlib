import * as rollup from 'rollup';

import { rollupConfig } from './rollup-config';
import { genCss } from './gen-css';
import { genDts } from './gen-dts';

export async function watch() {
    const config = rollupConfig();
    const watcher = rollup.watch(config);

    console.log("Building...");

    watcher.on('event', async (event) => {
        if (event.code == 'BUNDLE_END') {
            event.result.close();

            const start_time = (new Date()).getTime();
            await genDts();
            await genCss();
            const end_time = (new Date()).getTime();

            console.log(`Built in ${event.duration + end_time - start_time} ms`);
        } else if (event.code == 'START') {
            console.log("Starting build...");
        } else if (event.code == 'ERROR') {
            console.error("Build error:");
            console.error(event.error.message);
        }
    });

    watcher.on('close', () => console.log("Stopped watching"));
}

(async () => { await watch(); })();