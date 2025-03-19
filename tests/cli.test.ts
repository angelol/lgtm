import { spawnSync } from 'child_process';
import path from 'path';

describe('CLI Command Structure', () => {
  const cliPath = path.resolve(process.cwd(), 'dist', 'index.js');
  
  test('CLI shows help information', () => {
    const result = spawnSync('node', [cliPath, '--help'], {
      encoding: 'utf8',
      shell: true,
    });
    
    expect(result.error).toBeUndefined();
    expect(result.stdout).toContain('Usage: lgtm [options] [command] [pr]');
    expect(result.stdout).toContain('A CLI tool to approve GitHub PRs');
  });
  
  test('CLI shows version information', () => {
    const result = spawnSync('node', [cliPath, '--version'], {
      encoding: 'utf8',
      shell: true,
    });
    
    expect(result.error).toBeUndefined();
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/); // Semver pattern
  });
  
  test('CLI accepts PR number parameter', () => {
    const result = spawnSync('node', [cliPath, '123'], {
      encoding: 'utf8',
      shell: true,
    });
    
    expect(result.error).toBeUndefined();
    expect(result.stdout).toContain('PR #123');
  });
  
  test('CLI handles list option', () => {
    const result = spawnSync('node', [cliPath, '--list'], {
      encoding: 'utf8',
      shell: true,
    });
    
    expect(result.error).toBeUndefined();
    expect(result.stdout).toContain('Listing all open PRs');
  });
  
  test('CLI has auth command group', () => {
    const result = spawnSync('node', [cliPath, 'auth', '--help'], {
      encoding: 'utf8',
      shell: true,
    });
    
    expect(result.error).toBeUndefined();
    expect(result.stdout).toContain('Manage GitHub authentication');
    expect(result.stdout).toContain('login');
    expect(result.stdout).toContain('status');
    expect(result.stdout).toContain('logout');
  });
  
  test('CLI handles auth login command', () => {
    const result = spawnSync('node', [cliPath, 'auth', 'login'], {
      encoding: 'utf8',
      shell: true,
    });
    
    expect(result.error).toBeUndefined();
    expect(result.stdout).toContain('Authentication login');
  });
}); 