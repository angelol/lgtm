/**
 * Auth Service
 *
 * Handles GitHub authentication and token management.
 */

import chalk from 'chalk';
import open from 'open';
import keytar from 'keytar';
import { config } from '../../config/index.js';
import { Octokit } from 'octokit';

// Service name for keytar
const SERVICE_NAME = 'lgtm-cli';
const ACCOUNT_NAME = 'github';
const GITHUB_CLIENT_ID = 'Ov23liXHh05kD7fFW3Wk'; // GitHub OAuth App client ID for LGTM

/**
 * Authentication methods supported by the service
 */
export enum AuthMethod {
  Browser = 'browser',
  Token = 'token',
}

/**
 * Authentication credentials
 */
export interface AuthCredentials {
  token: string;
  username?: string;
  method: AuthMethod;
}

/**
 * GitHub user information
 */
export interface GitHubUser {
  login: string;
  name: string | null;
  avatarUrl: string;
}

/**
 * Authentication service for GitHub
 */
export class AuthService {
  private octokit: Octokit | null = null;

  /**
   * Login to GitHub using a browser-based OAuth flow
   *
   * @returns Promise resolving to the authenticated user
   * @throws Error if authentication fails
   */
  async loginWithBrowser(): Promise<GitHubUser> {
    try {
      const { url, code, deviceCode } = await this.createDeviceCodeFlow();

      console.log(`${chalk.yellow('!')} First copy your one-time code: ${chalk.bold(code)}`);
      console.log(`Press ${chalk.bold('Enter')} to open github.com in your browser...`);

      // Wait for user to press Enter
      await new Promise<void>(resolve => {
        // Make sure stdin is in flowing mode
        process.stdin.resume();

        // Create one-time event handler for user input
        const handleInput = (_: Buffer): void => {
          // Clean up stdin configuration
          process.stdin.pause();
          process.stdin.removeListener('data', handleInput);
          resolve();
        };

        process.stdin.on('data', handleInput);
      });

      // Open browser
      await open(url);

      // Wait for user to authenticate
      const token = await this.pollForToken(deviceCode);

      // Validate token and get user information
      const user = await this.validateAndSaveToken(token, AuthMethod.Browser);

      return user;
    } catch (error) {
      throw new Error(`Browser authentication failed: ${(error as Error).message}`);
    }
  }

