import fs from 'fs';
import { execSync } from 'child_process';

try {
    console.log('Bundling documentation...');
    
    // Read the source files
    const docsHtml = fs.readFileSync('docs.html', 'utf8');
    const tulwebCss = fs.readFileSync('tulweb.css', 'utf8');

    // Use esbuild to bundle docs.js and its dependencies (tulweb.js)
    // We use iife format to ensure it runs immediately in the browser without modules
    const bundledJs = execSync('npx -y esbuild docs.js --bundle --minify --format=iife').toString();

    let bundledHtml = docsHtml;

    // Inline CSS
    bundledHtml = bundledHtml.replace('<link rel="stylesheet" href="tulweb.css">', `<style>\n${tulwebCss}\n</style>`);

    // Replace JS tag - Note: we remove type="module" because it's now a bundled IIFE
    bundledHtml = bundledHtml.replace('<script type="module" src="docs.js"></script>', `<script>\n${bundledJs}\n</script>`);

    fs.writeFileSync('docs-bundle.html', bundledHtml);
    
    console.log('Success! Documentation successfully bundled into docs-bundle.html');
} catch (error) {
    console.error('Bundling failed:', error.message);
    process.exit(1);
}
