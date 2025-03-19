# LGTM - Product Requirements Document

## Overview
LGTM is a command-line tool that simplifies the GitHub PR review process by allowing developers to approve pull requests directly from their terminal. The name "LGTM" stands for "Looks Good To Me," a common phrase used when approving code changes.

This tool is designed with a next-level user experience (UX) at its core, aiming to set a new standard for CLI tool design. While maintaining the efficiency of command-line workflows, LGTM brings a polished, intuitive, and visually appealing interface that makes PR review a delightful experience rather than a chore.

## Problem Statement
Reviewing and approving GitHub pull requests typically requires switching context from the terminal to a web browser, navigating to the GitHub interface, and clicking through several UI elements. This context-switching interrupts developer workflow and reduces productivity.

Additionally, most command-line tools for GitHub sacrifice user experience for functionality, leading to steep learning curves and frustrating workflows. LGTM aims to solve both problems simultaneously by providing a seamless, intuitive CLI experience with thoughtful design throughout.

## Target Users
- Software developers who review code
- Engineering managers who approve team PRs
- Open source maintainers who process community contributions
- DevOps engineers who manage deployment PRs
- Developers who value both CLI efficiency and excellent user experience

## User Stories
1. As a developer, I want to approve PRs without leaving my terminal, so I can maintain focus on my workflow.
2. As a team lead, I want to quickly see all open PRs in a repository, so I can manage the review queue efficiently.
3. As an open source maintainer, I want a simple command to approve community contributions, so I can reduce administrative overhead.
4. As a quality-focused developer, I want to ensure I only approve PRs that pass CI checks, so I can maintain code quality standards.
5. As a frequent reviewer, I want to interactively select PRs from a list, so I can quickly review without memorizing PR numbers.
6. As a thorough code reviewer, I want to see the actual code changes before approval, so I can make informed decisions about code quality.
7. As a reviewer, I want to read the PR description to understand the context and purpose of the changes before approving.
8. As a GitHub user, I want a familiar authentication experience that's consistent with other GitHub tools I use.
9. As a new user, I want to be automatically guided through setup, so I can start using the tool immediately.
10. As a CLI user, I want a beautiful and intuitive interface that doesn't compromise on functionality, so I can enjoy using the tool daily.
11. As a reviewer, I want the option to seamlessly transition to the browser when needed, so I can access GitHub's full interface for complex reviews.

## Technology Stack

### Implementation Language
LGTM will be implemented using **TypeScript** with Node.js as the runtime environment. This choice was made for the following reasons:

1. **Type Safety**: TypeScript's static typing helps prevent bugs when working with GitHub's complex API responses and data structures.

2. **Developer Experience**: Strong IDE support with autocompletion and IntelliSense makes development faster and reduces errors.

3. **Code Maintainability**: Types serve as documentation and make refactoring safer as the codebase grows.

4. **Rich Ecosystem**: The Node.js/TypeScript ecosystem has excellent libraries for building beautiful terminal UIs, including:
   - Inquirer.js for interactive prompts
   - Chalk/Colorette for terminal colors
   - Ink for React-style terminal interfaces
   - Boxen, cli-table3, and other formatting utilities
   - Octokit.js for GitHub API integration

5. **Cross-Platform Compatibility**: Works consistently across macOS, Linux, and Windows.

6. **Modern JavaScript**: Access to the latest JavaScript features while maintaining backward compatibility.

7. **Error Prevention**: Catches common errors at compile-time rather than runtime, essential for a tool users will rely on daily.

### Node.js Version Compatibility

Since LGTM is a developer tool that will be used across various environments, supporting a wide range of Node.js versions is critical:

1. **Version Support Range**: LGTM will support Node.js versions 16.x through 23.x, covering:
   - Long-term support (LTS) versions (16.x, 18.x, 20.x)
   - Latest stable versions (22.x, 23.x)
   - Future compatibility with 24.x will be evaluated upon its release

2. **Runtime Version Verification**: The application will verify the user's Node.js version at runtime and provide clear error messages if compatibility issues arise.

3. **Transpilation Target**: TypeScript code will be transpiled to target ES2018 to ensure compatibility with older Node.js versions while leveraging modern language features.

4. **Feature Detection**: The application will implement feature detection and fallbacks for APIs that differ across Node.js versions.

5. **Cross-Version Testing**: Both CI pipelines and local development workflows will support testing across the full matrix of supported Node.js versions.

6. **Version Compatibility Documentation**: Clear documentation will be provided regarding supported Node.js versions and any version-specific considerations.

