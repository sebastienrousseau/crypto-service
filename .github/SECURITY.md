# Security

We take the security of our software products and services seriously, which
includes all source code repositories managed through our GitHub repositories.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.0.3   | Yes       |
| < 0.0.3 | No        |

## Reporting Security Issues

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to **security@crypto-service.co**.

Please include the requested information listed below (as much as you can
provide) to help us better understand the nature and scope of the possible
issue:

- Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

This information will help us triage your report more quickly.

## Disclosure Timeline

- **Day 0**: Vulnerability reported via email
- **Day 1-3**: Acknowledgement sent to reporter
- **Day 1-14**: Investigation and fix development
- **Day 14-30**: Patch release and coordinated public disclosure

We aim to acknowledge reports within 3 business days and to release a fix within
30 days of acknowledgement, depending on complexity.

## Security Best Practices

When deploying the Crypto Service Suite in production:

- Set `JWT_SECRET` and `CRYPTO_API_KEY` environment variables — never run with anonymous access enabled
- Configure `CORS_ORIGIN` to restrict allowed origins
- Set `TRUSTED_PROXY_CIDRS` if behind a reverse proxy
- Use `NODE_ENV=production` to enable production logging and disable dev shortcuts
- Keep all dependencies up to date
