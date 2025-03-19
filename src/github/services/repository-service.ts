/**
 * Repository Service
 *
 * Provides functionality for interacting with GitHub repositories.
 */

import { GitHubApiClient } from './github-api-client.js';
import { NotFoundError, PermissionError, wrapError } from '../../utils/errors.js';

/**
 * Repository information
 */
export interface Repository {
  owner: string;
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string;
  isPrivate: boolean;
  description: string | null;
}

/**
 * Pull request information
 */
export interface PullRequest {
  number: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  state: 'open' | 'closed' | 'merged';
  url: string;
  author: {
    login: string;
    avatarUrl: string;
  };
  headRef: string;
  baseRef: string;
  isDraft: boolean;
  mergeable: boolean | null;
  labels: Array<{ name: string; color: string }>;
  ciStatus: 'success' | 'failure' | 'pending' | 'unknown' | null;
}

/**
 * GitHub status response
 */
interface GitHubStatusResponse {
  state: string;
  statuses: Array<{
    state: string;
    context: string;
    description: string;
    target_url: string;
  }>;
  sha: string;
  total_count: number;
  repository: {
    id: number;
    name: string;
    full_name: string;
  };
}

/**
 * Service for working with GitHub repositories and pull requests
 */
export class RepositoryService {
  constructor(private apiClient: GitHubApiClient) {
    if (!apiClient) {
      throw new Error('GitHub API client is required');
    }
  }

  /**
   * Get repository information
   */
  public async getRepository(owner: string, repo: string): Promise<Repository> {
    try {
      const repoData = await this.apiClient.request<any>(`GET /repos/${owner}/${repo}`);

      return {
        owner: repoData.owner.login,
        name: repoData.name,
        fullName: repoData.full_name,
        url: repoData.html_url,
        defaultBranch: repoData.default_branch,
        isPrivate: repoData.private,
        description: repoData.description,
      };
    } catch (error: any) {
      if (error.status === 404) {
        throw new NotFoundError(`Repository ${owner}/${repo} not found`);
      }
      if (error.status === 403) {
        throw new PermissionError(`You don't have access to repository ${owner}/${repo}`);
      }
      throw wrapError(error, `Failed to get repository ${owner}/${repo}`);
    }
  }

  /**
   * List open pull requests for a repository
   */
  public async listPullRequests(
    owner: string,
    repo: string,
    options: {
      state?: 'open' | 'closed' | 'all';
      sort?: 'created' | 'updated' | 'popularity' | 'long-running';
    } = {},
  ): Promise<PullRequest[]> {
    try {
      const params = {
        state: options.state || 'open',
        sort: options.sort || 'updated',
        direction: 'desc',
        per_page: 30,
      };

      const pullRequests = await this.apiClient.request<any[]>(
        `GET /repos/${owner}/${repo}/pulls`,
        params,
      );

      // Get CI status for each PR in parallel
      const prsWithStatus = await Promise.all(
        pullRequests.map(async pr => {
          let ciStatus: 'success' | 'failure' | 'pending' | 'unknown' | null = null;

          try {
            // First try the commit status API
            const statuses = await this.apiClient.request<GitHubStatusResponse>(
              `GET /repos/${owner}/${repo}/commits/${pr.head.sha}/status`,
            );

            // Check if any CI checks exist
            if (statuses.total_count > 0 || (statuses.statuses && statuses.statuses.length > 0)) {
              // Map the combined status to our simplified status
              ciStatus = this._mapCiStatus(statuses.state);
            } else {
              // If no statuses found, try check runs API (used by GitHub Actions)
              try {
                const checkRuns = await this.apiClient.request<any>(
                  `GET /repos/${owner}/${repo}/commits/${pr.head.sha}/check-runs`,
                );

                if (checkRuns.total_count > 0) {
                  // Determine overall status from check runs
                  const checkRunsStatus = this._determineCheckRunsStatus(checkRuns.check_runs);
                  ciStatus = checkRunsStatus;
                } else {
                  ciStatus = 'unknown';
                }
              } catch (checkError) {
                // Fallback to unknown if check runs API fails
                ciStatus = 'unknown';
              }
            }
          } catch (error) {
            // Ignore errors fetching CI status
            ciStatus = 'unknown';
          }

          return {
            number: pr.number,
            title: pr.title,
            createdAt: pr.created_at,
            updatedAt: pr.updated_at,
            state: pr.merged ? 'merged' : pr.state,
            url: pr.html_url,
            author: {
              login: pr.user.login,
              avatarUrl: pr.user.avatar_url,
            },
            headRef: pr.head.ref,
            baseRef: pr.base.ref,
            isDraft: pr.draft || false,
            mergeable: pr.mergeable,
            labels: pr.labels.map((label: any) => ({
              name: label.name,
              color: label.color,
            })),
            ciStatus,
          };
        }),
      );

      return prsWithStatus;
    } catch (error: any) {
      if (error.status === 404) {
        throw new NotFoundError(`Repository ${owner}/${repo} not found`);
      }
      if (error.status === 403) {
        throw new PermissionError(`You don't have access to repository ${owner}/${repo}`);
      }
      throw wrapError(error, `Failed to list pull requests for ${owner}/${repo}`);
    }
  }

