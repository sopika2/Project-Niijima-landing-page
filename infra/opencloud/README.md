# OpenCloud: personal cloud

[OpenCloud](https://opencloud.eu) (Heinlein's fork of ownCloud Infinite Scale) at **https://cloud.niijimasisters.com**.
It gives you Google Drive-style sync with a web UI, desktop apps for Windows, macOS and Linux, and phone apps for Android and iOS.
It runs as one container behind Traefik, with TLS done by Cloudflare.

| File | What it is |
| --- | --- |
| `compose.yml` | One OpenCloud container with Traefik labels, based on the official [opencloud-compose](https://github.com/opencloud-eu/opencloud-compose) |
| `.env.example` | Settings. Copy to `.env` |

**RAM:** expect about 400–700 MB in normal use, with spikes while it makes thumbnails or handles big uploads. The compose file caps it at 1.5 GB.
These numbers are estimates, so check them with `docker stats` after a week.
**Disk:** about 500 MB for the image on the boot disk. Your files go on a **separate disk** (below).

## Version

Checked on 2026-10-21: OpenCloud ships a **rolling** image (`opencloudeu/opencloud-rolling`, a new release every 3 weeks, currently 8.x)
and a **production** image (`opencloudeu/opencloud`, a new release about every 6 months). This guide uses the production line, tag **`7`** (7.2.4 at the time of writing).
A new production release is planned for November 2026. When it's out, read its release notes, back up, then set `OC_MAJOR` to the new number.

## 1. Storage: add a persistent disk

The boot disk has about 32 GB free, which is shared with Docker images, logs and the other services. That's too small for a cloud,
and if it fills up, *every* service breaks. Add a separate disk just for OpenCloud's files instead.

**Cost:** a standard persistent disk (`pd-standard`) costs roughly **US$0.04–0.05 per GB per month** in EU regions, so **200 GB is about US$8–10/month**.
Prices change, so check the [Google Cloud pricing calculator](https://cloud.google.com/products/calculator) for your region. A `pd-balanced` disk is faster but costs about twice as much.
Standard disks are slower, but plenty fast for one person's file sync.

### a) Create and attach the disk

Run this in Cloud Shell or anywhere `gcloud` is logged in. First find your VM's name and zone:

```bash
gcloud compute instances list
```

Then (replace `VM_NAME` and `ZONE`, for example `europe-west1-b`):

```bash
gcloud compute disks create cloud-data \
  --size=200GB --type=pd-standard --zone=ZONE

gcloud compute instances attach-disk VM_NAME \
  --disk=cloud-data --device-name=cloud-data --zone=ZONE
```

Some newer machine series (for example N4 and C4) can't use `pd-standard`. If `attach-disk` complains, check your machine type with
`gcloud compute instances describe VM_NAME --zone=ZONE --format='value(machineType)'`. On E2 and N2 VMs it works.
You can make the disk bigger later (`gcloud compute disks resize`), but you can never make it smaller, so starting at 200 GB is fine.

### b) Format and mount it (on the VM)

```bash
# The disk shows up under a stable name based on --device-name:
ls -l /dev/disk/by-id/google-cloud-data

# Format it. This ERASES the disk, so only run it once, on the new disk.
sudo mkfs.ext4 -m 0 -E lazy_itable_init=0,lazy_journal_init=0,discard /dev/disk/by-id/google-cloud-data

sudo mkdir -p /mnt/cloud
sudo blkid /dev/disk/by-id/google-cloud-data     # copy the UUID="..." value
```

Add it to `/etc/fstab` so it mounts on every boot. `nofail` means the VM still boots if the disk is missing:

```bash
echo 'UUID=PASTE-UUID-HERE  /mnt/cloud  ext4  discard,defaults,nofail  0  2' | sudo tee -a /etc/fstab
sudo systemctl daemon-reload
sudo mount -a          # no output = good
df -h /mnt/cloud       # should show about 196G
```

Make the data folder and give it to your user (OpenCloud runs as UID 1000, see `PUID` in `.env`):

```bash
sudo mkdir -p /mnt/cloud/opencloud-data
sudo chown -R 1000:1000 /mnt/cloud/opencloud-data
```

> Because of `nofail`, if the disk ever fails to mount, `/mnt/cloud` will be an empty folder on the boot disk. Before starting
> OpenCloud after a reboot problem, check with `df -h /mnt/cloud` that the disk is really there.

### Why not put the files on the rclone Google Drive mount?

- OpenCloud's storage driver (`posix`, the default) keeps metadata in **extended attributes** and expects a normal local filesystem
  with fast, reliable renames and locks. An rclone FUSE mount doesn't support extended attributes and only roughly imitates the rest.
- Every file operation becomes a Google Drive API call, so you get slow syncing, API rate limits, and partial writes if the network drops.
  These are the conditions that corrupt a sync server's data.
- You'd be syncing a cloud through another cloud. Use Drive for **backups** (below), not as the live disk.

## 2. Install

```bash
mkdir -p ~/opencloud && cd ~/opencloud
# copy compose.yml and .env.example from this folder into ~/opencloud, then:
cp .env.example .env
openssl rand -base64 18         # use this as the admin password
nano .env                       # paste it into INITIAL_ADMIN_PASSWORD, check PUID/PGID
mkdir -p config                 # create it yourself so your user owns it
docker compose up -d
docker compose logs -f          # wait about a minute; Ctrl+C when the log calms down
```

On the first start, `opencloud init` writes `config/opencloud.yaml` with random secrets and the admin password.
**Back up `config/` somewhere safe** (a password manager or an encrypted note). Without it, the data on the disk can't be used.
`INITIAL_ADMIN_PASSWORD` is only read on that first start. After that, change the password in the web UI.

`cloud.niijimasisters.com` is already covered by the `*.niijimasisters.com` tunnel route.

### Running behind Cloudflare + Traefik

These are the settings in `compose.yml` that make it work behind the proxy:

| Setting | Why |
| --- | --- |
| `OC_URL=https://cloud.niijimasisters.com` | The public address. Login redirects and share links are built from it. It must be `https://` even though Traefik talks plain HTTP. |
| `PROXY_TLS=false` | OpenCloud serves plain HTTP on port 9200. TLS happens at Cloudflare. |
| `PROXY_HTTP_ADDR=0.0.0.0:9200` | Listen on the Docker network, not only on localhost inside the container. |
| `OC_INSECURE=false` | Keep certificate checks on. OpenCloud's services reach its built-in login service through `OC_URL`, which has a valid Cloudflare certificate. |

**Trusted proxies:** OpenCloud has no "trusted proxies" setting. I checked the proxy service's configuration in the
source code, and it relies on `OC_URL`. Logs will show Traefik's or cloudflared's IP instead of yours. If you want real visitor IPs,
that's a Traefik setting (`entryPoints.web.forwardedHeaders.trustedIPs`), and it's optional.

**Big files:** Cloudflare's free plan limits a single request to 100 MB. OpenCloud's clients upload in 10 MB chunks by default
(`FRONTEND_UPLOAD_MAX_CHUNK_SIZE`), so large files still work. Don't raise that setting above about 90 MB.

## 3. First login

1. Open https://cloud.niijimasisters.com and sign in as **`admin`** with the password from `.env`.
2. Change the password: click the user menu (top right) **→ Preferences**.
3. Create your everyday account: go to the app switcher (top left) **→ Admin Settings → Users → New user**. To manage the server from that account too, give it the **Admin** role.
   Use that account for your files and keep `admin` for emergencies.

## 4. Desktop and phone apps

The download links are on [opencloud.eu/en/product/download-apps](https://opencloud.eu/en/product/download-apps).

- **Windows:** install **OpenCloud Desktop** from the Microsoft Store. **Linux:** use the AppImage from the same page. **macOS:** use the App Store.
- **Android:** install from Google Play. It can upload your camera photos automatically. **iOS:** install from the App Store.

For each app, enter the server `https://cloud.niijimasisters.com`. A browser window opens to sign you in, and then you choose what to sync.
On the desktop, start with one folder (for example `Documents`), then add more once it works.

## 5. Backups

You need to back up two things: **`~/opencloud/config/`** (small but essential) and **`/mnt/cloud/opencloud-data/`** (your files).

**a) Disk snapshots (main backup, set once).** Google takes daily incremental snapshots of the data disk. You pay only for changed data,
at roughly a few cents per GB per month (check the calculator).

```bash
gcloud compute resource-policies create snapshot-schedule cloud-data-daily \
  --region=REGION --daily-schedule --start-time=03:00 \
  --max-retention-days=14 --on-source-disk-delete=keep-auto-snapshots

gcloud compute disks add-resource-policies cloud-data \
  --resource-policies=cloud-data-daily --zone=ZONE
```

`REGION` is your zone without the last letter (zone `europe-west1-b` is region `europe-west1`). Snapshots are taken while
OpenCloud runs ("crash-consistent"). That's fine for files, but if you restore one, run a desktop client sync afterwards to check it.
To restore: create a new disk from a snapshot (`gcloud compute disks create cloud-data-restored --source-snapshot=...`), then attach and mount it in place of the old one.

**b) Config to Google Drive (nightly, small).** Add this with `crontab -e`, replacing the Drive path with a folder on your rclone mount:

```cron
50 3 * * * tar czf /mnt/<your-drive-mount>/backups/opencloud/config-$(date +\%a).tar.gz -C /home/kilra_locka/opencloud config
```

This keeps 7 rolling copies (one per weekday). They contain secrets, so keep that Drive folder private.

**c) Optional off-Google copy of the files.** Snapshots live in the same Google account as the VM. If you also want a copy elsewhere,
`rclone sync /mnt/cloud/opencloud-data <remote>:opencloud-data` to another provider once a week. Use the rclone **remote** directly,
not a FUSE mount. Only do this if your Drive or other storage has room for all your files.

## 6. Office editing (optional)

OpenCloud can edit Word, Excel and PowerPoint files in the browser through **Collabora Online** (or the OnlyOffice-based Euro Office).
These need **2 GB or more of extra RAM**, which this VM doesn't have spare right now (see `infra/README.md`). Leave this out for now.
If you add it later, the official [opencloud-compose](https://github.com/opencloud-eu/opencloud-compose) repo has `weboffice/collabora.yml` and
`external-proxy/collabora.yml` to start from. You'd also need a `collabora.niijimasisters.com` route.

## Troubleshooting

- **Login loops back to the login page, or "Missing or invalid config".** `OC_URL` must exactly match the address in the browser
  (https, no trailing slash, no port). Fix `.env`, then run `docker compose up -d`.
- **Logs show `x509: certificate` errors on login.** OpenCloud can't verify the certificate when it calls itself through Cloudflare.
  Set `OC_INSECURE=true` in `.env` and run `docker compose up -d`. Traffic stays inside your server and Cloudflare, but prefer `false` if it works.
- **Browser works but the desktop or phone app fails.** In the Cloudflare dashboard, open **Security → Events** and check whether
  Cloudflare is challenging the app (Bot Fight Mode or Browser Integrity Check). If so, add a rule that skips those checks for `cloud.niijimasisters.com`.
- **Permission denied in the logs.** Run `sudo chown -R 1000:1000 ~/opencloud/config /mnt/cloud/opencloud-data`.

## Updating

```bash
cd ~/opencloud && docker compose pull && docker compose up -d
```

This picks up the latest 7.x patch. Before changing `OC_MAJOR`, read the release notes on [docs.opencloud.eu](https://docs.opencloud.eu) and take a manual snapshot first:
`gcloud compute disks snapshot cloud-data --zone=ZONE --snapshot-names=before-upgrade`.
