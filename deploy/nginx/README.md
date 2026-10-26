# TFHers nginx

- `tfhers.conf`: production site config (Vue SPA + API reverse proxy).
- Actions syncs this directory to `/opt/tfhers/deploy/nginx/` on every deploy.
- **Live root (after cutover):** `/opt/tfhers/frontend/www-vue` (Vue `dist` from Actions).
- **Rollback root (kept until purge):** `/opt/tfhers/frontend/www` (legacy static). Do not delete
  legacy www or repo Spring static under `tfhers-web-app` / `tfhers-web-management` until
  live Vue is stable and Qinglin explicitly asks to purge.
- `/api/` proxies to management `:8081`. `/admin` is SPA history mode (`try_files` → `index.html`),
  not `/opt/tfhers/backend/www`.
- This ECS listens on HTTP `:80` only (`server_name tfhers.cn www.tfhers.cn`).
  If HTTPS terminates on CDN/SLB, keep that layer; do not add `ssl_*` here unless certs live on the box.
- Local Vite still splits app `:8080` / management `:8081` for dev. When `tfhers-app` is enabled
  on the server, update the conf to match `frontend/vite.config.ts` proxy prefixes.

## Installing conf into `/etc/nginx` (cutover)

Actions always stages `deploy/nginx/` on the server, then **removes** any
`/opt/tfhers/deploy/nginx/.auto_install` so a stale marker cannot overwrite live conf.

So the first Vue cutover after a push that updates `tfhers.conf` needs one of:

1. **Manual install on ECS (preferred):**
   ```bash
   sudo cp -a /opt/tfhers/deploy/nginx/tfhers.conf /etc/nginx/conf.d/tfhers.conf
   sudo nginx -t && sudo systemctl reload nginx
   ```
2. **Temporary `.auto_install`:** only with Qinglin's explicit OK for that push — change the
   workflow so it does not `rm` the marker for that run, commit an empty
   `deploy/nginx/.auto_install`, push once, then remove the marker and restore the `rm`.

Until one of those happens, live nginx keeps serving whatever is already in
`/etc/nginx/conf.d/tfhers.conf` (today: legacy `www`).

## Auto-install marker (optional)

`deploy/nginx/.auto_install` (empty file) is intended to let Actions copy into `conf.d`
when `DO_NGINX=true`. Because the deploy script currently strips that marker after rsync,
do **not** rely on committing `.auto_install` alone for cutover — use the manual copy above
unless Qinglin approves a one-shot workflow change.