### Key Libraries and Dependencies
- **Octokit.js**: For GitHub API integration
- **Commander.js**: For command line argument parsing
- **Inquirer.js**: For interactive prompts
- **Chalk/Colorette**: For colorized terminal output
- **Boxen**: For creating boxes in the terminal
- **Open**: For browser integration
- **Keytar**: For secure credential storage
- **Configstore**: For configuration management
- **Marked-terminal**: For rendering markdown in the terminal
- **Diff2html**: For syntax-highlighted diff display

## Requirements

### Functional Requirements

#### Core Features
1. **PR Approval**
   - Command: `lgtm [PR #]`
   - Approves the specified PR with the comment "LGTM 👍"
   - Requires running from within a GitHub repository directory
   - Only approves PRs that have passing CI status
   - Shows warning and requires confirmation if attempting to approve a PR with failing or pending CI checks

2. **Interactive PR Selection**
   - Command: `lgtm` (without arguments)
   - Default behavior when no PR number is provided
   - Presents an interactive list of open PRs
   - Allows users to navigate, view details, and select PRs to approve
   - Displays CI status for each PR with color coding (green for passing, red for failing, yellow for pending)

3. **Non-Interactive PR Listing**
   - Command: `lgtm --list` or `lgtm -l`
   - Lists all open PRs for the current repository in a non-interactive format
   - Displays PR number, title, author, age, and CI status in a well-formatted output
   - Useful for scripting or when piping output to other commands

4. **Code Diff Review**
   - Command: `lgtm [PR #] --review` or `lgtm [PR #] -r`
   - Command from interactive mode: Select PR and choose "Review Changes" option
   - Displays a unified diff of code changes in the PR
   - Syntax highlighting for better readability
   - Paging support for navigating through large diffs
   - File-by-file navigation for PRs with multiple changed files
   - Option to approve directly after reviewing (`y` to approve, `n` to cancel)

5. **PR Description View**
   - Command: `lgtm [PR #] --description` or `lgtm [PR #] -d`
   - Command from interactive mode: Select PR and choose "View Description" option
   - Displays the full PR description, including markdown formatting
   - Shows PR metadata (labels, reviewers, linked issues)
   - Option to proceed to code review or directly approve after viewing description

6. **Browser Integration**
   - Command: `lgtm [PR #] --open` or `lgtm [PR #] -o`
   - Command from interactive mode: Select PR and choose "Open in Browser" option
   - Opens the selected PR in the default web browser
   - Enables seamless transition between CLI and web interface when needed
   - Provides access to GitHub's full UI for complex review scenarios

7. **Authentication**
   - Command: `lgtm auth login`
   - Follows the GitHub CLI authentication workflow
   - Supports multiple authentication methods (browser, token, etc.)
   - Command: `lgtm auth status` to check current authentication status
   - Command: `lgtm auth logout` to remove saved credentials
   - Automatically prompts for authentication on first use
   - All commands that require authentication will trigger the login flow if no credentials are found

### Non-Functional Requirements

1. **Performance**
   - Commands should complete within 3 seconds under normal network conditions
   - Should handle repositories with a large number of PRs (100+) without significant performance degradation
   - Should efficiently load and display large diffs
   - Animations and UI transitions should be smooth without compromising speed

2. **Security**
   - Must use secure GitHub authentication methods
   - Should support GitHub Personal Access Tokens
   - Should never log or expose authentication credentials
   - Should use secure credential storage consistent with GitHub CLI
   - Should support OAuth web flow for browser-based authentication

3. **Compatibility**
   - Must work on major operating systems (macOS, Linux, Windows)
   - Must support various terminal environments
   - Should support common terminal color schemes for diff display
   - Should render markdown formatting in PR descriptions
   - Should be compatible with GitHub CLI authentication if already installed
   - Should adapt UI elements based on terminal capabilities
   - Should correctly detect and use the default browser on all platforms

4. **Usability and UX Design**
   - Should deliver a next-level user experience that sets a new standard for CLI tools
   - Interface should be visually appealing with consistent, thoughtful design elements
   - First-time users should be guided through authentication automatically
   - Should use progressive disclosure to balance simplicity with power
   - Error messages should be clear, helpful, and suggest next steps
   - Should provide thoughtful micro-interactions that delight users
   - Command structure should be intuitive and discoverable
   - Should follow modern CLI tool design patterns while innovating on UX
   - Should accommodate both keyboard-centric users and those who prefer interactive navigation
   - Should use color, spacing, and typography to create a clear visual hierarchy
   - Should provide a smooth onboarding experience with contextual help
   - Should include subtle animations that enhance without distracting
   - Must work well with screen readers and other accessibility tools
   - Should ensure smooth transitions between terminal and browser when needed

## Technical Specifications

