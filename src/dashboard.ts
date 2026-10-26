import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';

export function buildDashboard(check = false): void {
  const report = JSON.parse(readFileSync(new URL('../results/report.json', import.meta.url), 'utf8'));
  const template = readFileSync(new URL('dashboard.html', import.meta.url), 'utf8');
  const json = JSON.stringify(report).replace(/</g, '\\u003c');
  const workerSource = ['rng.ts', 'quality.ts', 'browser-worker.ts'].map(file =>
    stripTypeScriptTypes(readFileSync(new URL(file, import.meta.url), 'utf8'))
      .replace(/^import .*$/gm, '').replace(/^export /gm, '')
  ).join('\n').replace(/<\/script/gi, '<\\/script');
  const html = template.replace('__REPORT_DATA__', () => json).replace('__WORKER_SOURCE__', () => workerSource);
  const destination = new URL('../index.html', import.meta.url);
  if (check) {
    if (readFileSync(destination, 'utf8') !== html)
      throw new Error('index.html is outdated. Run npm run build and commit the updated file.');
  } else writeFileSync(destination, html);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const check = process.argv.includes('--check');
  buildDashboard(check);
  console.log(check ? 'index.html 최신 상태 확인 완료' : 'index.html 생성 완료');
}
