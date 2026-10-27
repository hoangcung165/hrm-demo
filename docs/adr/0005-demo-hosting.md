# Demo hosting: web app on Vercel, API on EC2, database on Supabase

ADR 0001 packages the web app inside the Spring Boot jar, so one artifact serves both. For the demo deployment the owner chose to serve the **web app from Vercel**, the **API from one EC2 instance** behind Caddy, and the **database from Supabase** (27/10/2026, issue #368). Setup: `docs/ops/deployment.md`.

Vercel proxies `/api/*` to the API host (`web/vercel.json`), so the browser sees one origin. The refresh cookie stays `SameSite=Strict`, scoped to `/api/auth`, and the API needs no CORS. That keeps the security model of ADR 0001 unchanged.

## Considered Options

- **The single image on one host (ADR 0001 as is): not chosen for the demo.** Cheapest and one deploy, but the owner wanted the web app on Vercel (CDN, preview deployments per PR, rollbacks in one click).
- **Browser calls the API host directly: rejected.** Needs CORS and a `SameSite=None` refresh cookie, a weaker setup that differs from on-prem.
- **Container platform instead of EC2 (Render, Fly.io): not chosen.** Less to operate, but the owner prefers EC2; free tiers sleep, and a Spring Boot cold start is too slow in front of a customer.

## Consequences

- **The image still contains the web app.** On-prem and `docker compose up` keep working from one artifact; on EC2 the copy inside the jar is simply unused.
- **Two deploys.** Vercel deploys the web app on every merge to `main`; the API deploys only through the manual workflow. A change to the API is deployed right after its merge.
- **The API host is fixed in `web/vercel.json`**, because Vercel rewrites cannot read environment variables. Changing the host is a PR.
- **Every request takes one more hop** (Vercel to Singapore). Acceptable for a demo.
- **Vercel's Hobby plan is non-commercial**; customer demos need the Pro plan.
