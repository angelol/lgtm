/**
 * GitHub API Client
 *
 * A service for interacting with the GitHub API using Octokit.
 * Handles authentication, request formatting, error handling, and rate limiting.
 */

import { Octokit } from 'octokit';
import { Config } from '../../config/index.js';
import { AuthService } from '../../auth/services/auth-service.js';
import { 
  ApiError, 
  AuthError, 
  RateLimitError, 
  wrapError 
} from '../../utils/errors.js';

/**
 * Interface for rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTimestamp: number;
  isLimited: boolean;
}

/**
 * Request options for GitHub API requests
 */
export interface RequestOptions {
  headers?: Record<string, string>;
  retry?: boolean;
  maxRetries?: number;
}

/**
 * GitHub API Client for handling all GitHub API interactions
 */
export class GitHubApiClient {
  private octokit: Octokit | null = null;
  private authService: AuthService;
  private config: Config;
  private rateLimitInfo: RateLimitInfo = {
    limit: 0,
    remaining: 0,
    resetTimestamp: 0,
    isLimited: false,
  };
  private initialized = false;

  /**
   * Creates a new instance of the GitHub API client
   */
  constructor(authService: AuthService, config: Config) {
    if (!authService) {
      throw new AuthError('Authentication service is required');
    }
    if (!config) {
      throw new ApiError('Configuration service is required');
    }
    this.authService = authService;
    this.config = config;
  }

  /**
   * Initializes the API client by setting up Octokit with authentication
   */
  public async initialize(): Promise<void> {
    if (this.initialized && this.octokit) {
      return;
    }
    
    try {
      // Check if the user is authenticated
      const isAuthenticated = await this.authService.isAuthenticated();
      if (!isAuthenticated) {
        throw new AuthError('No authentication available. Please run `lgtm auth login` first.');
      }
      
      // Get the Octokit instance from the auth service
      try {
        this.octokit = await this.authService.getOctokit();
        
        // Get initial rate limit info
        await this._fetchRateLimitInfo();
        
        this.initialized = true;
      } catch (error) {
        throw wrapError(error, 'Failed to initialize GitHub API client');
      }
    } catch (error) {
      throw wrapError(error, 'Failed to initialize GitHub API client');
    }
  }

  /**
   * Makes a request to the GitHub API
   */
  public async request<T>(
    route: string, 
    params?: Record<string, unknown>,
    options: RequestOptions = {}
  ): Promise<T> {
    try {
      if (!this.initialized || !this.octokit) {
        await this.initialize();
      }
      
      if (!this.octokit) {
        throw new AuthError('GitHub API client not initialized');
      }
      
      // Check if we're rate limited
      if (this.rateLimitInfo && this.rateLimitInfo.remaining === 0) {
        const now = new Date();
        const message = `GitHub API rate limit exceeded. Resets in ${Math.ceil(
          (this.rateLimitInfo.resetTimestamp * 1000 - now.getTime()) / 1000 / 60
        )} minutes`;
        
        throw new RateLimitError(message, this.rateLimitInfo.resetTimestamp);
      }
      
      // Set up retry options
      const maxRetries = options.maxRetries || this.config.get('github.maxRetryCount', 3);
      let retries = 0;
      
      // Execute request with retry logic
      while (true) {
        try {
          const response = await this.octokit.request(route, params);
          
          // Update rate limit info from headers
          this._updateRateLimitInfo(response.headers);
          
          return response.data as T;
        } catch (requestError: any) {
          // Update rate limit info from error headers
          if (requestError.headers) {
            this._updateRateLimitInfo(requestError.headers);
          }
          
          // Handle rate limiting
          if (requestError.status === 403 && /rate limit/i.test(requestError.message)) {
            throw new RateLimitError(
              'GitHub API rate limit exceeded',
              this.rateLimitInfo.resetTimestamp,
              { originalError: requestError }
            );
          }
          
          // Retry on server errors (if retry option is enabled)
          if (options.retry !== false && 
              requestError.status >= 500 && 
              requestError.status < 600 &&
              retries < maxRetries) {
            retries++;
            
            // Exponential backoff: 1s, 2s, 4s, ...
            const delay = 1000 * Math.pow(2, retries - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          // Throw wrapped error
          throw wrapError(requestError);
        }
      }
    } catch (error) {
      throw wrapError(error, `GitHub API request failed: ${route}`);
    }
  }

  /**
   * Gets the current rate limit information
   */
  public getRateLimitInfo(): RateLimitInfo {
    return { ...this.rateLimitInfo };
  }

  /**
   * Gets the authenticated user information
   */
  public async getAuthenticatedUser(): Promise<{ login: string; name: string | null; }> {
    try {
      const userData = await this.request<{ login: string; name: string | null; }>('GET /user');
      return userData;
    } catch (error) {
      throw wrapError(error, 'Failed to fetch authenticated user');
    }
  }

  /**
   * Tests the authentication by making a simple API request
   */
  public async testAuthentication(): Promise<boolean> {
    try {
      await this.getAuthenticatedUser();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fetches the current rate limit information
   */
  private async _fetchRateLimitInfo(): Promise<void> {
    try {
      if (!this.octokit) {
        return;
      }
      
      const response = await this.octokit.request('GET /rate_limit');
      const resources = response.data.resources;
      
      this.rateLimitInfo = {
        limit: resources.core.limit,
        remaining: resources.core.remaining,
        resetTimestamp: resources.core.reset,
        isLimited: resources.core.remaining <= 0,
      };
    } catch (error) {
      // Ignore errors fetching rate limit info
    }
  }

  /**
   * Updates rate limit information from response headers
   */
  private _updateRateLimitInfo(headers: Record<string, any>): void {
    const limit = headers['x-ratelimit-limit'];
    const remaining = headers['x-ratelimit-remaining'];
    const reset = headers['x-ratelimit-reset'];
    
    if (limit && remaining && reset) {
      this.rateLimitInfo = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        resetTimestamp: parseInt(reset, 10),
        isLimited: parseInt(remaining, 10) <= 0,
      };
    }
  }
} 