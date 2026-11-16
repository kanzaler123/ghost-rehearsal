import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import postcss, { type AnyNode } from 'postcss';
import { describe, expect, it } from 'vitest';
import { NODE_SIZE, STAGE_SIZE } from '../src/features/stages';
import { MARKERS } from '../src/components/shell/markers';

const directory = join(import.meta.dirname, '../src/app/styles');
const sheets = new Map(readdirSync(directory).filter(file => file.endsWith('.css')).map(file => [file, postcss.parse(readFileSync(join(directory, file), 'utf8'))]));
const tokens = new Map<string, string>();
sheets.get('tokens.css')!.walkDecls(declaration => { tokens.set(declaration.prop, declaration.value); });
const resolve = (value: string): string => value.replace(/var\((--[\w-]+)\)/g, (_, name: string) => {
  const token = tokens.get(name);
  if (!token) throw new Error(`Missing design token: ${name}`);
  return resolve(token);
});
const luminance = (hex: string) => {
  const channels = hex.slice(1).match(/../g)!.map(channel => parseInt(channel, 16) / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};
const contrast = (a: string, b: string) => {
  const values = [luminance(resolve(a)), luminance(resolve(b))].sort((x, y) => x - y);
  return (values[1] + 0.05) / (values[0] + 0.05);
};

describe('workbench style contract', () => {
  it('declares every stylesheet layer including the vendor layer in cascade order', () => {
    const manifest = postcss.parse(readFileSync(join(directory, '../styles.css'), 'utf8'));
    const layers: string[] = [];
    manifest.walkAtRules('layer', rule => { layers.push(rule.params); });
    expect(layers).toEqual(['vendor, tokens, base, components, layout, modes, responsive, motion']);
    const imports: string[] = [];
    manifest.walkAtRules('import', rule => {
      expect(rule.params).toMatch(/layer\((vendor|tokens|base|components|layout|modes|responsive|motion)\)$/);
      imports.push(rule.params);
    });
    expect(imports).toHaveLength(8);
    expect(readFileSync(join(directory, '../main.tsx'), 'utf8')).not.toContain("import '@xyflow/react/dist/style.css'");
  });

  it('keeps the Ghostlight surface palette and exactly three elevation levels', () => {
    expect([0, 1, 2].map(level => resolve(tokens.get(`--surface-${level}`)!))).toEqual(['#0b1110', '#131e1a', '#1b2a24']);
    expect([...tokens.keys()].filter(name => /^--surface-\d+$/.test(name))).toHaveLength(3);
    expect(tokens.get('--elev-0')).toBe('none');
    expect(new Set([0, 1, 2].map(level => tokens.get(`--elev-${level}`))).size).toBe(3);
  });

  it('uses tokens for declaration colors, lengths, durations and shadows', () => {
    const violations: string[] = [];
    for (const [file, sheet] of sheets) {
      if (file === 'tokens.css') continue;
      sheet.walkDecls(declaration => {
        if (declaration.prop === 'content' || declaration.value.includes('url(')) return;
        const value = declaration.value.replace(/var\(--[\w-]+(?:,[^()]*)?\)/g, '');
        if (/#[\da-f]{3,8}\b|\b(?:rgb|hsl)a?\(|(?<![\w-])-?(?:\d*\.)?\d+(?:px|rem|em|ms|s)\b/i.test(value)) violations.push(`${file}: ${declaration.toString()}`);
        if (declaration.prop === 'box-shadow' && declaration.value !== 'none' && !/^var\(--[\w-]+\)$/.test(declaration.value)) violations.push(`${file}: ${declaration.toString()}`);
      });
    }
    expect(violations).toEqual([]);
  });

  it('limits important declarations to vendor overrides and reduced motion', () => {
    const violations: string[] = [];
    for (const [file, sheet] of sheets) sheet.walkDecls(declaration => {
      if (!declaration.important) return;
      let allowed = false;
      for (let parent: AnyNode | undefined = declaration.parent; parent; parent = parent.parent) {
        if (parent.type === 'rule' && parent.selector.includes('.react-flow__')) allowed = true;
        if (parent.type === 'atrule' && parent.name === 'media' && parent.params.includes('prefers-reduced-motion: reduce')) allowed = true;
      }
      if (!allowed) violations.push(`${file}: ${declaration.toString()}`);
    });
    expect(violations).toEqual([]);
  });

  it('defines a property only once for each selector and conditional context', () => {
    const duplicates: string[] = [];
    for (const [file, sheet] of sheets) {
      const seen = new Set<string>();
      sheet.walkRules(rule => {
        const context: string[] = [];
        for (let parent: AnyNode | undefined = rule.parent; parent; parent = parent.parent) if (parent.type === 'atrule') context.push(`${parent.name} ${parent.params}`);
        rule.walkDecls(declaration => {
          const key = `${context.join('/')}:${rule.selector}:${declaration.prop}`;
          if (seen.has(key)) duplicates.push(`${file}: ${key}`);
          seen.add(key);
        });
      });
    }
    expect(duplicates).toEqual([]);
  });

  it('keeps class selectors connected to source or a source-defined dynamic prefix', () => {
    const sourceRoot = join(directory, '../..');
    const source = readdirSync(sourceRoot, { recursive: true }).filter(file => /\.tsx?$/.test(String(file)))
      .map(file => readFileSync(join(sourceRoot, String(file)), 'utf8')).join('\n');
    const prefixes = [...new Set([...source.matchAll(/([a-zA-Z][\w-]*-)\$\{/g)].map(match => match[1]))];
    const missing = new Set<string>();
    for (const [file, sheet] of sheets) {
      if (file === 'tokens.css') continue;
      sheet.walkRules(rule => {
        for (const match of rule.selector.matchAll(/\.([a-zA-Z_][\w-]*)/g)) {
          const name = match[1];
          if (!source.includes(name) && !name.startsWith('react-flow__') && !prefixes.some(prefix => name.startsWith(prefix))) missing.add(name);
        }
      });
    }
    expect([...missing]).toEqual([]);
  });

  it('meets text, state, focus and interactive-border contrast on every surface', () => {
    const text = [...tokens.keys()].filter(name => /^--text-(primary|secondary|muted)$|^--tone-/.test(name));
    for (const surface of ['--surface-0', '--surface-1', '--surface-2']) {
      for (const color of text) expect(contrast(tokens.get(color)!, tokens.get(surface)!), `${color} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      for (const color of ['--focus-ring', '--line-2']) expect(contrast(tokens.get(color)!, tokens.get(surface)!), `${color} on ${surface}`).toBeGreaterThanOrEqual(3);
    }
    expect(parseFloat(resolve(tokens.get('--focus-w')!))).toBeGreaterThanOrEqual(2);
    const identities = ['--brand', '--plan-a', '--plan-b'].map(name => resolve(tokens.get(name)!));
    for (const name of tokens.keys()) if (name.startsWith('--tone-')) expect(identities).not.toContain(resolve(tokens.get(name)!));
    expect(new Set(['wait', 'serve', 'block', 'done', 'left'].map(name => resolve(tokens.get(`--tone-${name}`)!))).size).toBe(5);
  });

  it('keeps readable auxiliary type and generic font fallbacks', () => {
    for (const [file, sheet] of sheets) {
      if (file === 'tokens.css') continue;
      sheet.walkDecls('font-size', declaration => {
        const value = resolve(declaration.value);
        if (value.endsWith('px')) expect(parseFloat(value), `${file}: ${declaration.parent!.toString()}`).toBeGreaterThanOrEqual(12);
      });
    }
    expect(tokens.get('--font-ui')).toMatch(/sans-serif$/);
    expect(tokens.get('--font-display')).toMatch(/serif$/);
    expect(tokens.get('--font-mono')).toMatch(/monospace$/);
    expect(sheets.get('base.css')!.toString()).toContain('font-variant-numeric: tabular-nums');
  });

  it('keeps card geometry synchronized with the placement constants', () => {
    for (const [name, size] of Object.entries({ '--card-w': NODE_SIZE.build.w, '--card-build-h': NODE_SIZE.build.h, '--card-run-h': NODE_SIZE.run.h, '--stage-w': STAGE_SIZE.w, '--stage-h': STAGE_SIZE.h })) {
      expect(resolve(tokens.get(name)!), name).toBe(`${size}px`);
    }
    expect(resolve(tokens.get('--touch-min')!)).toBe('44px');
    expect(['--control-sm', '--control-md', '--control-lg'].map(name => resolve(tokens.get(name)!))).toEqual(['28px', '34px', '40px']);
  });

  it('keeps proportional journey segments outside the control touch minimum', () => {
    const expandedSegments: string[] = [];
    sheets.get('responsive.css')!.walkRules(rule => {
      const reachesSegment = rule.selector.split(',').some(selector =>
        (selector.includes('.seg') || (selector.includes('.dock') && /\bbutton\b/.test(selector))) && !selector.includes(':not(.seg)'));
      if (!reachesSegment) return;
      rule.walkDecls(declaration => {
        if (/^min-(width|height)$/.test(declaration.prop) && declaration.value.includes('--touch-min')) expandedSegments.push(rule.selector);
      });
    });
    expect(expandedSegments).toEqual([]);
  });

  it('distinguishes the five guest states by icon, shape and tone', () => {
    const states = [MARKERS.queue, MARKERS.serve, MARKERS.blocked, MARKERS.finished, MARKERS.left];
    expect(new Set(states.map(state => state.icon)).size).toBe(states.length);
    expect(new Set(states.map(state => state.shape)).size).toBe(states.length);
    expect(new Set(states.map(state => resolve(tokens.get(state.tone)!))).size).toBe(states.length);
  });
});
