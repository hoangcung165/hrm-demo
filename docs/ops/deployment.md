# Demo deployment (EC2, Vercel, Supabase)

The demo runs in three places (ADR 0005):

```
Browser ──► Vercel: web app (https://<project>.vercel.app)
               │  /api/* proxied (web/vercel.json)
               ▼
            EC2: Caddy, HTTPS for HRM_API_HOST ──► app container :8080 ──► Supabase PostgreSQL (docs/ops/database.md)
```

**Why a proxy.** The browser only ever talks to the Vercel origin, so `/api` stays same-origin. The refresh cookie is `HttpOnly`, `SameSite=Strict` and scoped to `/api/auth`, and the API has no CORS. Calling the API host directly from the browser would break both. Keep the rewrite.

| What | Where |
|---|---|
| Web app | Vercel project, root directory `web`, deployed by Vercel on every push to `main` |
| API | `ghcr.io/hoangcung165/hrm-demo:<commit sha>`, deployed by the manual workflow **Deploy API** (`.github/workflows/deploy-api.yml`) |
| Compose on the instance | `~/hrm`: `docker-compose.prod.yml` + `deploy/ec2/docker-compose.ec2.yml` (Caddy, memory) + `deploy/ec2/Caddyfile`, copied by the workflow; `.env` written by hand |
| Database | Supabase, schema `hrm` (`docs/ops/database.md`) |

## 1. EC2 instance (one time)

1. Launch an instance in `ap-southeast-1` (same region as the database): **t3.small** (2 GB, x86_64, the image is built for amd64), Ubuntu 24.04, 20 GB gp3.
2. Attach an **Elastic IP**, so the address survives a stop and start.
3. Security group, inbound:
   - 22 from anywhere, key authentication only. GitHub-hosted runners have no fixed address.
   - 80 and 443 from anywhere. Caddy needs 80 for the Let's Encrypt challenge and redirects it to HTTPS.
   - **Not 8080.** The app port also listens only on the loopback interface (`HRM_APP_PORT` below).
4. Install Docker with the compose plugin, and let the login user run it:

   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker "$USER"     # sign out and in again
   ```

5. Make a key pair only for deploys and allow it on the instance:

   ```bash
   ssh-keygen -t ed25519 -N "" -C hrm-deploy -f hrm-deploy      # on your machine
   # append hrm-deploy.pub to ~/.ssh/authorized_keys on the instance
   ```

6. Write `~/hrm/.env` on the instance (`mkdir -p ~/hrm && chmod 600 ~/hrm/.env`). It holds every secret; nothing of it goes into the repository:

   ```bash
   HRM_API_HOST=<api host>                        # step 2; Caddy gets its certificate for this name
   HRM_APP_PORT=127.0.0.1:8080                    # app port on the loopback interface only
   HRM_APP_URL=https://<project>.vercel.app       # the web app, used in links inside emails

   HRM_DB_URL="jdbc:postgresql://aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require&currentSchema=hrm"
   HRM_DB_USER=hrm_app.<project ref>
   HRM_DB_PASSWORD=<hrm_app password>
   SPRING_FLYWAY_DEFAULT_SCHEMA=hrm

   HRM_JWT_SECRET=<openssl rand -hex 32>
   HRM_ADMIN_EMAIL=<first Admin email>
   HRM_ADMIN_PASSWORD=<first Admin password>
   HRM_DEMO_PERSONAS=false
   ```

   The deploy workflow adds `HRM_IMAGE` itself.

   `HRM_ADMIN_EMAIL` and `HRM_ADMIN_PASSWORD` are required, but they only create an Admin while the account table is empty. The demo database already has its Admin (seeded on 04/10/2026), so these values neither create nor change it: sign in with that Admin's current password.

**Mail.** No outgoing mail yet: mails (password reset) land in the Mailpit container. Read them through a tunnel, `ssh -L 8025:localhost:8025 <instance>`, then http://localhost:8025. For real mail later, set `HRM_MAIL_HOST`, `HRM_MAIL_PORT`, `HRM_MAIL_USER`, `HRM_MAIL_PASSWORD` and `HRM_MAIL_FROM` in `.env` and run the deploy again.

## 2. API host name (one time)

Point an `A` record for the API host at the Elastic IP, for example `api.<your domain>`. Without a domain, `<elastic ip with dashes>.sslip.io` (such as `13-250-1-2.sslip.io`) resolves to the address and gets a real certificate too.

The name must resolve before the first deploy, or Caddy cannot get the certificate.

## 3. GitHub (one time)

Settings → Environments → **production** (add yourself as a required reviewer to confirm each deploy):

| Kind | Name | Value |
|---|---|---|
| Secret | `EC2_HOST` | Elastic IP or host name used for SSH |
| Secret | `EC2_USER` | `ubuntu` on Ubuntu |
| Secret | `EC2_SSH_KEY` | The private key `hrm-deploy` |
| Secret | `EC2_KNOWN_HOSTS` | Output of `ssh-keyscan -t ed25519 <EC2_HOST>`, checked against the fingerprint on the instance (`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`) |
| Variable | `HRM_API_HOST` | Same as in `.env`; the workflow waits for `https://$HRM_API_HOST/actuator/health` |

