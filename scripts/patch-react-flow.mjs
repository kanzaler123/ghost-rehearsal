import { readFileSync, writeFileSync } from 'node:fs';

const original = `            const resizeObserver = new ResizeObserver(() => updateDimensions());
            resizeObserver.observe(domNode.current);
            return () => {
                window.removeEventListener('resize', updateDimensions);
                resizeObserver.disconnect();`;
const patched = `            let resizeFrame = 0;
            const resizeObserver = new ResizeObserver(() => {
                cancelAnimationFrame(resizeFrame);
                resizeFrame = requestAnimationFrame(updateDimensions);
            });
            resizeObserver.observe(domNode.current);
            return () => {
                window.removeEventListener('resize', updateDimensions);
                cancelAnimationFrame(resizeFrame);
                resizeObserver.disconnect();`;

for (const extension of ['js', 'mjs']) {
  const path = new URL('../node_modules/@xyflow/react/dist/esm/index.' + extension, import.meta.url);
  const source = readFileSync(path, 'utf8');
  if (source.includes(patched)) continue;
  if (source.split(original).length !== 2) throw new Error('React Flow resize patch no longer matches the installed version.');
  writeFileSync(path, source.replace(original, patched));
}
