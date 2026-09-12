import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Bundle & Performance Integrity Audit (apps/web/dist)', () => {
  const distDir = path.resolve(__dirname, '../../../dist');

  it('verifies apps/web/dist directory and core files exist', () => {
    expect(fs.existsSync(distDir)).toBe(true);
    expect(fs.existsSync(path.join(distDir, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(distDir, 'sw.js'))).toBe(true);
    expect(fs.existsSync(path.join(distDir, 'manifest.webmanifest'))).toBe(true);
    expect(fs.existsSync(path.join(distDir, 'favicon.svg'))).toBe(true);
    expect(fs.existsSync(path.join(distDir, 'pwa-192x192.png'))).toBe(true);
    expect(fs.existsSync(path.join(distDir, 'pwa-512x512.png'))).toBe(true);
    expect(fs.existsSync(path.join(distDir, 'assets'))).toBe(true);
  });

  it('verifies all script and link tags in index.html resolve to real files', () => {
    const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');

    // Extract all src="..." and href="..."
    const srcMatches = Array.from(indexHtml.matchAll(/src="\/([^"]+)"/g)).map((m) => m[1]);
    const hrefMatches = Array.from(indexHtml.matchAll(/href="\/([^"]+)"/g)).map((m) => m[1]);

    const allReferences = [...srcMatches, ...hrefMatches];
    expect(allReferences.length).toBeGreaterThan(0);

    for (const ref of allReferences) {
      if (!ref) continue;
      const filePath = path.join(distDir, ref);
      const exists = fs.existsSync(filePath);
      expect(exists, `Referenced asset /${ref} must exist in dist`).toBe(true);
      const stat = fs.statSync(filePath);
      expect(stat.size, `Referenced asset /${ref} must not be empty`).toBeGreaterThan(0);
    }
  });

  it('verifies web app manifest validity and referenced icon files', () => {
    const manifestPath = path.join(distDir, 'manifest.webmanifest');
    const rawManifest = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(rawManifest);

    expect(manifest.name).toBe('LRP 長照管理系統');
    expect(manifest.short_name).toBe('LRP');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/login');
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    for (const icon of manifest.icons) {
      const cleanPath = icon.src.replace(/^\//, '');
      const iconFilePath = path.join(distDir, cleanPath);
      expect(fs.existsSync(iconFilePath), `Icon ${icon.src} must exist`).toBe(true);

      // Verify PNG magic header: 89 50 4E 47 0D 0A 1A 0A
      const buffer = fs.readFileSync(iconFilePath);
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50); // P
      expect(buffer[2]).toBe(0x4e); // N
      expect(buffer[3]).toBe(0x47); // G
      expect(buffer[4]).toBe(0x0d);
      expect(buffer[5]).toBe(0x0a);
      expect(buffer[6]).toBe(0x1a);
      expect(buffer[7]).toBe(0x0a);
    }
  });

  it('verifies all precached URLs in sw.js exist on disk with no missing assets', () => {
    const swContent = fs.readFileSync(path.join(distDir, 'sw.js'), 'utf-8');

    // Extract precacheAndRoute([...]) entries
    const match = swContent.match(/precacheAndRoute\(\[([^\]]+)\]/);
    expect(match).not.toBeNull();
    if (!match || !match[1]) return;

    const rawEntries = match[1];
    const urlMatches = Array.from(rawEntries.matchAll(/url:"([^"]+)"/g)).map((m) => m[1]);
    expect(urlMatches.length).toBeGreaterThan(10);

    const missingAssets: string[] = [];
    for (const url of urlMatches) {
      if (!url) continue;
      const cleanUrl = url.replace(/^\//, '');
      const fullPath = path.join(distDir, cleanUrl);
      if (!fs.existsSync(fullPath)) {
        missingAssets.push(cleanUrl);
      }
    }

    expect(missingAssets, `Missing precached assets: ${missingAssets.join(', ')}`).toEqual([]);
  });

  it('verifies code-splitting chunks and performance budget', () => {
    const assetsDir = path.join(distDir, 'assets');
    const files = fs.readdirSync(assetsDir);

    // Verify presence of separate chunks
    const chunkPrefixes = ['AdminLayout', 'ReportsPage', 'charts', 'vendor', 'query', 'shared', 'state'];
    for (const prefix of chunkPrefixes) {
      const found = files.some((f) => f.startsWith(prefix) && f.endsWith('.js'));
      expect(found, `Expected chunk for ${prefix} to be generated`).toBe(true);
    }

    // Check individual chunk sizes: no single uncompressed JS chunk should exceed 600KB
    const jsFiles = files.filter((f) => f.endsWith('.js') && !f.endsWith('.map'));
    for (const jsFile of jsFiles) {
      const stat = fs.statSync(path.join(assetsDir, jsFile));
      // Recharts / charts can be around ~400KB, vendor ~165KB, index ~480KB
      expect(stat.size, `Chunk ${jsFile} (${(stat.size / 1024).toFixed(1)} KB) should be under 600KB`).toBeLessThan(600 * 1024);
    }
  });
});
