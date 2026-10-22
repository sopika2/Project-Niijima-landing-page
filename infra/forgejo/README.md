# Forgejo: personal git server

Forgejo at **https://git.niijimasisters.com**, using SQLite (no database container), one data folder,
behind your Traefik + Cloudflare Tunnel like the other services.

Files here:

| File | What it is |
| --- | --- |
| `compose.yml` | The Forgejo container with Traefik labels |
| `.env.example` | Settings. Copy to `.env` |
| `backup.sh` | `forgejo dump` to the Google Drive mount, run by cron |

**RAM:** about 150–250 MB idle, more for a moment while mirroring or showing big diffs. The compose file caps it at 768 MB.
**Disk:** about 200 MB for the image, plus your repos.

## Version

Checked on 2026-10-21:

- **15** is the LTS line (supported until about July 2027). **The compose file uses this one.**
- **17.0.0** came out on 2026-10-15, but its release notes say *"We currently advise against upgrading to Forgejo 17.0.0"* because of a bug that can block pushes and merges.
- **16** stops getting updates at the end of October 2026.

Stay on 15 for now. To move to 17 later, wait for a 17.0.x release without that warning (see
[the releases page](https://codeberg.org/forgejo/forgejo/releases)), run a backup, set `FORGEJO_MAJOR=17` in `.env`, then
`docker compose pull && docker compose up -d`. You can't go back to an older major on the same data, so the backup matters.

## 1. Install

On the VM:

```bash
mkdir -p ~/forgejo && cd ~/forgejo
# copy compose.yml, .env.example and backup.sh from this folder into ~/forgejo, then:
cp .env.example .env
nano .env                       # check PUID/PGID (run `id -u` and `id -g`), the rest can stay
mkdir -p data backups           # create them yourself so your user owns them, not root
docker compose up -d
docker compose logs -f          # Ctrl+C once you see "Starting new Web server"
```

`git.niijimasisters.com` is already covered by the `*.niijimasisters.com` tunnel route, so there's no DNS work.

## 2. Create the admin account (do this right away)

Open https://git.niijimasisters.com. You'll see the **Initial configuration** page.

1. The database (SQLite3), domain and base URL are already filled in from `compose.yml`. Leave them as they are.
2. Scroll down to **Administrator account settings**, open it, and choose a username, email and a strong password.
3. Click **Install Forgejo**.

Registration is off (`DISABLE_REGISTRATION=true`), so this admin account is the only way in. If you want more
users later, create them under **Site administration → User accounts → Create user account**.

> Until you click Install, anyone who finds the URL could fill in this page. That's why this step comes right after `up -d`.

Then turn on two-factor login: **Settings → Security → Two-factor authentication**.

## 3. Using git over HTTPS (the default)

The Cloudflare Tunnel only carries HTTP(S), so `git clone git@git.niijimasisters.com:...` won't work.
Use HTTPS with an **access token** in place of your password:

1. In Forgejo, go to **Settings → Applications → Generate new token**. Give it a name (`pc`) and set **repository: Read and write**
   (also **user: Read** if a tool asks for it). Copy the token, because it's only shown once.
2. On your PC:

   ```bash
   git clone https://git.niijimasisters.com/<you>/<repo>.git
   ```

   When asked, the username is your Forgejo username and the password is **the token**.
   Git for Windows comes with Git Credential Manager, which remembers it. On Linux, run
   `git config --global credential.helper store` (this saves it in plain text in `~/.git-credentials`) or use `libsecret`.

To add Forgejo as a second remote to a repo you already have:

```bash
git remote add forgejo https://git.niijimasisters.com/<you>/<repo>.git
git push forgejo main
```

**Cloudflare limit:** on the free plan, one HTTP request can be at most 100 MB. A single push that's bigger
(for example the first push of a repo full of images) fails with an HTTP 413 error. Push in smaller parts,
use Git LFS, or use SSH (below).

## 4. Git over SSH (optional)

Install this only if you prefer SSH keys. It goes through `cloudflared access ssh` on your PC.

**a) On the VM, route a hostname to Forgejo's SSH port.** Forgejo's container already runs an SSH server on port 22.

*If your tunnel is managed in the Cloudflare dashboard:* go to **Zero Trust → Networks → Tunnels → (your tunnel) → Public Hostname → Add**,
set subdomain `ssh-git`, domain `niijimasisters.com`, service type **SSH**, URL `forgejo:22`. Move it **above** the `*` wildcard rule.

*If your tunnel uses a `config.yml`:* add this rule above the wildcard, then restart cloudflared:

```yaml
ingress:
  - hostname: ssh-git.niijimasisters.com
    service: ssh://forgejo:22
  - hostname: "*.niijimasisters.com"
    service: http://traefik:80        # your existing rule, unchanged
  - service: http_status:404
```

`forgejo:22` only works if the cloudflared container is on the `zipline_default` network. If cloudflared runs directly on the host
(not in Docker), add `ports: ["127.0.0.1:2222:22"]` to the Forgejo service and use `ssh://localhost:2222`.

Recommended: protect the hostname with **Zero Trust → Access → Applications → Add → Self-hosted**, set to `ssh-git.niijimasisters.com`, with a policy
that allows only your email. After that, the first connection opens a browser login.

**b) On your PC**, install cloudflared:

