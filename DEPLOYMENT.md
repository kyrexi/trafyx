# Trafyx Deployment Guide (DigitalOcean VM)

This repo includes a Docker Compose stack to run the Next.js frontend, Go backend, Nginx reverse proxy, and Certbot on `trafyx.kyrexi.tech`.

## Prerequisites

- Domain `trafyx.kyrexi.tech` A-record points to your VM's public IP.
- Docker and Docker Compose V2 installed on the VM.
- `.env` files placed on the VM:
  - `apps/backend/.env`
  - `apps/frontend/.env`

## First-time setup

1) Clone repo to the VM and place env files.

2) Start the stack (HTTP only initially):

```powershell
# From repo root
docker compose up -d --build
```

3) Issue certificates via Certbot container:

```powershell
# One-off run to request certificates (HTTP-01 challenge)
docker compose run --rm certbot certonly --webroot -w /var/www/certbot `
  --email tripathipranav14@gmail.com --agree-tos -d trafyx.kyrexi.tech

# Enable HTTPS server block (run on the VM host)
Move-Item -Path "apps/backend/nginx/conf.d/ssl.conf.disabled" -Destination "apps/backend/nginx/conf.d/ssl.conf"

# Reload nginx to pick up HTTPS config and new certificates
docker compose restart nginx
```

Nginx is configured to serve HTTP (for ACME) and redirect to HTTPS. After certs are issued and you enable the SSL config (rename step above), HTTPS will work.

If HTTPS doesn't come up, ensure files exist at:
- `/apps/backend/certbot/conf/live/trafyx.kyrexi.tech/fullchain.pem`
- `/apps/backend/certbot/conf/live/trafyx.kyrexi.tech/privkey.pem`

## Renewal automation (optional)

You can use the provided script (Linux cron on the VM):

```bash
cd apps/backend
chmod +x setup-cron.sh renew-ssl.sh
./setup-cron.sh
```

This runs a daily renewal check and restarts Nginx if certs are renewed.

## Notes

- Backend is not exposed publicly; only Nginx listens on 80/443.
- Frontend is served via Next.js standalone server, proxied by Nginx.
- Update `apps/backend/nginx/conf.d/default.conf` only if you need custom redirects.
- The HTTPS server block lives in `apps/backend/nginx/conf.d/ssl.conf.disabled` and is included automatically by Nginx via `include /etc/nginx/conf.d/*.conf;`. The file naming is only a reminder; it's already mounted and active when certs are present.

## Common operations

```powershell
# Rebuild and restart after code changes
docker compose up -d --build

# View logs
docker compose logs -f nginx
docker compose logs -f frontend
docker compose logs -f backend

# Run certbot renew manually
docker compose run --rm certbot renew --dry-run
```
