import JSZip from 'npm:jszip@3.10.1';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const actor = await base44.auth.me();
    if (!actor || actor.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }
    const zip = new JSZip();
    let fileCount = 0;

    const dirs = ['src', 'base44'];
    const rootFiles = [
      'index.html', 'tailwind.config.js', 'package.json', 'vite.config.js',
      'postcss.config.js', 'jsconfig.json', 'components.json', 'README.md',
      '.gitignore', 'AGENTS.md', 'CLAUDE.md'
    ];

    const excludeDirs = new Set(['node_modules', '.git', 'dist', '.cache']);
    const maxFileBytes = 512 * 1024; // skip files larger than 512KB

    async function addDir(dirPath: string, zipPath: string) {
      try {
        for await (const entry of Deno.readDir(dirPath)) {
          if (excludeDirs.has(entry.name)) continue;
          const fullPath = `${dirPath}/${entry.name}`;
          const zPath = `${zipPath}/${entry.name}`;
          if (entry.isDirectory) {
            await addDir(fullPath, zPath);
          } else if (entry.isFile) {
            try {
              const stat = await Deno.stat(fullPath);
              if (stat.size > maxFileBytes) continue;
              const content = await Deno.readTextFile(fullPath);
              zip.file(zPath, content);
              fileCount++;
            } catch { /* skip unreadable */ }
          }
        }
      } catch { /* dir not accessible */ }
    }

    for (const dir of dirs) {
      await addDir(dir, dir);
    }

    for (const file of rootFiles) {
      try {
        const content = await Deno.readTextFile(file);
        zip.file(file, content);
        fileCount++;
      } catch { /* skip */ }
    }

    if (fileCount === 0) {
      console.error('downloadSourceCode: no source files found on filesystem');
      return Response.json({ error: 'No source files found' }, { status: 500 });
    }

    const zipBase64 = await zip.generateAsync({ type: 'base64' });

    return Response.json({
      base64: zipBase64,
      filename: 'smartpower-source-code.zip',
      fileCount,
    });
  } catch (error) {
    console.error('downloadSourceCode error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}