import { $ } from 'zx';

export async function genDts() {
    console.log("Generating .d.ts files...");
    await $`npx tsc --project tsconfig.build.json`;
}