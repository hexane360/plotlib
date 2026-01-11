import { OutputOptions, rollup } from 'rollup';
import { rollupConfig } from './rollup-config';
import { genCss } from './gen-css';
import { genDts } from './gen-dts';

export async function build() {
    console.log("Building...");
    const config = rollupConfig();

    const build = await rollup(config);
    const outputs: OutputOptions[] = Array.isArray(config.output) ? config.output : [config.output!];

    await Promise.all(outputs.map((output) => build.write(output)));

    console.log("Bundled modules");

    await genDts();
    await genCss();
}

(async () => { await build(); })();