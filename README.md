# LGTM CLI

A command-line tool that simplifies the GitHub PR review process by allowing developers to approve pull requests directly from their terminal.

## Features

- Approve PRs without leaving your terminal
- View open PRs with their status in an interactive interface
- Review PR code changes with syntax highlighting
- View PR descriptions with formatted markdown
- Open PRs in browser when needed
- Smart CI status checking before approval

## Installation

```bash
npm install -g lgtm-cli
```

## Usage

Basic PR approval:
```bash
lgtm 123
```

Interactive PR selection:
```bash
lgtm
```

List open PRs:
```bash
lgtm --list
```

Review PR code changes:
```bash
lgtm 123 --review
```

View PR description:
```bash
lgtm 123 --description
```

Open PR in browser:
```bash
lgtm 123 --open
```

## Requirements

- Node.js 16.x to 23.x
- GitHub account with access to repositories

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/username/lgtm-cli.git
cd lgtm-cli

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Available Scripts

- `npm run build` - Build the project
- `npm run dev` - Run in development mode
- `npm test` - Run tests
- `npm run lint` - Run linting
- `npm run format` - Format code

## License

MIT 