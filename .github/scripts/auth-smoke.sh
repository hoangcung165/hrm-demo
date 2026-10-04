#!/usr/bin/env bash
# Walks the auth API over real HTTP against a running app and prints a Markdown transcript.
# Exits non-zero when a response status is not the expected one.
#   BASE_URL       default http://localhost:8080
#   HRM_ADMIN_EMAIL / HRM_ADMIN_PASSWORD   default: the dev profile's seeded Admin
#   DB_CONTAINER   optional: docker container running PostgreSQL, to show what is stored
set -uo pipefail

BASE="${BASE_URL:-http://localhost:8080}"
EMAIL="${HRM_ADMIN_EMAIL:-admin@hrm.local}"
PASSWORD="${HRM_ADMIN_PASSWORD:-admin12345}"
tmp="$(mktemp -d)"
fail=0

# Never print whole tokens.
redact() {
  sed -E 's/("accessToken":")([^"]{16})[^"]*/\1\2…/; s/(refresh_token=)([^;]{8})[^;]*/\1\2…/'
}

# step <title> <expected status> <method> <path> [curl args...]
step() {
  local title="$1" expected="$2" method="$3" path="$4"
  shift 4
  local status mark="OK"
  status="$(curl -sS -o "$tmp/body" -D "$tmp/headers" -w '%{http_code}' -X "$method" "$BASE$path" "$@")"
  if [ "$status" != "$expected" ]; then
    mark="UNEXPECTED, wanted $expected"
    fail=1
  fi
  echo "**$title**"
  echo
  echo '```http'
  echo "$method $path"
  echo "HTTP $status   [$mark]"
  grep -iE '^(set-cookie|content-type|www-authenticate):' "$tmp/headers" | tr -d '\r' | redact
  if [ -s "$tmp/body" ]; then
    echo
    redact < "$tmp/body"
    echo
  fi
  echo '```'
  echo
}

cookie_from_headers() {
  grep -i '^set-cookie:' "$tmp/headers" | sed -E 's/.*refresh_token=([^;]*).*/\1/' | tr -d '\r'
}

login_body() {
  printf '{"email":"%s","password":"%s"}' "$EMAIL" "$1"
}

echo "### Auth API over real HTTP"
echo
echo "App started with \`bootRun\` (dev profile) on PostgreSQL 16; requests sent with curl. Tokens are truncated."
echo

step "1. Health is public" 200 GET /actuator/health
step "2. /api/me without a token" 401 GET /api/me
step "3. OpenAPI docs without a token" 401 GET /v3/api-docs
step "4. Login with a wrong password" 401 POST /api/auth/login \
  -H 'Content-Type: application/json' -d "$(login_body wrong-password)"
step "5. Login with an invalid body" 400 POST /api/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"not-an-email","password":""}'
step "6. Login" 200 POST /api/auth/login \
  -H 'Content-Type: application/json' -d "$(login_body "$PASSWORD")"
access="$(jq -r '.accessToken // empty' "$tmp/body")"
cookie1="$(cookie_from_headers)"

echo "Access token claims (decoded payload):"
echo
echo '```json'
python3 - "$access" <<'PY'
import base64, json, sys
parts = sys.argv[1].split(".")
if len(parts) == 3:
    payload = parts[1] + "=" * (-len(parts[1]) % 4)
    claims = json.loads(base64.urlsafe_b64decode(payload))
    claims["lifetimeSeconds"] = claims.get("exp", 0) - claims.get("iat", 0)
    print(json.dumps(claims, indent=2))
    print("header:", base64.urlsafe_b64decode(parts[0] + "=" * (-len(parts[0]) % 4)).decode())
else:
    print("no access token")
PY
echo '```'
echo

step "7. /api/me with the access token" 200 GET /api/me -H "Authorization: Bearer $access"
step "8. /api/me with a tampered token" 401 GET /api/me -H "Authorization: Bearer ${access}x"
step "9. Refresh with the cookie from login (rotation)" 200 POST /api/auth/refresh \
  -H "Cookie: refresh_token=$cookie1"
cookie2="$(cookie_from_headers)"
if [ -n "$cookie1" ] && [ "$cookie1" != "$cookie2" ]; then
  echo "Refresh cookie changed after rotation: yes"
else
  echo "Refresh cookie changed after rotation: NO"
  fail=1
fi
echo
step "10. Reuse the first (already rotated) refresh token" 401 POST /api/auth/refresh \
  -H "Cookie: refresh_token=$cookie1"
step "11. The newest token of that family is now revoked too" 401 POST /api/auth/refresh \
  -H "Cookie: refresh_token=$cookie2"
step "12. Refresh without a cookie" 401 POST /api/auth/refresh

step "13. Login again" 200 POST /api/auth/login \
  -H 'Content-Type: application/json' -d "$(login_body "$PASSWORD")"
cookie3="$(cookie_from_headers)"
step "14. Logout" 204 POST /api/auth/logout -H "Cookie: refresh_token=$cookie3"
step "15. Refresh after logout" 401 POST /api/auth/refresh -H "Cookie: refresh_token=$cookie3"

if [ -n "${DB_CONTAINER:-}" ]; then
  echo "**What is stored in PostgreSQL** (password as BCrypt, refresh tokens as SHA-256 hex)"
  echo
  echo '```'
  docker exec "$DB_CONTAINER" psql -U hrm -d hrm -c \
    "select a.email, a.status, left(a.password_hash, 7) || '…' as password_hash, length(a.password_hash) as hash_len,
            (select string_agg(r.role, ',') from account_role r where r.account_id = a.id) as roles
       from account a"
  docker exec "$DB_CONTAINER" psql -U hrm -d hrm -c \
    "select left(token_hash, 10) || '…' as token_hash, length(token_hash) as hash_len, left(family_id::text, 8) as family,
            used_at is not null as used, revoked_at is not null as revoked
       from refresh_token order by created_at"
  echo '```'
  echo
fi

if [ "$fail" -eq 0 ]; then
  echo "Result: all responses matched the expected status."
else
  echo "Result: FAILED, at least one response was unexpected."
fi
exit "$fail"
