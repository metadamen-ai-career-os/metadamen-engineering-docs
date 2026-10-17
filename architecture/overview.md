# Architecture

How the pieces of Metadamen fit together: **what runs today**, and **what we are building next**.

> This page shows the system as of **2026-10-17**. Anything marked _planned_ is agreed but not built, and details may change.

---

## Repositories

All repos live in the GitHub organization [`metadamen-ai-career-os`](https://github.com/metadamen-ai-career-os).

| Repo | What it is | Tech | Status |
|---|---|---|---|
| `metadamen-web-app` | The signed-in app for Students, TPOs and Admins | React, TypeScript, Vite | ✅ Skeleton, deployed to AWS |
| `metadamen-infra` | AWS infrastructure as code | AWS CDK (TypeScript) | ✅ Web hosting + GitHub deploy access |
| `metadamen-tooling` | Local development environment | Docker Compose: Postgres 18, Floci (local AWS) | ✅ Done |
| `metadamen-packages` | Shared libraries + database migrations | TypeScript, npm workspaces, Changesets | ✅ `logger`, `db-postgres` published |
| `metadamen-engineering-docs` | These docs | Markdown | ✅ Started |
| `metadamen-backend-svc` | Main API: sign-in, roles, colleges, students, CRI, roadmaps | TypeScript, AWS Lambda, Express for local dev | 🟡 Started: `GET /health`, response format, error codes. Not on AWS yet |
| `metadamen-notification-svc` | Sends email / SMS / in-app notifications | Node.js, TypeScript | 🔜 Planned |
| `metadamen-llm-svc` | AI features: ARIA chat, analysis | Node.js, TypeScript | 🔜 Planned |
| `metadamen-web` | Public marketing website | — | 🔜 Planned |

---

## Today: on AWS

Only the web app is live. It's a static site: the backend and database aren't on AWS yet.

```mermaid
flowchart LR
    user(["👤 Visitor's browser"])

    subgraph gh["GitHub"]
        ci["metadamen-web-app<br/>CI: check, test, build"]
        deploy["Deploy workflow<br/>(run by hand: dev / qa / stg)"]
        ci -- "built site (dist)" --> deploy
    end

    subgraph aws["AWS account nprd · ap-south-1 (Mumbai)"]
        oidc["IAM: GitHub OIDC<br/>+ deploy role"]
        cf["CloudFront<br/>(CDN, HTTPS)"]
        s3[("S3 bucket<br/>metadamen-web-app-&lt;stage&gt;<br/>private")]
        cf -- "reads (Origin Access Control)" --> s3
    end

    deploy -- "logs in without stored keys" --> oidc
    deploy -- "uploads files" --> s3
    deploy -- "clears cache" --> cf
    user -- "https" --> cf
```

| Environment | Purpose | AWS account | When deleted |
|---|---|---|---|
| `dev` | Developer testing | nprd | Everything removed |
| `qa` | QA testing | nprd | Everything removed |
| `stg` | Final check before release | nprd | Data kept |
| `prd` | Live | _not created yet_ | Data kept |

All AWS resources are created by `metadamen-infra`. Nobody creates them by hand in the AWS console.

---

## Today: on your laptop

```mermaid
flowchart LR
    dev(["👩‍💻 You"])

    subgraph laptop["Your laptop"]
        web["metadamen-web-app<br/>npm run dev<br/>localhost:5173"]
        api["metadamen-backend-svc<br/>npm run dev<br/>localhost:3000"]
        pkgs["metadamen-packages<br/>npm run db:migrate"]

        subgraph docker["Docker (metadamen-tooling)"]
            pg[("Postgres 18<br/>localhost:5432")]
            floci["Floci = local AWS<br/>SQS, S3, Cognito, ...<br/>localhost:4566"]
            ui["Floci console<br/>localhost:4500"]
            ui --> floci
        end

        web -- "API calls (CORS: only :5173)" --> api
        pkgs -- "as migrator" --> pg
    end

    registry["GitHub Packages<br/>@metadamen-ai-career-os/*"]

    dev --> web
    dev --> api
    dev --> pkgs
    pkgs -. "CI publishes logger, db-postgres" .-> registry
    registry -. "npm install" .-> api
```

- **Floci** behaves like AWS on your laptop, so you develop without an AWS account and without cost.
  The same code talks to real AWS when `AWS_ENDPOINT_URL` isn't set.
- **The backend** runs its real Lambda handlers inside a small Express server, so you test the same code that will run on AWS.
  See [Backend service](../services/backend-svc.md).
- **Shared libraries** are published by CI to GitHub Packages. Services install them with `npm install`, like any other package.
  See [Shared packages](../guides/shared-packages.md).

Set it up: [Local setup guide](../getting-started/local-setup.md)

---

## Planned: the full platform

```mermaid
flowchart TB
    student(["🎓 Student"])
    tpo(["🏫 TPO"])
    admin(["🛠️ Admin"])

    subgraph edge["Front end"]
        site["metadamen-web<br/>public website"]
        app["metadamen-web-app<br/>CloudFront + S3"]
    end

    cognito["AWS Cognito<br/>sign-in: Google, LinkedIn,<br/>mobile OTP, email"]

    apigw["API Gateway (HTTP API)<br/>CORS: web app only"]

    subgraph services["Services (planned)"]
        backend["metadamen-backend-svc<br/>one Lambda per endpoint<br/>roles &amp; permissions · colleges ·<br/>students · CRI · roadmaps"]
        notif["metadamen-notification-svc<br/>email · SMS · in-app"]
        llm["metadamen-llm-svc<br/>ARIA chat · analysis"]
    end

    subgraph data["Data (planned)"]
        rds[("Postgres on Amazon RDS<br/>one database: metadamen<br/>schema per module")]
        sqs["SQS queues"]
        s3files[("S3<br/>resumes, CRI reports")]
        secrets["Secrets Manager / SSM<br/>passwords &amp; config"]
    end

    llmapi["LLM provider"]
    channels["Email / SMS provider"]

    student & tpo & admin --> app
    student --> site
    app -- "sign in" --> cognito
    app -- "API calls with Cognito token" --> apigw
    apigw --> backend
    backend -- "checks token" --> cognito

    backend -- "backend_svc user<br/>auth · org · student schemas" --> rds
    notif -- "notification_svc user<br/>notification schema" --> rds
    llm -- "llm_svc user<br/>llm schema" --> rds

    backend -- "notification events" --> sqs
    sqs --> notif
    notif --> channels

    backend -- "sends the data it needs" --> llm
    llm --> llmapi

    backend --> s3files
    backend & notif & llm -. "read at startup" .-> secrets
```

### How a request will work

```mermaid
sequenceDiagram
    actor U as Student
    participant A as web-app
    participant C as Cognito
    participant G as API Gateway
    participant B as backend-svc (Lambda)
    participant D as Postgres

    U->>A: Sign in (e.g. Google)
    A->>C: Log in
    C-->>A: Token (contains the user's cognito_sub)
    A->>G: GET /cri-results (with token)
    G->>B: Calls the endpoint's Lambda
    B->>C: Is this token real?
    B->>D: Find user by cognito_sub, load their roles' permissions
    alt has cri_results.view
        B->>D: Load results (scope: own data only)
        B-->>A: 200 with data
    else no permission
        B-->>A: 403 with error code FORBIDDEN
    end
```

---

## Design rules

These hold for every service, today and in the future.

| Rule | Why |
|---|---|
| **One database, one schema per module.** | Simple to run and back up, but modules stay separated. |
| **Each service connects as its own database user.** | A bug or leaked password in one service can't affect another's data. |
| **Services never read another service's tables.** The owner sends the data (in the request or an event). | Each service can change its own tables without breaking others. |
| **Cognito proves _who_ you are. Our database decides _what_ you may do** (roles and permissions). | Admins change permissions in our app, and changes apply on the next request. |
| **Permissions are checked on every request**, not stored in the login token. | A removed permission stops working immediately. |
| **Infrastructure only through `metadamen-infra`.** | Every environment is identical and reviewable in a pull request. |
| **Every API response has the same shape:** `{ "data" }` or `{ "error": { "code" } }`. | The web app handles every endpoint the same way. See [Backend service](../services/backend-svc.md#response-format). |
| **Same code locally and on AWS.** Only environment variables differ (Floci locally, real AWS in the cloud). | No "works on my machine" surprises. |
| **Region `ap-south-1` (Mumbai)** for everything. | Close to our users in India. |

---

## Where to read more

- [Database: ERD, schemas and users](../database/erd.md)
- [Backend service](../services/backend-svc.md): response format, error codes, adding an endpoint
- [Shared packages](../guides/shared-packages.md): installing `@metadamen-ai-career-os/*` in a service
- [metadamen-infra README](https://github.com/metadamen-ai-career-os/metadamen-infra#readme): environments, deploying
- [metadamen-packages README](https://github.com/metadamen-ai-career-os/metadamen-packages#readme): shared libraries, migrations, releasing
