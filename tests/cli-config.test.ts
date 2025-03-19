import { spawnSync } from 'child_process';
import path from 'path';

describe('CLI Configuration Commands', () => {
  const cliPath = path.resolve(process.cwd(), 'dist', 'index.js');
  
  test('CLI has config commands', () => {
    const result = spawnSync('node', [cliPath, 'config', '--help'], {
      encoding: 'utf8',
      shell: true,
    });
    
    expect(result.error).toBeUndefined();
    expect(result.stdout).toContain('Manage configuration');
    expect(result.stdout).toContain('get [key]');
    expect(result.stdout).toContain('set <key> <value>');
    expect(result.stdout).toContain('reset [key]');
  });
  
  test('CLI can get all configuration', () => {
    const result = spawnSync('node', [cliPath, 'config', 'get'], {
      encoding: 'utf8',
      shell: true,
    });
    
    expect(result.error).toBeUndefined();
    expect(result.stdout).toContain('requireCiPass');
    expect(result.stdout).toContain('approvalComment');
    expect(result.stdout).toContain('ui');
    expect(result.stdout).toContain('github');
  });
  
  test('CLI can get specific configuration value', () => {
    const result = spawnSync('node', [cliPath, 'config', 'get', 'requireCiPass'], {
      encoding: 'utf8',
      shell: true,
    });
    
    expect(result.error).toBeUndefined();
    expect(result.stdout).toContain('requireCiPass');
    expect(result.stdout).toContain('true');
  });
  
  test('CLI can set configuration value', () => {
    // First set the value
    const setResult = spawnSync('node', [cliPath, 'config', 'set', 'testKey', 'testValue'], {
      encoding: 'utf8',
      shell: true,
    });
    
    expect(setResult.error).toBeUndefined();
    expect(setResult.stdout).toContain('Set testKey to');
    expect(setResult.stdout).toContain('testValue');
    
    // Then get the value to confirm it was set
    const getResult = spawnSync('node', [cliPath, 'config', 'get', 'testKey'], {
      encoding: 'utf8',
      shell: true,
    });
    
    expect(getResult.error).toBeUndefined();
    expect(getResult.stdout).toContain('testKey');
    expect(getResult.stdout).toContain('testValue');
  });
  
  test('CLI can set JSON configuration value', () => {
    // Set a JSON value
    const setResult = spawnSync('node', [cliPath, 'config', 'set', 'testObject', '{"key":"value"}'], {
      encoding: 'utf8',
      shell: true,
    });
    
    expect(setResult.error).toBeUndefined();
    expect(setResult.stdout).toContain('Set testObject to');
    
    // Get the value to confirm it was parsed as JSON
    const getResult = spawnSync('node', [cliPath, 'config', 'get', 'testObject'], {
      encoding: 'utf8',
      shell: true,
    });
    
    expect(getResult.error).toBeUndefined();
    expect(getResult.stdout).toContain('testObject');
    expect(getResult.stdout).toContain('key');
    expect(getResult.stdout).toContain('value');
  });
  
  test('CLI can reset configuration', () => {
    // First set a non-default value
    spawnSync('node', [cliPath, 'config', 'set', 'testValueToReset', 'Custom Value'], {
      encoding: 'utf8',
      shell: true,
    });
    
    // Then reset it
    const resetResult = spawnSync('node', [cliPath, 'config', 'reset', 'testValueToReset'], {
      encoding: 'utf8',
      shell: true,
    });
    
    expect(resetResult.error).toBeUndefined();
    expect(resetResult.stdout).toContain('Removed testValueToReset from configuration');
    
    // Get the value to confirm it was removed
    const getResult = spawnSync('node', [cliPath, 'config', 'get', 'testValueToReset'], {
      encoding: 'utf8',
      shell: true,
    });
    
    expect(getResult.error).toBeUndefined();
    // Just check that the key is there, without being too strict about the exact output format
    expect(getResult.stdout).toContain('testValueToReset');
    expect(getResult.stdout).toContain('undefined');
  });
}); 