  /**
   * Login to GitHub using a personal access token
   *
   * @param token - GitHub personal access token
   * @returns Promise resolving to the authenticated user
   * @throws Error if authentication fails
   */
  async loginWithToken(token: string): Promise<GitHubUser> {
    try {
      // Validate token and get user information
      const user = await this.validateAndSaveToken(token, AuthMethod.Token);

      return user;
    } catch (error) {
      throw new Error(`Token authentication failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get the current authentication status
   *
   * @returns Promise resolving to the authenticated user or null if not authenticated
   */
  async getAuthStatus(): Promise<GitHubUser | null> {
    try {
      const credentials = await this.getCredentials();

      if (!credentials) {
        return null;
      }

      // Initialize Octokit with saved token
      this.initOctokit(credentials.token);

      // Get user information
      const { data } = await this.octokit!.rest.users.getAuthenticated();

      return {
        login: data.login,
        name: data.name,
        avatarUrl: data.avatar_url,
      };
    } catch (error) {
      // Token might be invalid or expired
      console.error('Error getting auth status:', error);
      return null;
    }
  }

  /**
   * Logout from GitHub by removing saved credentials
   *
   * @returns Promise resolving to true if logout was successful
   */
  async logout(): Promise<boolean> {
    try {
      await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
      this.octokit = null;
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      return false;
    }
  }

  /**
   * Get the Octokit instance for API calls
   *
   * @returns The initialized Octokit instance
   * @throws Error if not authenticated
   */
  async getOctokit(): Promise<Octokit> {
    // If we already have an instance, return it
    if (this.octokit) {
      return this.octokit;
    }

    // Get credentials and initialize Octokit
    const credentials = await this.getCredentials();

    if (!credentials) {
      throw new Error('Not authenticated. Please run `lgtm auth login` first.');
    }

    this.initOctokit(credentials.token);

    return this.octokit!;
  }

  /**
   * Check if the user is authenticated
   *
   * @returns Promise resolving to true if authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const status = await this.getAuthStatus();
    return status !== null;
  }

  /**
   * Get saved credentials from the secure storage
   *
   * @returns Promise resolving to credentials or null if not found
   */
  private async getCredentials(): Promise<AuthCredentials | null> {
    try {
      const savedCredentials = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);

      if (!savedCredentials) {
        return null;
      }

      return JSON.parse(savedCredentials) as AuthCredentials;
    } catch (error) {
      console.error('Error getting credentials:', error);
      return null;
    }
  }

  /**
   * Save credentials to the secure storage
   *
   * @param credentials - Authentication credentials to save
   */
  private async saveCredentials(credentials: AuthCredentials): Promise<void> {
    try {
      await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, JSON.stringify(credentials));
    } catch (error) {
      throw new Error(`Failed to save credentials: ${(error as Error).message}`);
    }
  }

  /**
   * Initialize the Octokit instance with a token
   *
   * @param token - GitHub token
   */
  private initOctokit(token: string): void {
    const baseUrl = config.get<string>('github.apiBaseUrl', 'https://api.github.com');

    this.octokit = new Octokit({
      auth: token,
      baseUrl,
    });
  }

  /**
   * Validate a token and save it if valid
   *
   * @param token - GitHub token to validate
   * @param method - Authentication method used
   * @returns Promise resolving to the authenticated user
   * @throws Error if token is invalid
   */
  private async validateAndSaveToken(token: string, method: AuthMethod): Promise<GitHubUser> {
    // Initialize Octokit with the token
    this.initOctokit(token);

    try {
      // Get user information to validate the token
      const { data } = await this.octokit!.rest.users.getAuthenticated();

      // Save credentials
      await this.saveCredentials({
        token,
        username: data.login,
        method,
      });

      return {
        login: data.login,
        name: data.name,
        avatarUrl: data.avatar_url,
      };
    } catch (error) {
      this.octokit = null;
      throw new Error('Invalid token');
    }
  }

  /**
   * Create a device code flow for browser authentication
   *
   * @returns Promise resolving to device flow information
   */
  private async createDeviceCodeFlow(): Promise<{ url: string; code: string; deviceCode: string }> {
    const baseUrl = config.get<string>('github.webBaseUrl', 'https://github.com');
    const deviceCodeUrl = `${baseUrl}/login/device/code`;

    // Request device code
    const response = await fetch(deviceCodeUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        scope: 'repo',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create device code flow');
    }

    const data = await response.json();

    return {
      url: data.verification_uri,
      code: data.user_code,
      deviceCode: data.device_code,
    };
  }

  /**
   * Poll for the token after device code authentication
   *
   * @param deviceCode - The device code received from GitHub
   * @returns Promise resolving to the token
   */
  private async pollForToken(deviceCode: string): Promise<string> {
    const baseUrl = config.get<string>('github.webBaseUrl', 'https://github.com');
    const accessTokenUrl = `${baseUrl}/login/oauth/access_token`;

    // Wait for user to authenticate in browser
    console.log(chalk.yellow('Waiting for authentication...'));

    // Loop until token is received
    let token: string | null = null;
    let retries = 0;
    const maxRetries = 30; // Maximum number of retry attempts
    let interval = 5000; // Start with 5 seconds between polls

    while (!token && retries < maxRetries) {
      retries++;

      try {
        // Add a delay between attempts with dynamic interval
        await new Promise(resolve => setTimeout(resolve, interval));

        // Check if the user has authenticated
        const response = await fetch(accessTokenUrl, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: GITHUB_CLIENT_ID,
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          }),
        });

        if (response.ok) {
          const data = await response.json();

          if (data.access_token) {
            token = data.access_token;
            break;
          }

          // Handle different error types
          if (data.error) {
            if (data.error === 'authorization_pending') {
              // This is normal - user hasn't completed auth yet
              process.stdout.write('.');
            } else if (data.error === 'slow_down' || data.error.includes('too many requests')) {
              // Rate limiting - increase the interval and back off
              interval = Math.min(interval * 1.5, 30000); // Increase interval up to max of 30 seconds
              console.log(
                chalk.yellow(`\nRate limit hit. Slowing down polling (${interval / 1000}s)...`),
              );
            } else {
              console.log(
                chalk.yellow(`\nAuthentication status: ${data.error_description || data.error}`),
              );
            }
          }
        } else {
          // If we get an HTTP error, increase the interval
          interval = Math.min(interval * 1.5, 30000);
          process.stdout.write('x');
        }
      } catch (error) {
        // Network errors, increase interval
        interval = Math.min(interval * 1.5, 30000);
        process.stdout.write('!');
      }
    }

    if (!token) {
      throw new Error('Authentication timed out or was rejected');
    }

    console.log(chalk.green('\nAuthentication successful!'));
    return token;
  }
}

// Singleton instance
export const authService = new AuthService();
