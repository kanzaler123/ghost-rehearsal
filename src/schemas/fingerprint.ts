import { canonicalText, normalizePlan, normalizeScenario } from './codec';
import type { Plan, RunRequest, Scenario } from './model';
import { flattenSubflows } from './plan';

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];
const rotate = (value: number, bits: number) => (value >>> bits) | (value << (32 - bits));

export function sha256(text: string): string {
  const bytes: number[] = [];
  for (const character of text) {
    let code = character.codePointAt(0)!;
    if (code >= 0xd800 && code <= 0xdfff) code = 0xfffd;
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >>> 6), 0x80 | (code & 63));
    else if (code < 0x10000) bytes.push(0xe0 | (code >>> 12), 0x80 | ((code >>> 6) & 63), 0x80 | (code & 63));
    else bytes.push(0xf0 | (code >>> 18), 0x80 | ((code >>> 12) & 63), 0x80 | ((code >>> 6) & 63), 0x80 | (code & 63));
  }
  const length = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const high = Math.floor(length / 4294967296), low = length >>> 0;
  for (const word of [high, low]) for (let shift = 24; shift >= 0; shift -= 8) bytes.push((word >>> shift) & 255);
  const hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const words = new Int32Array(64);
  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let j = 0; j < 16; j++) {
      const at = offset + j * 4;
      words[j] = (bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3];
    }
    for (let j = 16; j < 64; j++) {
      const a = words[j - 15], b = words[j - 2];
      words[j] = words[j - 16] + (rotate(a, 7) ^ rotate(a, 18) ^ (a >>> 3)) + words[j - 7] + (rotate(b, 17) ^ rotate(b, 19) ^ (b >>> 10));
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let j = 0; j < 64; j++) {
      const first = (h + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + ((e & f) ^ (~e & g)) + K[j] + words[j]) | 0;
      const second = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + first) | 0; d = c; c = b; b = a; a = (first + second) | 0;
    }
    [a, b, c, d, e, f, g, h].forEach((word, index) => { hash[index] = (hash[index] + word) | 0; });
  }
  return hash.map(word => (word >>> 0).toString(16).padStart(8, '0')).join('');
}

function simulationFields(value: unknown, field = '', mapping = false): unknown {
  if (Array.isArray(value)) return value.map(item => simulationFields(item));
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  const excluded = field === 'provenance' ? ['source', 'notes'] : ['layout', 'name', 'description', 'notes', 'startClock', 'sourcePlanId', 'sourceScenarioId'];
  return Object.fromEntries(Object.entries(record).filter(([key]) => mapping || !excluded.includes(key)).map(([key, item]) => [key,
    simulationFields(item, mapping ? '' : key, !mapping && ((key === 'attributes' && !Array.isArray(item)) || key === 'attributeDistributions')),
  ]));
}

export function scenarioFingerprint(scenario: Scenario, modelVersion: string): { fingerprint: string; text: string } {
  const text = canonicalText({ scenario: simulationFields(normalizeScenario(scenario)), modelVersion });
  return { fingerprint: sha256(text), text };
}

export function fingerprintRunRequest(request: RunRequest, modelVersion: string) {
  const scenario = scenarioFingerprint(request.scenario, modelVersion);
  const plan: Plan = normalizePlan(flattenSubflows(request.plan));
  const inputText = canonicalText({
    scenario: simulationFields(normalizeScenario(request.scenario)), plan: simulationFields(plan),
    runMode: request.runMode, maxSteps: request.maxSteps ?? 1000, maxEvents: request.maxEvents ?? 1000000, modelVersion,
  });
  return { inputFingerprint: sha256(inputText), scenarioFingerprint: scenario.fingerprint, inputText, scenarioText: scenario.text };
}