The image is a private GHCR package. The workflow signs the instance in to GHCR with the run's own token for the pull and signs out again.

## 4. Vercel (one time)

1. Replace `hrm-api.invalid` in `web/vercel.json` with the API host, through a PR. `vercel.json` cannot read environment variables. Done on 29/10/2026: `175-41-136-120.sslip.io` (no domain yet; sslip.io resolves it to the Elastic IP).
2. New project from the GitHub repository: **Root Directory** `web`, framework preset Vite (build `npm run build`, output `dist`), Node.js **22.x** in the project settings. Done on 27/10/2026: project `hrm-demo`, production URL https://hrm-demo-iota.vercel.app.
3. Production branch `main`. Each preview deployment proxies to the same API, so previews share the demo data.
4. Put the production URL in `HRM_APP_URL` on the instance.

The Hobby plan is for non-commercial use only. Showing the demo to customers needs the Pro plan.

## 5. Deploy

Actions → **Deploy API** → Run workflow on `main`, `image_tag` empty. The workflow builds and pushes the image, copies the compose files, pulls, restarts, and fails unless `/actuator/health` reports `UP` within 3 minutes (it prints the last app logs). On start, Flyway applies any migration the database does not have yet (none when it is already current, as after the manual migration of 28/10/2026) and the app seeds the shared catalog defaults once.

**Web and API ship separately.** Vercel deploys the web app on every merge; the API only when the workflow runs. After merging a PR that changes the API, run **Deploy API** right away, so the web app never calls endpoints the API does not have yet.

### Roll back

Run **Deploy API** with `image_tag` set to the commit SHA of an earlier deploy (shown in that run's log and on the GHCR package page). Nothing is built. Migrations are not undone: an older image starts on a newer schema only while the newer migrations are additive. Otherwise restore a backup (`docs/ops/database.md`).

Roll back the web app in Vercel (Deployments → an earlier deployment → Promote).

## Operate

On the instance, in `~/hrm`:

```bash
compose="docker compose -f docker-compose.prod.yml -f deploy/ec2/docker-compose.ec2.yml"
$compose ps
$compose logs -f app            # also: caddy, mail
$compose restart app            # after editing .env
```

## Check after the first deploy

- `curl https://<api host>/actuator/health` answers `"status":"UP"`.
- `curl --max-time 5 http://<elastic ip>:8080` times out.
- On the Vercel URL: sign in, reload the page and stay signed in (refresh cookie through the proxy), sign out.
- Import an Excel file close to 5 MB on `/employees`, to check that the proxy passes the largest upload.
