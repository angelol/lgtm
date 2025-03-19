import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

/**
 * Interface representing a GitHub repository details
 */
export interface GitHubRepo {
  /** Repository owner (username or organization) */
  owner: string | null;
  /** Repository name */
  name: string | null;
  /** Whether the repository is hosted on GitHub */
  isGitHub: boolean;
}

/**
 * Checks if the current directory is within a git repository
 * @param dir Optional directory path to check (defaults to current working directory)
 * @returns Promise that resolves to true if directory is in a git repository, false otherwise
 */
export async function isGitRepository(dir?: string): Promise<boolean> {
  try {
    const cwd = dir || process.cwd();
    const { stdout } = await execAsync('git rev-parse --is-inside-work-tree', { cwd });
    return stdout.trim() === 'true';
  } catch (error) {
    return false;
  }
}

/**
 * Gets the remote URL for a git repository
 * @param remoteName Optional remote name (defaults to 'origin')
 * @param dir Optional directory path to check (defaults to current working directory)
 * @returns Promise that resolves to the remote URL or null if not found
 */
export async function getRemoteUrl(remoteName = 'origin', dir?: string): Promise<string | null> {
  try {
    const cwd = dir || process.cwd();
    const { stdout } = await execAsync(`git config --get remote.${remoteName}.url`, { cwd });
    return stdout.trim() || null;
  } catch (error) {
    return null;
  }
}

/**
 * Gets a list of remotes for a git repository
 * @param dir Optional directory path to check (defaults to current working directory)
 * @returns Promise that resolves to an array of remote names
 */
export async function getRemotes(dir?: string): Promise<string[]> {
  try {
    const cwd = dir || process.cwd();
    const { stdout } = await execAsync('git remote', { cwd });
    return stdout.trim().split('\n').filter(Boolean);
  } catch (error) {
    return [];
  }
}

/**
 * Parses a git remote URL to extract GitHub repository details
 * @param url The git remote URL to parse
 * @returns GitHub repository details (owner, name, and whether it's a GitHub repo)
 */
export function parseGitHubRepository(url: string): GitHubRepo {
  // Default return value for non-GitHub or invalid URLs
  const defaultResult: GitHubRepo = {
    owner: null,
    name: null,
    isGitHub: false,
  };

  if (!url) {
    return defaultResult;
  }

  // Handle HTTPS GitHub URLs
  const httpsMatch = url.match(/https:\/\/github\.com\/([^\/]+)\/([^\/\.]+)(\.git)?$/);
  if (httpsMatch) {
    return {
      owner: httpsMatch[1],
      name: httpsMatch[2],
      isGitHub: true,
    };
  }

  // Handle SSH GitHub URLs
  const sshMatch = url.match(/git@github\.com:([^\/]+)\/([^\/\.]+)(\.git)?$/);
  if (sshMatch) {
    return {
      owner: sshMatch[1],
      name: sshMatch[2],
      isGitHub: true,
    };
  }

  return defaultResult;
}

/**
 * Gets GitHub repository information from the current directory
 * @param dir Optional directory path to check (defaults to current working directory)
 * @returns Promise that resolves to GitHub repository details or null if not in a GitHub repository
 */
export async function getGitHubRepository(dir?: string): Promise<GitHubRepo | null> {
  // Check if we're in a git repository
  const isRepo = await isGitRepository(dir);
  if (!isRepo) {
    return null;
  }

  // Get the remote URL (try origin first)
  let remoteUrl = await getRemoteUrl('origin', dir);

  // If origin doesn't exist, try to find any GitHub remote
  if (!remoteUrl) {
    const remotes = await getRemotes(dir);
    for (const remote of remotes) {
      const url = await getRemoteUrl(remote, dir);
      if (url) {
        const repoInfo = parseGitHubRepository(url);
        if (repoInfo.isGitHub) {
          remoteUrl = url;
          break;
        }
      }
    }
  }

  // Parse the remote URL if we found one
  if (remoteUrl) {
    const repoInfo = parseGitHubRepository(remoteUrl);
    if (repoInfo.isGitHub && repoInfo.owner && repoInfo.name) {
      return repoInfo;
    }
  }

  return null;
}

/**
 * Validates a GitHub repository structure
 * @param repoInfo GitHub repository information
 * @returns True if the repository structure is valid, false otherwise
 */
export function validateRepositoryStructure(repoInfo: GitHubRepo): boolean {
  return !!(repoInfo && repoInfo.isGitHub && repoInfo.owner && repoInfo.name);
}