  /**
   * Get a specific pull request
   */
  public async getPullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<PullRequest> {
    try {
      const pr = await this.apiClient.request<any>(
        `GET /repos/${owner}/${repo}/pulls/${pullNumber}`,
      );

      // Get CI status
      let ciStatus: 'success' | 'failure' | 'pending' | 'unknown' | null = null;
      try {
        // First try the commit status API
        const statuses = await this.apiClient.request<GitHubStatusResponse>(
          `GET /repos/${owner}/${repo}/commits/${pr.head.sha}/status`,
        );

        // Check if any CI checks exist
        if (statuses.total_count > 0 || (statuses.statuses && statuses.statuses.length > 0)) {
          ciStatus = this._mapCiStatus(statuses.state);
        } else {
          // If no statuses found, try check runs API (used by GitHub Actions)
          try {
            const checkRuns = await this.apiClient.request<any>(
              `GET /repos/${owner}/${repo}/commits/${pr.head.sha}/check-runs`,
            );

            if (checkRuns.total_count > 0) {
              // Determine overall status from check runs
              const checkRunsStatus = this._determineCheckRunsStatus(checkRuns.check_runs);
              ciStatus = checkRunsStatus;
            } else {
              ciStatus = 'unknown';
            }
          } catch (checkError) {
            // Fallback to unknown if check runs API fails
            ciStatus = 'unknown';
          }
        }
      } catch (error) {
        // Ignore errors fetching CI status
        ciStatus = 'unknown';
      }

      return {
        number: pr.number,
        title: pr.title,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        state: pr.merged ? 'merged' : pr.state,
        url: pr.html_url,
        author: {
          login: pr.user.login,
          avatarUrl: pr.user.avatar_url,
        },
        headRef: pr.head.ref,
        baseRef: pr.base.ref,
        isDraft: pr.draft || false,
        mergeable: pr.mergeable,
        labels: pr.labels.map((label: any) => ({
          name: label.name,
          color: label.color,
        })),
        ciStatus,
      };
    } catch (error: any) {
      if (error.status === 404) {
        throw new NotFoundError(`Pull request #${pullNumber} not found in ${owner}/${repo}`);
      }
      if (error.status === 403) {
        throw new PermissionError(
          `You don't have access to pull request #${pullNumber} in ${owner}/${repo}`,
        );
      }
      throw wrapError(error, `Failed to get pull request #${pullNumber} from ${owner}/${repo}`);
    }
  }

  /**
   * Approve a pull request
   */
  public async approvePullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    comment?: string,
  ): Promise<boolean> {
    try {
      await this.apiClient.request(`POST /repos/${owner}/${repo}/pulls/${pullNumber}/reviews`, {
        event: 'APPROVE',
        body: comment || undefined,
      });

      return true;
    } catch (error: any) {
      if (error.status === 404) {
        throw new NotFoundError(`Pull request #${pullNumber} not found in ${owner}/${repo}`);
      }
      if (error.status === 403) {
        throw new PermissionError(
          `You don't have permission to approve pull request #${pullNumber} in ${owner}/${repo}`,
        );
      }
      throw wrapError(error, `Failed to approve pull request #${pullNumber} in ${owner}/${repo}`);
    }
  }

  /**
   * Get CI status for a pull request
   */
  public async getCiStatus(
    owner: string,
    repo: string,
    sha: string,
  ): Promise<'success' | 'failure' | 'pending' | 'unknown'> {
    try {
      // First try the commit status API
      const statuses = await this.apiClient.request<GitHubStatusResponse>(
        `GET /repos/${owner}/${repo}/commits/${sha}/status`,
      );

      // Check if any CI checks exist
      if (statuses.total_count > 0 || (statuses.statuses && statuses.statuses.length > 0)) {
        return this._mapCiStatus(statuses.state);
      }

      // If no statuses found, try check runs API (used by GitHub Actions)
      try {
        const checkRuns = await this.apiClient.request<any>(
          `GET /repos/${owner}/${repo}/commits/${sha}/check-runs`,
        );

        if (checkRuns.total_count > 0) {
          // Determine overall status from check runs
          return this._determineCheckRunsStatus(checkRuns.check_runs);
        }
      } catch (checkError) {
        // Ignore errors from check runs API
      }

      // No CI checks found
      return 'unknown';
    } catch (error) {
      // In case of any error, return unknown
      return 'unknown';
    }
  }

  /**
   * Maps GitHub's status states to our simplified status
   */
  private _mapCiStatus(state: string): 'success' | 'failure' | 'pending' | 'unknown' {
    // If state is empty string or null, it means no CI is configured
    if (!state || state === '') {
      return 'unknown';
    }

    switch (state) {
      case 'success':
        return 'success';
      case 'failure':
      case 'error':
        return 'failure';
      case 'pending':
        return 'pending';
      default:
        return 'unknown';
    }
  }

  /**
   * Determines the overall status from a list of check runs
   */
  private _determineCheckRunsStatus(
    checkRuns: Array<any>,
  ): 'success' | 'failure' | 'pending' | 'unknown' {
    if (!checkRuns || checkRuns.length === 0) {
      return 'unknown';
    }

    let hasFailure = false;
    let hasPending = false;
    let hasSuccess = false;

    for (const run of checkRuns) {
      // Check run statuses: queued, in_progress, completed
      // Check run conclusions (when completed): success, failure, neutral, cancelled, skipped, timed_out, action_required

      if (run.status !== 'completed') {
        // If any run is not completed, consider it pending
        hasPending = true;
      } else {
        switch (run.conclusion) {
          case 'success':
          case 'neutral':
          case 'skipped':
            hasSuccess = true;
            break;
          case 'failure':
          case 'cancelled':
          case 'timed_out':
          case 'action_required':
            hasFailure = true;
            break;
        }
      }
    }

    // Determine overall status - prioritize failures
    if (hasFailure) {
      return 'failure';
    } else if (hasPending) {
      return 'pending';
    } else if (hasSuccess) {
      return 'success';
    } else {
      return 'unknown';
    }
  }
}
