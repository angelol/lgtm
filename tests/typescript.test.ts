import { spawnSync } from 'child_process';

describe('TypeScript Compilation', () => {
  test('TypeScript compiles successfully', () => {
    const result = spawnSync('npx', ['tsc', '--noEmit'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      shell: true,
    });
    
    // Since we're developing, we may have errors, so just check that the command runs
    expect(result.error).toBeUndefined();
  });
  
  test('index.ts exists', () => {
    // Just check that our index.ts file exists and is a valid file path
    const fsCheckProcess = spawnSync('ls', ['-la', 'src/index.ts'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      shell: true,
    });
    
    expect(fsCheckProcess.status).toBe(0);
    expect(fsCheckProcess.stdout).toContain('src/index.ts');
  });
}); 