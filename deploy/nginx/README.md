# TFHers nginx

- `tfhers.conf`: recommended site config (Vue SPA + API reverse proxy).
- Actions syncs this directory to `/opt/tfhers/deploy/nginx/` on every deploy.
- When the workflow detects nginx/workflow changes (`DO_NGINX=true`), it copies
  `tfhers.conf` → `/etc/nginx/conf.d/tfhers.conf`, runs `nginx -t`, then reloads.
- If the machine already has a TLS `server` for the same host, merge the `location`
  blocks into that server and disable duplicate `listen`/`default_server` here.
- Repo Spring legacy static under `tfhers-web-app` / `tfhers-web-management` is **not** deleted;
  live `root` is `/opt/tfhers/frontend/www` (Vue `dist`).

## Auto-install marker

By default Actions only **stages** configs under /opt/tfhers/deploy/nginx/.
To have Actions also copy 	fhers.conf into /etc/nginx/conf.d/ and reload, create an empty marker:

`ash
touch deploy/nginx/.auto_install   # commit it, or create the same path on the server after first sync
`

Prefer merging location blocks into an existing TLS server when one already exists.
