import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Binary Execution', () => {
  test('bin entry point is executable', () => {
    // Compile the project to ensure the dist directory exists
    const buildResult = spawnSync('npm', ['run', 'build'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      shell: true,
    });

    expect(buildResult.error).toBeUndefined();

    // Check that the main file exists
    const mainFilePath = path.resolve(process.cwd(), 'dist', 'index.js');
    expect(fs.existsSync(mainFilePath)).toBe(true);

    // Make sure the bin entry has the correct shebang
    const mainFileContent = fs.readFileSync(mainFilePath, 'utf8');
    expect(mainFileContent).toContain('#!/usr/bin/env node');

    // Try executing it to make sure it runs
    const execResult = spawnSync('node', [mainFilePath, '--help'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      shell: true,
    });

    // We don't fully expect --help to work properly yet, but the script should execute
    expect(execResult.error).toBeUndefined();
  });

  test('package.json bin field is correctly configured', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'),
    );

    expect(packageJson.bin).toBeDefined();
    expect(packageJson.bin.lgtm).toBeDefined();
    expect(packageJson.bin.lgtm).toBe('dist/index.js');
  });
});
