# Chroniqo

Chroniqo is a responsive web application serving as a digital community for people living with chronic conditions. It is designed to reduce social isolation by offering an adaptive, low-friction social environment.

The platform's core innovation is the **Dagsform** (daily energy level) indicator. When a user registers a low energy level, the system automatically activates **Low Energy Mode**, reducing cognitive load by hiding notification badges, replacing infinite scroll with pagination, and simplifying interactions.

<table>
  <tr>
    <td width="50%" align="center">
      <img src="docs/screenshots/chroniqo_depressed_mood_preview.png" alt="Chroniqo - Low Energy Mode view" width="100%"/>
      <br/>
      <sub><b>Low Energy Mode</b></sub>
    </td>
    <td width="50%" align="center">
      <img src="docs/screenshots/chroniqo_positive_mood_preview.png" alt="Chroniqo - standard view" width="100%"/>
      <br/>
      <sub><b>Standard view</b></sub>
    </td>
  </tr>
</table>

## Bachelor's Thesis Documentation

This repository accompanies the written bachelor's thesis for the Diplomingeniør i Softwareteknologi programme at Aarhus University.

- **Main report:** [`docs/report/290526_Rapport_Bachelorprojekt_Chroniqo_MadsDittmannVilladsen.pdf`](docs/report/290526_Rapport_Bachelorprojekt_Chroniqo_MadsDittmannVilladsen.pdf)
- **Annexes:** [`docs/annexes`](docs/annexes)
- **UI screenshots / page-by-page documentation:** [`290526_Bilag8_UI_Dokumentation_Chroniqo_MadsDittmannVilladsen.pdf`](docs/annexes/290526_Bilag8_UI_Dokumentation_Chroniqo_MadsDittmannVilladsen.pdf)

## Architecture & Tech Stack

Chroniqo is built as a **Next.js Fullstack Monolith** following the principles of Architectural Simplification.

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 (Utility-first, heavily utilizing CSS variables for dual-theme support)
- **Database:** PostgreSQL hosted on Neon.tech
- **ORM:** Prisma
- **Authentication:** Auth.js (NextAuth v5) using OAuth 2.0 PKCE and stateless JWT HttpOnly cookies
- **Caching & Rate Limiting:** Upstash Serverless Redis (running in Next.js Edge Middleware)
- **AI Integration:** Google Gemini API (Server-side only, Privacy-by-Design PII filtering)
- **Testing:** Jest (Unit & Integration) with `jest-mock-extended`
- **CI/CD:** GitLab CI/CD automating testing, Docker image packaging, and deployment to Vercel

## Prerequisites

To run this project locally, you need the following installed:

- **Node.js**: v20.9.0 or higher (v20-alpine used in CI)
- **npm**: v10+
- **Docker**: For running a local PostgreSQL database (optional if using a cloud dev database)
- **Git**

## Local Setup & Installation

**1. Clone the repository**

```bash
git clone `<repository-url>`
cd chroniqo-app
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure Environment Variables**
Create a `.env.local` file in the root directory and populate it with the following variables:

```env
# .env.example

# NextAuth URL (Used by NextAuth.js to determine the base URL
# for authentication-related routes and callbacks).
NEXTAUTH_URL=http://localhost:3000

# PostgreSQL connection string
DATABASE_URL="postgresql://user:password@localhost:5432/chroniqo?schema=public"

# Google OAuth
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# Email credentials for sending onboarding emails (using Nodemailer with Gmail SMTP)
EMAIL_USER="your_email@gmail.com"
EMAIL_PASS="your_email_password" # (xxx xxx xxx xxx)

# GEMINI API key (Used for AI-related chat support bot Niqo)
GEMINI_API_KEY="your_gemini_api_key"

# Upstash Redis credentials (Used for rate limiting and caching).
UPSTASH_REDIS_REST_URL="https://your_upstash_instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_upstash_rest_token"

# Auth.js secret (Used to encrypt the session cookie).
# Generated with `npx auth secret`.
AUTH_SECRET="your_auth_secret"

# Vercel Blob Storage token for read/write access (Used to manage media files in Vercel Blob Storage).
BLOB_READ_WRITE_TOKEN="your_vercel_blob_rw_token"
```

**4. Set up the Database**
If you are running a local database via Docker, start your container. Then, push the Prisma schema and generate the types:

```bash
npx prisma generate
npx prisma db push
```

**5. Start the Development Server**

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Repository Structure

The project strictly follows a layered architecture to separate HTTP concerns from business logic and data access.

```text
chroniqo-app/
|-- docs/ # Bachelor's thesis report, annexes, and screenshot
|   |-- report/ # Main written report
|   |-- annexes/ # Supporting annexes (diagrams, appendices, etc.)
|   |-- screenshots/
|   |   |-- chroniqo_depressed_mood_preview.png # Low Energy Mode screenshot shown in this README
|   |   |-- chroniqo_positive_mood_preview.png # Standard view screenshot shown in this README
|-- prisma/ # Database schema and migrations
|-- src/
|   |-- app/ # Next.js App Router (UI & Route Handlers)
|   |   |-- [locale]/ # Localized frontend routes and UI components
|   |   |-- api/ # API Route Handlers (Controllers + Zod Validation)
|   |-- components/ # Shared UI components (Shadcn, Radix UI)
|   |-- context/ # Global React Contexts (Theme, Session, Dagsform)
|   |-- lib/ # Shared utilities, DTOs, constants, and Prisma client
|   |-- messages/ # i18n translation dictionaries (da.json, en.json)
|   |-- services/ # Core Business Logic (isolated from HTTP)
|-- __tests__/ # Jest test suites (API, Services, Middleware)
|-- ...config files # Next, Tailwind, Jest, ESLint, GitLab CI
```

## Testing

Chroniqo uses **Jest** for automated unit and integration testing. The test suite heavily utilizes `jest-mock-extended` for 100% type-safe mocking of the Prisma client, allowing the `src/services` layer to be tested in isolation.

**Run all tests:**

```bash
npm run test
```

**Run tests with coverage report:**

```bash
npm run test:coverage
```

_Note: CI requires all tests to pass before a build can be packaged and deployed._

## Security Principles

- **Never roll your own crypto:** All session handling, CSRF protection, and OAuth flows are delegated to Auth.js.
- **Fail Fast:** Upstash Redis is queried in Edge Middleware (`src/middleware/proxy.ts`) to immediately reject rate-limited or malicious requests before hitting the Vercel Serverless Functions or PostgreSQL database.
- **Privacy by Design:** AI chat prompts are scrubbed of Personally Identifiable Information (PII) using regex pre-filtering before being dispatched to the Gemini API.

## Deployment

Deployment is fully automated via GitLab CI/CD (`.gitlab-ci.yml`).

1. **Check**: Runs ESLint, Type Checking (`tsc --noEmit`), and npm audit.
2. **Test**: Executes the Jest test suite.
3. **Build & Package**: Builds the Next.js app and pushes a Docker image to the registry.
4. **Deploy**: Automatically deploys the prebuilt artifacts to Vercel upon merging to the production branch.
