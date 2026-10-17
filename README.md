# Metadamen Engineering Docs

Engineering documentation for the Metadamen codebase.

**New here?** Read these in order:

1. [Architecture overview](architecture/overview.md): what runs today, and what we are building next
2. [Set up your local environment](getting-started/local-setup.md): macOS and Windows
3. [Database](database/erd.md): ERD, schemas and database users
4. [Backend service](services/backend-svc.md): how the API is built, response format, error codes

## All docs

| Topic | Doc |
|---|---|
| Getting started | [Set up your local environment](getting-started/local-setup.md) |
| Architecture | [Architecture overview](architecture/overview.md) |
| Database | [ERD, schemas and users](database/erd.md) |
| Services | [Backend service (`metadamen-backend-svc`)](services/backend-svc.md) |
| Guides | [Shared packages: installing `@metadamen-ai-career-os/*`](guides/shared-packages.md) |

## Read online

**https://metadamen-ai-career-os.github.io/metadamen-engineering-docs/**

The site is rebuilt and published automatically on every push to `main`.

## Contributing

- Write docs in plain Markdown. Draw diagrams with [Mermaid](https://mermaid.js.org) in a ` ```mermaid ` block; GitHub and the site both draw them.
- Put each doc in a folder that matches its topic. Add it to the table above **and** to `sidebar` in `.vitepress/config.mts`.
- When code changes something a doc describes (a new table, a new service), update the doc in the same week.
- These docs are **public**. Never put passwords, tokens, keys or AWS account IDs in them.

### Preview the site on your laptop

Needs Node.js 24 and npm 11 (see the [setup guide](getting-started/local-setup.md)).

```bash
npm install
```

```bash
npm run docs:dev
```

Open the address it prints. Pages reload as you edit. Before opening a pull request, check the full build passes;
it fails on broken links:

```bash
npm run docs:build
```