### User Experience and Design
- Consistent visual language across all command outputs
- Carefully designed layouts with proper alignment, spacing, and visual hierarchy
- Limited but effective use of color to highlight important information
- Subtle loading animations and progress indicators
- Clear differentiation between interactive and non-interactive elements
- Effective use of terminal real estate without overwhelming users
- Rich interactive components (selectable lists, form inputs, navigable views)
- Elegant transitions between different views and modes
- Well-designed help system and documentation
- Consistent keyboard shortcuts with on-screen hints
- Accessibility considerations for users with screen readers
- Responsive layouts that adapt to terminal size

### Authentication
- Leverage GitHub CLI authentication if available
- Support for browser-based OAuth flow (preferred method)
- Support for personal access token authentication
- Support for GitHub Enterprise instances
- Token should be stored securely in the user's OS-specific credential store:
  - macOS: Keychain
  - Windows: Windows Credential Manager
  - Linux: Secret Service API/libsecret
- Share authentication with GitHub CLI when possible to avoid multiple logins
- Automatically detect when authentication is needed and prompt the user
- Check for credentials at startup and prompt if not found

### GitHub API Integration
- Use GitHub's REST API to interact with PR endpoints
- Implement rate limiting handling to prevent API abuse
- Handle API errors gracefully with helpful error messages
- Access CI status information via GitHub Checks API
- Fetch PR details, including CI status, author, age, and full description
- Retrieve and parse PR diffs via the GitHub API
- Generate proper GitHub web URLs for browser integration

### Repository Detection
- Automatically detect the current GitHub repository from the working directory
- Parse remote URL from git config to determine organization and repository name

### System Integration
- Detect default browser on user's system
- Launch browser with correct GitHub PR URL
- Handle different operating systems' browser launching mechanisms
- Support for corporate proxies and non-standard network configurations

### Command Line Interface
- Simple, intuitive command syntax
- Clear, colorized output for better readability
- Provide helpful error messages for common issues
- Interactive UI using a terminal-based UI library (e.g., Inquirer, Blessed, etc.)
- Syntax-highlighted diff display using appropriate libraries (e.g., diff2html-cli)
- Markdown rendering for PR descriptions
- Elegant handling of resizing and terminal capabilities
- Optimized rendering performance for smooth interactions

### Development and Build Process
- TypeScript compilation with strict type checking
- ESLint for code quality enforcement
- Automated testing with Jest
- GitHub Actions for CI/CD
- Semantic versioning for releases
- npm for package management and distribution
- Package bundling to optimize installation size

## CI/CD
- MUST implement automated tests in CI pipeline
- MUST use semantic versioning
- MUST implement static code analysis
- MUST scan for security vulnerabilities in dependencies
- MUST automate deployment process
- MUST test installation process on all target platforms (macOS, Linux, Windows)
- MUST test across all supported Node.js versions (16.x, 18.x, 20.x, 22.x, 23.x)
- MUST fail CI if tests fail on any supported Node.js version

## User Experience

### Installation
```
npm install -g lgtm-cli
# or
brew install lgtm-cli
```

### First-time Use
```
$ lgtm
✨ Welcome to LGTM! To get started, you need to authenticate with GitHub.

? How would you like to authenticate? [Use arrows to move]
> Login with a web browser
  Paste an authentication token

[If "Login with a web browser" is selected]
! First copy your one-time code: AB12-CDEF
Press Enter to open github.com in your browser... 

✓ Authentication complete. You're now logged in as username

Now listing open PRs in username/repository...
```

### Authentication
```
$ lgtm auth login
? How would you like to authenticate? [Use arrows to move]
> Login with a web browser
  Paste an authentication token

[If "Login with a web browser" is selected]
! First copy your one-time code: AB12-CDEF
Press Enter to open github.com in your browser... 

✓ Authentication complete. You're now logged in as username
```

### Interactive Mode (Default)
```
$ lgtm
? Select a PR to approve: (Use arrow keys)
❯ #123 | Update documentation for API v2 | @contributor1 | 2 days ago | ✅ CI Passing
  #124 | Fix pagination bug in user list | @contributor2 | 14 hours ago | ⏳ CI Running
  #125 | Add dark mode support | @contributor3 | just now | ❌ CI Failed
  [Cancel]

? What would you like to do with PR #123? (Use arrow keys)
❯ View Description
  Review Changes
  Open in Browser
  Approve
  Cancel

[If "View Description" is selected, the description is displayed]
[If "Open in Browser" is selected, the PR is opened in the default browser]
```

### Browser Integration
```
$ lgtm 123 --open

Opening PR #123 in your browser...
```

### PR Description View
```
$ lgtm 123 --description

PR #123: "Update documentation for API v2"
Author: @contributor1
Created: 2 days ago
Status: ✅ CI Passing
Labels: documentation, enhancement

## Description
This PR updates the API v2 documentation with the following changes:

* Add OAuth token authentication option
* Document rate limiting
* Fix endpoint examples
* Update response format descriptions

## Related Issues
Closes #120: Document rate limiting
Addresses #115: Authentication improvements

Press Enter to continue to diff view, 'o' to open in browser, 'a' to approve, or 'q' to return: a
✅ Successfully approved PR #123: "Update documentation for API v2"
```

