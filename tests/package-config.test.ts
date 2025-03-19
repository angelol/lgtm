import fs from 'fs';
import path from 'path';
import semver from 'semver';

describe('Package Configuration', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'),
  );

  test('package.json has correct CLI configuration', () => {
    expect(packageJson.name).toBe('lgtm-cli');
    expect(packageJson.type).toBe('module');
    expect(packageJson.bin).toHaveProperty('lgtm');
    expect(packageJson.main).toBe('dist/index.js');
  });

  test('package.json has correct Node.js version range', () => {
    expect(packageJson.engines).toBeDefined();
    expect(packageJson.engines.node).toBeDefined();

    // Parse the version range
    const range = packageJson.engines.node;
    expect(semver.validRange(range)).not.toBeNull();

    // Make sure the range includes appropriate Node.js versions
    expect(semver.satisfies('16.0.0', range)).toBe(true);
    expect(semver.satisfies('18.0.0', range)).toBe(true);
    expect(semver.satisfies('20.0.0', range)).toBe(true);
    expect(semver.satisfies('22.0.0', range)).toBe(true);
    expect(semver.satisfies('23.0.0', range)).toBe(true);

    // Should exclude older and newer versions
    expect(semver.satisfies('14.0.0', range)).toBe(false);
    expect(semver.satisfies('24.0.0', range)).toBe(false);
  });

  test('package.json has required scripts', () => {
    expect(packageJson.scripts).toHaveProperty('build');
    expect(packageJson.scripts).toHaveProperty('test');
    expect(packageJson.scripts).toHaveProperty('lint');
    expect(packageJson.scripts).toHaveProperty('format');
  });

  test('package.json has core dependencies', () => {
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    // Core libraries from PRD
    [
      'commander',
      'inquirer',
      'chalk',
      'boxen',
      'open',
      'keytar',
      'configstore',
      'marked-terminal',
      'diff2html',
      'octokit',
    ].forEach(dep => {
      expect(dependencies).toHaveProperty(dep);
    });

    // TypeScript and testing libraries
    ['typescript', 'jest', '@types/jest', 'ts-jest'].forEach(dep => {
      expect(dependencies).toHaveProperty(dep);
    });

    // Linting and formatting
    ['eslint', 'prettier'].forEach(dep => {
      expect(dependencies).toHaveProperty(dep);
    });
  });
});
