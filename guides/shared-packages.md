# Shared packages

Code that more than one service needs lives in
[`metadamen-packages`](https://github.com/metadamen-ai-career-os/metadamen-packages) and is published as private npm packages
to **GitHub Packages**. A service installs them with `npm install`, like any other package.

| Package | What it gives you |
|---|---|
| `@metadamen-ai-career-os/logger` | Structured JSON logging with secrets hidden (`LOG_LEVEL`, `LOG_FORMAT`) |
| `@metadamen-ai-career-os/db-postgres` | Postgres connection pool, plus the `metadamen-db migrate` command that creates every table |

---

## How it fits together

```mermaid
flowchart LR
    pr["PR to metadamen-packages<br/>with a changeset"] --> main["merged to main"]
    main --> bump["Release workflow opens<br/>'chore: bump package versions' PR"]
    bump -- "you merge it" --> publish["CI publishes new versions"]
    publish --> registry[("GitHub Packages<br/>npm.pkg.github.com")]
    registry -- "npm install<br/>(your token)" --> laptop["Your laptop"]
    registry -- "npm ci<br/>(GITHUB_TOKEN)" --> ci["Service CI"]
```

Nobody publishes from a laptop. Only CI does, when the version PR is merged.

---

## 1. Log in once per laptop

npm needs a GitHub token to download private packages.

1. On GitHub: **Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token (classic)**.
2. Tick only **`read:packages`**, pick an expiry, create it and copy it.
3. Log in:

   ```bash
   npm login --scope=@metadamen-ai-career-os --auth-type=legacy --registry=https://npm.pkg.github.com
   ```

   **Username:** your GitHub username. **Password:** the token.

The token goes into the `.npmrc` in your **home folder** and works for every repo. It never goes into a repo.

---

## 2. Point the service repo at GitHub Packages

Every service repo commits an `.npmrc` like this. It holds **no token**:

```ini
engine-strict=true
@metadamen-ai-career-os:registry=https://npm.pkg.github.com
```

The second line says: packages starting with `@metadamen-ai-career-os/` come from GitHub; everything else still comes from npmjs.org.

| Repo | Has it |
|---|---|
| `metadamen-backend-svc` | ✅ |
| `metadamen-notification-svc`, `metadamen-llm-svc` | Add it when the repo is set up |

---

## 3. Install and use

```bash
npm install @metadamen-ai-career-os/logger @metadamen-ai-career-os/db-postgres
```

```ts
import { createLogger } from "@metadamen-ai-career-os/logger";

const logger = createLogger({ service: "backend" });
logger.info({ userId }, "user signed in");
```

Full usage: [metadamen-packages README](https://github.com/metadamen-ai-career-os/metadamen-packages#readme).

### Get newer versions

```bash
npm outdated
```

```bash
npm update @metadamen-ai-career-os/logger
```

Each package has a `CHANGELOG.md` saying what changed. A **major** version bump (e.g. `1.x` → `2.x`) means something your code uses may have changed. Read the changelog before updating.

---

## 4. Create the tables in your local database

`db-postgres` contains every migration. A service that installs it can create the tables at the version it installed,
without cloning `metadamen-packages`.

1. Start Postgres (`npm run docker:up` in `metadamen-tooling`).
2. Add to the service's `.env`:

   ```bash
   MIGRATOR_DATABASE_URL=postgres://migrator:migrator@localhost:5432/metadamen
   ```

3. Run:

   ```bash
   npx metadamen-db migrate
   ```

---

## 5. Let the service's CI install them

GitHub Actions needs a token too. It uses the built-in `GITHUB_TOKEN`, so there's no secret to create. Two changes:

**a. In the workflow** (`.github/workflows/ci.yml`):

```yaml
jobs:
  quality:
    permissions:
      contents: read
      packages: read            # allows downloading our packages

    steps:
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          registry-url: https://npm.pkg.github.com
          scope: "@metadamen-ai-career-os"

      - name: Install dependencies
        run: npm ci
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**b. On each package**, allow the service repo to read it: open the package on GitHub
(org → **Packages** → e.g. `logger`) → **Package settings** → **Manage Actions access** → **Add repository** → pick the service repo → role **Read**.
Do this for every package the service installs.

> **`metadamen-backend-svc`:** its CI doesn't have these changes yet. It works today because it installs no shared package so far.
> Make both changes in the same pull request that installs the first one, or `npm ci` will fail in CI.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm install` says `401 Unauthorized` | Not logged in, or the token expired. Repeat step 1 |
| `npm install` says `404 Not Found` for `@metadamen-ai-career-os/...` | The repo's `.npmrc` is missing the registry line (step 2), or the token lacks `read:packages` |
| `npm install` says `403 Forbidden` | Your GitHub account can't see the package. Ask an org admin for access |
| CI: `npm ci` fails with `401`/`403` on our packages | Step 5: check `packages: read`, `NODE_AUTH_TOKEN`, and the package's **Manage Actions access** |
| `npx metadamen-db migrate` can't connect | Postgres isn't running, or `MIGRATOR_DATABASE_URL` is missing from `.env` |