### Code Diff Review
```
$ lgtm 123 --review

PR #123: "Update documentation for API v2" by @contributor1
Changed Files: 3 files changed, 45 insertions(+), 12 deletions(-)

File 1/3: docs/api.md
+++ docs/api.md
@@ -10,7 +10,7 @@
 ## Authentication
 
-All API requests require authentication using an API key.
+All API requests require authentication using an API key or OAuth token.
 
 ### Endpoints
 
@@ -25,6 +25,10 @@
 - `GET /api/v2/users` - List all users
 - `GET /api/v2/users/:id` - Get user details
 
+### Rate Limiting
+
+API requests are limited to 1000 requests per hour per API key.
+
 [Press 'n' for next file, 'p' for previous file, 'o' to open in browser, 'q' to quit, 'a' to approve]

Approve this PR? (y/N): y
✅ Successfully approved PR #123: "Update documentation for API v2"
```

### Non-Interactive Listing
```
$ lgtm --list
OPEN PULL REQUESTS for username/repository:

#123 | Update documentation for API v2 | @contributor1 | 2 days ago | ✅ CI Passing
#124 | Fix pagination bug in user list | @contributor2 | 14 hours ago | ⏳ CI Running
#125 | Add dark mode support | @contributor3 | just now | ❌ CI Failed
```

### PR Approval
```
$ lgtm 123
✅ Successfully approved PR #123: "Update documentation for API v2"

$ lgtm 125
⚠️ Warning: CI checks are failing for PR #125
Do you still want to approve this PR? (y/N): n
Approval canceled.
```

## Error Handling

### Common Error Scenarios
1. Not in a git repository
   ```
   Error: Not a git repository. Please run from a GitHub repository directory.
   ```

2. No GitHub authentication
   ```
   Error: Not logged in to GitHub. Initiating authentication flow...

   ? How would you like to authenticate? [Use arrows to move]
   > Login with a web browser
     Paste an authentication token
   ```

3. PR doesn't exist
   ```
   Error: PR #999 not found in username/repository.
   ```

4. No permission to approve
   ```
   Error: You don't have permission to approve PR #123.
   ```

5. CI status information unavailable
   ```
   Warning: Could not retrieve CI status for PR #123. Proceed with caution.
   Do you still want to approve this PR? (y/N):
   ```

6. Unable to fetch diff
   ```
   Error: Could not retrieve diff for PR #123. 
   You can try viewing it in a browser: https://github.com/username/repository/pull/123/files
   ```

7. Unable to fetch PR description
   ```
   Error: Could not retrieve description for PR #123.
   You can view it in a browser: https://github.com/username/repository/pull/123
   ```

8. Authentication error
   ```
   Error: Authentication failed. Please check your credentials and try again.
   ```

9. Browser launch error
   ```
   Error: Could not open browser. PR URL is: https://github.com/username/repository/pull/123
   ```

## Design Principles
- **Effortless**: Make the common case trivial and the complex case possible
- **Delightful**: Create moments of delight with thoughtful interactions and design
- **Intuitive**: Design for zero learning curve with progressive discovery
- **Efficient**: Optimize for developer productivity without sacrificing experience
- **Polished**: Attend to every detail in the interface and interactions
- **Accessible**: Ensure usability for all users regardless of abilities or preferences
- **Responsive**: Adapt gracefully to different terminal sizes and capabilities
- **Transitional**: Provide seamless paths between terminal and browser experiences when needed

## Future Enhancements
- Support for adding custom approval messages
- Ability to request changes with comments
- Support for GitHub Enterprise installations
- Line-by-line commenting within the diff review
- Integration with local git checkout to view changes in preferred editor
- Combined view showing description and changes together
- Customizable color themes and layouts
- Integration with team-specific approval workflows

## Success Metrics
- Number of active users
- User satisfaction and delight (via surveys and feedback)
- Number of PRs approved via the tool
- Time saved compared to web-based approval
- GitHub star count and community engagement
- Percentage of approved PRs with passing CI checks
- Percentage of PRs reviewed using the diff view before approval
- Percentage of PRs where description was viewed before approval
- User retention after first-time use
- User engagement with advanced features
- Browser transition rate (how often users choose to open in browser)

## Timeline
- Alpha release: Basic PR approval functionality
- Beta release: PR listing and improved error handling
- v1.0: Full feature set including CI status integration, interactive mode, code diff review, PR description view, and browser integration
- Post-launch: Gather user feedback and prioritize remaining enhancements
- Regular UX iterations based on user feedback and usage metrics
