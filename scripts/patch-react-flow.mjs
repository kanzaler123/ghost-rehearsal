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

const extentOriginal = '.extent(() => cachedExtent)';
const extentPatched = `.extent(() => {
            if (!cachedExtent[1][0] || !cachedExtent[1][1]) {
                const bounds = domNode.getBoundingClientRect();
                cachedExtent = [[0, 0], [bounds.width, bounds.height]];
            }
            return cachedExtent;
        })`;
const observationOriginal = 'if (entry?.contentRect) {';
const observationPatched = 'if (entry?.contentRect?.width && entry.contentRect.height) {';
for (const extension of ['js', 'mjs']) {
  const path = new URL('../node_modules/@xyflow/system/dist/esm/index.' + extension, import.meta.url);
  const source = readFileSync(path, 'utf8');
  if (source.includes(extentPatched) && source.includes(observationPatched)) continue;
  if (source.split(extentOriginal).length !== 2 || source.split(observationOriginal).length !== 2) throw new Error('React Flow extent patch no longer matches the installed version.');
  writeFileSync(path, source.replace(extentOriginal, extentPatched).replace(observationOriginal, observationPatched));
}

const nodesOriginal = `        return new ResizeObserver((entries) => {
            const updates = new Map();`;
const nodesPatched = `        const updates = new Map();
        let frame = 0;
        const observer = new ResizeObserver((entries) => {`;
const updateOriginal = `            updateNodeInternals(updates);
        });
    });`;
const updatePatched = `            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                updateNodeInternals(updates);
                updates.clear();
            });
        });
        const disconnect = observer.disconnect.bind(observer);
        observer.disconnect = () => {
            cancelAnimationFrame(frame);
            updates.clear();
            disconnect();
        };
        return observer;
    });`;
for (const extension of ['js', 'mjs']) {
  const path = new URL('../node_modules/@xyflow/react/dist/esm/index.' + extension, import.meta.url);
  const source = readFileSync(path, 'utf8');
  if (source.includes(nodesPatched) && source.includes(updatePatched)) continue;
  if (source.split(nodesOriginal).length !== 2 || source.split(updateOriginal).length !== 2) throw new Error('React Flow node resize patch no longer matches the installed version.');
  writeFileSync(path, source.replace(nodesOriginal, nodesPatched).replace(updateOriginal, updatePatched));
}
