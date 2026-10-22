# Infra guides

Deployment guides for the self-hosted Niijima services. Each folder is self-contained: copy it to the VM (or follow it on your PC),
`cp .env.example .env`, fill it in, `docker compose up -d`.

| Guide | Where it runs | Address | What it is |
| --- | --- | --- | --- |
| [`forgejo/`](forgejo/README.md) | VM | git.niijimasisters.com | Personal git server, GitHub mirrors, nightly backups to Drive |
| [`opencloud/`](opencloud/README.md) | VM + extra 200 GB disk | cloud.niijimasisters.com | Personal cloud: file sync with desktop and phone apps |
| [`comfyui/`](comfyui/README.md) | Your PC (RTX 4070) | local only | Image generation and LoRA training for fan art |

## How the VM services fit together

```
Internet ─► Cloudflare (TLS) ─► cloudflared tunnel ─► Traefik :80 (entrypoint "web", network "zipline_default") ─► containers
```

Every web service uses the same Traefik labels as Treasure: a plain-HTTP router with `Host(...)`, entrypoint `web`, and
`traefik.docker.network=zipline_default`, on the external `zipline_default` network. Don't publish any `ports:`. Because `*.niijimasisters.com` already
points through the tunnel, a new subdomain only needs the labels. The landing page's catch-all router has priority 1, so a specific `Host` rule always wins over it.

## VM budget (2 vCPU, 7.8 GB RAM, 49 GB disk, about 32 GB free)

These are **estimates** for a quiet, one-person setup. Check yours with `docker stats --no-stream`, `free -h` and `df -h` after a week
and update the table.

| Service | RAM (typical) | Boot disk | Notes |
| --- | --- | --- | --- |
| OS, Docker, sshd | 0.4–0.5 GB | about 6 GB | |
| Traefik + cloudflared | 0.1 GB | < 0.3 GB | |
| rclone Drive mount | 0.1–0.3 GB | VFS cache | Cap the cache with `--vfs-cache-max-size` (for example 2G) |
| Landing page | < 0.05 GB | < 0.1 GB | nginx |
| Zipline (mementos.) | 0.3–0.5 GB | uploads | including its database |
| Wiki (compendium.) | 0.2–0.4 GB | small | depends on the wiki engine |
| Treasure (treasure.) | 0.1–0.2 GB | small | |
| Planned: calendar., archive., home., makoto., sae. | 0.5–1.0 GB together | 1–3 GB | about 100–200 MB each |
| **Forgejo** (git.) | 0.15–0.25 GB (cap 768 MB) | 0.2 GB + repos | SQLite, no extra database container |
| **OpenCloud** (cloud.) | 0.4–0.7 GB (cap 1.5 GB) | 0.5 GB | Files on the **separate 200 GB disk** at `/mnt/cloud` |
| **Total** | **about 2.8–4.0 GB** | | leaves about 3.5 GB plus swap free |

Optional extras. Leave these out for now:

| Extra | RAM | Why to wait |
| --- | --- | --- |
| Forgejo Actions runner | 0.05 GB idle, **0.5–2 GB per job** | Builds would compete with everything else. Run CI on GitHub, or put the runner on your PC |
| Collabora / OnlyOffice for OpenCloud | **2 GB or more** | Would use most of the remaining headroom |

**Disk:** the boot disk holds images, logs and small databases. Keep at least 5 GB free. Useful commands:

```bash
docker system df                 # what Docker is using
docker image prune -f            # remove old image versions after updates
sudo journalctl --vacuum-size=200M
```

To stop container logs from growing forever, set log rotation once in `/etc/docker/daemon.json`
(`{"log-driver":"local","log-opts":{"max-size":"10m","max-file":"3"}}`), then run `sudo systemctl restart docker`. This only applies to containers created after the change.

**CPU:** two vCPUs are plenty for these services when idle. Expect short spikes during OpenCloud thumbnail generation and Forgejo mirror syncs.
Avoid running heavy jobs (CI builds, office suites) on the VM.

## Backups at a glance

| What | How | Where |
| --- | --- | --- |
| Forgejo | `forgejo/backup.sh` (`forgejo dump`) nightly by cron, 14 kept | Google Drive (rclone mount) |
| OpenCloud files | GCE snapshot schedule on the data disk, 14 days | Google Cloud snapshots |
| OpenCloud config | nightly `tar` by cron, 7 kept | Google Drive (rclone mount) |

Test a restore once for each service. A backup you've never restored is only a guess.
