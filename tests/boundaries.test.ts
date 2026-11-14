import { readdirSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';

const root = resolve('src/schemas');
const builtins = new Set(builtinModules.map(name => name.replace(/^node:/, '')));

function insideRoot(path: string) {
  const local = relative(root, path);
  return local !== '..' && !local.startsWith(`..${sep}`) && !isAbsolute(local);
}

function violations(file: string, content: string): string[] {
  const found: string[] = [];
  const report = (reference: string) => found.push(`${file}: ${reference}`);
  if (['.tsx', '.jsx'].includes(extname(file))) report(file);
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
  source.libReferenceDirectives.forEach(ref => { if (/^dom(?:\.|$)/i.test(ref.fileName)) report(ref.fileName); });
  source.typeReferenceDirectives.forEach(ref => report(ref.fileName));
  source.referencedFiles.forEach(ref => { if (!insideRoot(resolve(dirname(file), ref.fileName))) report(ref.fileName); });
  const checkModule = (expression: ts.Node | undefined) => {
    if (!expression || !ts.isStringLiteralLike(expression)) { report('<非静态模块引用>'); return; }
    const specifier = expression.text;
    if (specifier.startsWith('node:') || builtins.has(specifier)) { report(specifier); return; }
    if (specifier === 'zod' || specifier.startsWith('zod/')) return;
    if (!specifier.startsWith('.')) { report(specifier); return; }
    const resolved = ts.resolveModuleName(specifier, file, { moduleResolution: ts.ModuleResolutionKind.Bundler }, ts.sys).resolvedModule;
    if (!resolved || !insideRoot(resolved.resolvedFileName)) report(specifier);
  };
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node)) checkModule(node.moduleSpecifier);
    if (ts.isExportDeclaration(node) && node.moduleSpecifier) checkModule(node.moduleSpecifier);
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) checkModule(node.argument.literal);
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) checkModule(node.moduleReference.expression);
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword
      || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) checkModule(node.arguments[0]);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

it('Schema 全目录只能引用自身和 Zod，不能包含 JSX 或宿主类型引用', () => {
  const sourceFiles = files(root);
  expect(sourceFiles.length).toBeGreaterThan(0);
  expect(sourceFiles.flatMap(file => violations(file, readFileSync(file, 'utf8')))).toEqual([]);
});

it.each([
  ['import React from "react";', 'react'],
  ['import type { Node } from "@xyflow/react";', '@xyflow/react'],
  ['export { x } from "zustand/middleware";', 'zustand/middleware'],
  ['const module = import("react/jsx-runtime");', 'react/jsx-runtime'],
  ['const fs = require("node:fs");', 'node:fs'],
  ['import fs = require("fs");', 'fs'],
  ['type External = import("node:os").UserInfo;', 'node:os'],
  ['import { x } from "../../tests/foundation.test";', '../../tests/foundation.test'],
  ['/// <reference lib="dom" />', 'dom'],
  ['/// <reference types="node" />', 'node'],
  ['import(otherModule);', '<非静态模块引用>'],
])('边界检查能发现 %s', (content, expected) => {
  expect(violations(resolve(root, 'probe.ts'), content)).toEqual([`${resolve(root, 'probe.ts')}: ${expected}`]);
});

it('JSX 文件即使没有导入也会失败', () => {
  expect(violations(resolve(root, 'probe.tsx'), '')).not.toEqual([]);
});
