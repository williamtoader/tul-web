import fs from 'fs';
import { execSync } from 'child_process';

function bundlePage(sourceHtml, sourceJs, outputHtml, cssFile = 'tulweb.css') {
    try {
        console.log(`Bundling ${sourceHtml}...`);
        
        // Read the source files
        const html = fs.readFileSync(sourceHtml, 'utf8');
        const css = fs.readFileSync(cssFile, 'utf8');

        // Use esbuild to bundle JS and its dependencies
        console.log(`  - Bundling ${sourceJs} with esbuild...`);
        const bundledJs = execSync(`npx -y esbuild ${sourceJs} --bundle --minify --format=iife`).toString();

        let bundledHtml = html;

        // Inline CSS
        bundledHtml = bundledHtml.replace(`<link rel="stylesheet" href="${cssFile}">`, `<style>\n${css}\n</style>`);

        // Replace JS tag - Note: we remove type="module" because it's now a bundled IIFE
        bundledHtml = bundledHtml.replace(`<script type="module" src="${sourceJs}"></script>`, `<script>\n${bundledJs}\n</script>`);

        fs.writeFileSync(outputHtml, bundledHtml);
        
        console.log(`Success! ${sourceHtml} bundled into ${outputHtml}`);
    } catch (error) {
        console.error(`Bundling ${sourceHtml} failed:`, error.message);
        throw error;
    }
}

try {
    // Bundle Documentation
    bundlePage('docs.html', 'docs.js', 'docs-bundle.html');
    
    console.log(''); // New line
    
    // Bundle Index
    bundlePage('index.html', 'app.js', 'index-bundle.html');

} catch (error) {
    process.exit(1);
}

