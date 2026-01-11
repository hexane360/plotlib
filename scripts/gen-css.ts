/// <reference types="node" />
import path from 'node:path';
import fs from 'fs-extra';

export async function genCss() {
    console.log("Generating CSS layer styles...");
    const stylePaths = ['dist/styles.css'];

    stylePaths.forEach((filePath) => {
        const directory = path.normalize(path.join(filePath, '..'));
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const fileContentWitLayer = `@layer plotlib {\n${fileContent}\n\n}`;
        fs.writeFileSync(path.join(directory, 'styles.layer.css'), fileContentWitLayer);
    });
}