- Windows: `winget install --id Cloudflare.cloudflared`
- Linux: follow the instructions on [Cloudflare's downloads page](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).

Create a key if you don't have one (`ssh-keygen -t ed25519`), then paste the **public** key (`~/.ssh/id_ed25519.pub`)
into Forgejo under **Settings → SSH / GPG keys → Add key**.

Add this to `~/.ssh/config` (on Windows that's `C:\Users\<you>\.ssh\config`):

```sshconfig
Host ssh-git.niijimasisters.com
  User git
  IdentityFile ~/.ssh/id_ed25519
  ProxyCommand cloudflared access ssh --hostname %h
```

On Windows, if `cloudflared` isn't found, run `where.exe cloudflared` and put that full path in quotes on the
`ProxyCommand` line, for example `ProxyCommand "C:\Program Files (x86)\cloudflared\cloudflared.exe" access ssh --hostname %h`.

Test it, then clone:

```bash
ssh -T ssh-git.niijimasisters.com        # should greet you by your Forgejo username
git clone ssh-git.niijimasisters.com:<you>/<repo>.git
```

If you don't use SSH at all, set `FORGEJO_DISABLE_SSH=true` in `.env` and run `docker compose up -d`.

## 5. Mirror your GitHub repos (pull mirrors)

A pull mirror is a read-only copy in Forgejo that re-fetches from GitHub on a timer (8 h by default).

1. **GitHub token** (only needed for private repos): on GitHub, go to **Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**. Choose the repos (or "All repositories"). Under **Repository permissions**, set
   **Contents: Read-only** ("Metadata: Read-only" gets added on its own). Choose an expiry date and put a reminder in your calendar.
2. In Forgejo, click **+** (top right) **→ New migration → GitHub**.
3. **Migrate / Clone from URL:** `https://github.com/sopika2/Project-Niijima-landing-page.git`.
   **Access token:** the token from step 1 (leave it empty for public repos).
4. Tick **This repository will be a mirror**. Choose an owner and repo name, then click **Migrate repository**.
5. Repeat for each repo. To change the timer or click **Synchronize now**, open the repo's **Settings → Mirror settings**.

Notes:

- A mirror only copies git data (branches, tags, and optionally wiki and LFS). Issues and PRs stay on GitHub.
- You can't push to a pull mirror. If you later want Forgejo to be the main copy, turn the mirror into a normal repo
  (**Settings → Danger zone → Convert to regular repository**) and add a **push mirror** back to GitHub in the same Mirror settings.
- When the GitHub token expires, mirroring stops without an obvious error. Update it in Mirror settings.

## 6. Actions runner (optional: skip for now)

Forgejo Actions is CI like GitHub Actions. It needs a separate **runner** container, and every job starts more containers.

- The runner uses about 50 MB idle, but a job (for example `npm ci && npm run build` for this landing page) easily uses **0.5–2 GB of RAM** while it runs.
  On a 7.8 GB VM that already runs a lot, that can push other services into swap.
- The runner needs access to Docker, which is close to root access on the VM.

**"Skip for now" is a fine answer.** If you want it later: set `FORGEJO_ACTIONS=true`, then `docker compose up -d`, and follow
[Forgejo's runner installation guide](https://forgejo.org/docs/latest/admin/actions/runner-installation/).
On 2026-10-21 the runner image was `data.forgejo.org/forgejo/runner:13`. Give the runner a memory limit and set
`capacity: 1` in its config so only one job runs at a time. Running the runner on your PC is also an option, which costs the VM nothing.

## 7. Backups

`backup.sh` runs `forgejo dump`, which puts repos, the SQLite database, config and attachments into one `.tar.gz`. It keeps the 3 newest dumps
in `./backups`, copies each one to a folder on your rclone Google Drive mount, and keeps the newest 14 there.

```bash
cd ~/forgejo
nano .env                       # set BACKUP_DEST to a folder on the Drive mount
mkdir -p /mnt/<your-drive-mount>/backups/forgejo     # once, while the mount is up
./backup.sh                     # test it: should print "OK: ..."
crontab -e
```

Add this line to run it every night at 03:40:

```cron
40 3 * * * /home/kilra_locka/forgejo/backup.sh >> /home/kilra_locka/forgejo/backups/cron.log 2>&1
```

- If the Drive folder is missing (for example because the mount is down), the script stops with an error instead of quietly writing to the boot disk.
- Forgejo's [backup guide](https://forgejo.org/docs/latest/admin/setup/backup/) recommends shutting Forgejo down during a backup,
  because a backup taken during a push can be inconsistent. A nightly dump on a one-person server is fine; just don't push at 03:40.
  If you want a fully consistent copy now and then (before a major upgrade, say), take a cold one:
  `docker compose stop && tar czf ~/forgejo-cold-$(date +%F).tar.gz -C ~/forgejo data && docker compose start`.
- **Restoring:** a dump contains your repos, an SQL dump of the database, `app.ini` and the data folder. Restoring means putting those back
  into `./data` and loading the SQL into a fresh SQLite file, then following the restore steps in the backup guide linked above.
  A cold `tar` copy is easier: stop Forgejo, unpack `data/`, start it. Try a restore on your PC once, so you know it works.

## Updating

```bash
cd ~/forgejo && ./backup.sh && docker compose pull && docker compose up -d
```

This picks up the latest 15.x patch. To change major version, see **Version** above.
