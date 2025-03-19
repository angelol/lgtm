import { describe, it, expect } from '@jest/globals';
import { parseGitHubRepository } from '../../src/utils/repository';

// For now, we'll focus on testing the parseGitHubRepository function
// since it doesn't require mocking child_process
describe('Repository Detection', () => {
  describe('parseGitHubRepository', () => {
    it('should parse HTTPS GitHub URL correctly', () => {
      const url = 'https://github.com/username/repo.git';
      const result = parseGitHubRepository(url);
      expect(result).toEqual({
        owner: 'username',
        name: 'repo',
        isGitHub: true
      });
    });

    it('should parse SSH GitHub URL correctly', () => {
      const url = 'git@github.com:username/repo.git';
      const result = parseGitHubRepository(url);
      expect(result).toEqual({
        owner: 'username',
        name: 'repo',
        isGitHub: true
      });
    });

    it('should handle URLs without .git suffix', () => {
      const url = 'https://github.com/username/repo';
      const result = parseGitHubRepository(url);
      expect(result).toEqual({
        owner: 'username',
        name: 'repo',
        isGitHub: true
      });
    });

    it('should return default values for non-GitHub URLs', () => {
      const url = 'https://gitlab.com/username/repo.git';
      const result = parseGitHubRepository(url);
      expect(result).toEqual({
        owner: null,
        name: null,
        isGitHub: false
      });
    });

    it('should handle invalid or malformed URLs', () => {
      const url = 'not-a-url';
      const result = parseGitHubRepository(url);
      expect(result).toEqual({
        owner: null,
        name: null,
        isGitHub: false
      });
    });
  });
}); 