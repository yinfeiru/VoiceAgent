# Contributing to VoiceAgent

We love your input! We want to make contributing to VoiceAgent as easy and transparent as possible.

## Development Process

We use GitHub to host code, track issues and feature requests, and accept pull requests.

## Pull Requests

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Any Contributions You Make Will Be Under the MIT Software License

When you submit code changes, your submissions are understood to be under the same [MIT License](LICENSE) that covers the project.

## Report Bugs Using GitHub Issues

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](../../issues).

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Development Setup

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python fastrtc_server.py
```

### Frontend Development

```bash
cd frontend-react
npm install
npm start
```

### Code Style

- **Python**: Follow PEP 8 style guide
- **TypeScript/React**: Use ESLint and Prettier configurations
- **Commits**: Use conventional commit messages

### Testing

```bash
# Backend tests
cd backend
python -m pytest

# Frontend tests  
cd frontend-react
npm test
```

## License

By contributing, you agree that your contributions will be licensed under its MIT License.

## Questions?

Feel free to open an issue for any questions about contributing! 