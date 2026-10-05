# Demo database (Supabase)

The demo deployment uses a managed PostgreSQL 17 on Supabase instead of the `db` container. Only the Postgres part of Supabase is used. Auth, Storage and the Data API (REST) stay unused.

| | |
|---|---|
| Project | `hrm-demo`, ref `zyopwtytiddbhbzqfmsb`, region `ap-southeast-1` (Singapore, same as the app host), Free plan |
| Schema | `hrm`, migrated by Flyway on app start (same migrations as local, `backend/src/main/resources/db/migration/`) |
| Login role | `hrm_app`, owner of schema `hrm`; the app never uses the `postgres` superuser |
| Connection | Session pooler `aws-0-ap-southeast-1.pooler.supabase.com:5432`, TLS required |

## Why a separate schema and role

- **The Data API only exposes `public`.** Supabase exposes `public` to its REST API, and every project ships an anon key. Tables in `hrm` are out of that path: `anon`, `authenticated` and `service_role` have no privileges on the schema. The app authorizes requests itself, so RLS is not used.
- **Advisor false positive.** The Supabase table view flags "RLS disabled" on these tables. That warning assumes the API roles can reach them, and here they cannot. Check it with the query in [Verify](#verify).
- **A dedicated role limits the blast radius.** If the app's credentials leak, the attacker gets one schema, not the whole project.

## Connection settings

Session pooler, not the other two endpoints:
- The direct host `db.<ref>.supabase.co` is IPv6 only, which most hosts (EC2 by default) cannot reach.
- The transaction pooler (port 6543) breaks the server-side prepared statements that JDBC and Hibernate use.

`.env` on the host that runs the app:

```bash
HRM_DB_URL="jdbc:postgresql://aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require&currentSchema=hrm"
HRM_DB_USER=hrm_app.zyopwtytiddbhbzqfmsb      # pooler user is <role>.<project ref>
HRM_DB_PASSWORD=<hrm_app password>
SPRING_FLYWAY_DEFAULT_SCHEMA=hrm               # must match currentSchema above
SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=5
```

Quote `HRM_DB_URL`, because the `&` in it breaks shell sourcing. Then run:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

`docker-compose.prod.yml` has no `db` service. It stops with an error when a required value is missing from `.env`.

## One-time setup from an empty project

1. In the Supabase dashboard, create a project in `ap-southeast-1`.
2. In the SQL editor, run the following with a fresh random password (for example `openssl rand -hex 24`):

   ```sql
   create role hrm_app with login password '<password>';
   grant hrm_app to postgres;          -- PostgreSQL 16+: needed to create a schema owned by hrm_app
   create schema hrm authorization hrm_app;
   revoke all on schema hrm from public;
   alter role hrm_app set search_path = hrm;
   ```

3. Start the app once with the settings above. Flyway creates the tables and the first Admin Account is seeded from `HRM_ADMIN_EMAIL` / `HRM_ADMIN_PASSWORD`.

   `HRM_DEMO_PERSONAS` is off on the demo deployment unless set in `.env`. Turning it on seeds seven persona Accounts at the next start; turning it off locks them at the next start, and turning it on again does not unlock them (an Admin unlocks them, or reset the demo data). While it is on, any signed-in Account will be able to become Admin through "Demo as…", so never enable it on real data.
4. Add the GitHub secret for maintenance (next section).

## Keep-alive and backups

The workflow `.github/workflows/db-maintenance.yml` covers two limits of the Free plan:

| Free plan limit | What the workflow does |
|---|---|
| A project with low database activity over 7 days is paused | Runs two small queries at 01:17, 09:17 and 17:17 UTC every day |
| No downloadable backups | Once a day (01:17 UTC) and on every manual run, dumps schema `hrm` with `pg_dump` 17, custom format, and keeps it as a workflow artifact for 14 days |

The dump keeps the table structure of `refresh_token` and `password_reset_token` but leaves out their rows, which are live credentials. Restoring a dump therefore signs everyone out.

**Secret.** Add the repository secret `HRM_DB_PSQL_URL` under Settings → Secrets and variables → Actions:

```
postgresql://hrm_app.zyopwtytiddbhbzqfmsb:<password>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require
```

Without it, the workflow fails on its first step with a message pointing here.

**Scheduling caveats.** GitHub runs scheduled workflows only from `main`, and disables them after 60 days without repository activity. Supabase emails the owner a week before it pauses a project. A paused project can be resumed from the dashboard for 90 days.

## Restore a backup

1. Download the artifact from the workflow run (Actions → DB maintenance → run → Artifacts) and unzip it.
2. Restore it over the current schema:

```bash
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname "$HRM_DB_PSQL_URL" hrm-<timestamp>.dump
```

Use `pg_restore` 17. If the local client is older, run it with `docker run --rm -v "$PWD:/w" postgres:17-alpine pg_restore ... /w/<file>`.

## Reset the demo data

Drop and recreate the schema as `postgres` in the SQL editor:

```sql
drop schema hrm cascade;
create schema hrm authorization hrm_app;
revoke all on schema hrm from public;
```

Then restart the app. Flyway migrates again and the first Admin Account is seeded again.

## Verify

```sql
-- Supabase API roles must not reach schema hrm (all false).
select r, has_schema_privilege(r, 'hrm', 'USAGE')
from unnest(array['anon', 'authenticated', 'service_role']) r;

-- Applied migrations.
select version, description, success from hrm.flyway_schema_history order by installed_rank;
```
