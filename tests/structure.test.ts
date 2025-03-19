import fs from 'fs';
import path from 'path';

describe('Project Structure', () => {
  const requiredDirs = ['src', 'tests', 'docs'];
  const requiredFiles = [
    'package.json',
    'tsconfig.json',
    '.eslintrc.json',
    '.prettierrc',
    'jest.config.js',
    'LICENSE',
    'README.md',
    'src/index.ts',
  ];

  test.each(requiredDirs)('directory %s exists', dir => {
    const exists = fs.existsSync(path.resolve(process.cwd(), dir));
    expect(exists).toBe(true);
  });

  test.each(requiredFiles)('file %s exists', file => {
    const exists = fs.existsSync(path.resolve(process.cwd(), file));
    expect(exists).toBe(true);
  });

  test('package.json has correct properties', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));

    expect(pkg.name).toBe('lgtm-cli');
    expect(pkg.type).toBe('module');
    expect(pkg.bin).toHaveProperty('lgtm');
    expect(pkg.engines).toHaveProperty('node');
    expect(pkg.scripts).toHaveProperty('build');
    expect(pkg.scripts).toHaveProperty('test');
    expect(pkg.scripts).toHaveProperty('lint');
  });

  test('tsconfig.json has correct compiler options', () => {
    const tsconfig = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'tsconfig.json'), 'utf8'),
    );

    expect(tsconfig.compilerOptions).toHaveProperty('strict', true);
    expect(tsconfig.compilerOptions).toHaveProperty('moduleResolution', 'NodeNext');
    expect(tsconfig.compilerOptions).toHaveProperty('noImplicitAny', true);
    expect(tsconfig.compilerOptions).toHaveProperty('strictNullChecks', true);
  });
});
