# TFHers nginx

- `tfhers.conf`: production site config (Vue SPA + API reverse proxy).
- Actions syncs this directory to `/opt/tfhers/deploy/nginx/` on every deploy.
- With marker `.auto_install` present, when `DO_NGINX=true` Actions copies
  `tfhers.conf` → `/etc/nginx/conf.d/tfhers.conf`, runs `nginx -t`, then reloads.
- This ECS listens on HTTP :80 only (`server_name tfhers.cn www.tfhers.cn`).
  If HTTPS terminates on CDN/SLB, keep that layer; do not add ssl_* here unless certs live on the box.
- Production currently runs **management only** on `:8081`; all `/api/` goes there.
  Local Vite still splits app `:8080` / management `:8081` for dev. When `tfhers-app` is enabled
  on the server, update the conf to match `frontend/vite.config.ts` proxy prefixes.
- Repo Spring legacy static under `tfhers-web-app` / `tfhers-web-management` is **not** deleted;
  live `root` is `/opt/tfhers/frontend/www` (Vue `dist`). `/admin` is served by the SPA
  (`try_files` → `index.html`), not by `/opt/tfhers/backend/www`.

## Auto-install marker

`deploy/nginx/.auto_install` (empty file) enables Actions auto-copy into `conf.d`.
On the server the same path is `/opt/tfhers/deploy/nginx/.auto_install`.
