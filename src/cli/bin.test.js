import { describe, it, expect } from 'bun:test';
import { spawnSync } from 'child_process';
import path from 'path';
import packageJson from '../../package.json';

describe('bin', () => {
  it('runs under Node', () => {
    const result = spawnSync('node', [path.join(import.meta.dir, 'bin.js'), '--version'], { encoding: 'utf8' });

    expect(result.stderr).toBe('');
    expect(result.stdout.trim()).toBe(packageJson.version);
  });
});
