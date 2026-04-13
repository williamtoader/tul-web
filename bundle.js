import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function bundlePage(sourceHtml, sourceJs, outputHtml) {
    try {
        console.log(`Bundling ${sourceHtml}...`);
        
        // Read the source files
        let html = fs.readFileSync(sourceHtml, 'utf8');

        // Inline CSS
        // Find all <link rel="stylesheet" href="..."> and replace with <style> content
        const cssRegExp = /<link rel="stylesheet" href="([^"]+)">/g;
        let match;
        let bundledHtml = html;
        
        while ((match = cssRegExp.exec(html)) !== null) {
            const fullTag = match[0];
            const cssFileName = match[1];
            
            // Resolve path relative to the HTML file
            const cssPath = path.join(path.dirname(sourceHtml), cssFileName);
            
            // Only handle local files
            if (!cssFileName.startsWith('http') && fs.existsSync(cssPath)) {
                console.log(`  - Inlining ${cssFileName}...`);
                const cssContent = fs.readFileSync(cssPath, 'utf8');
                bundledHtml = bundledHtml.replace(fullTag, `<style>\n${cssContent}\n</style>`);
            }
        }

        // Use esbuild to bundle JS and its dependencies
        console.log(`  - Bundling ${sourceJs} with esbuild...`);
        const bundledJs = execSync(`npx -y esbuild ${sourceJs} --bundle --minify --format=iife`).toString();

        // Replace JS tag - Note: we remove type="module" because it's now a bundled IIFE
        // Use a more robust regex for the script tag
        // Get the filename of the source JS for regex
        const jsFileName = path.basename(sourceJs);
        const scriptRegExp = new RegExp(`<script type="module" src="${jsFileName}"></script>`, 'g');
        bundledHtml = bundledHtml.replace(scriptRegExp, `<script>\n${bundledJs}\n</script>`);

        fs.writeFileSync(outputHtml, bundledHtml);
        
        console.log(`Success! ${sourceHtml} bundled into ${outputHtml}`);
    } catch (error) {
        console.error(`Bundling ${sourceHtml} failed:`, error.message);
        throw error;
    }
}

try {
    // Bundle Documentation
    bundlePage('docs/docs.html', 'docs/docs.js', 'docs-bundle.html');
    
    console.log(''); // New line
    
    // Bundle Index
    bundlePage('demo/index.html', 'demo/app.js', 'index-bundle.html');

} catch (error) {
    process.exit(1);
}

