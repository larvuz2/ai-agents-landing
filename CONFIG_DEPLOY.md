# config.agentespro.app — Hermes Dashboard deployment

The Hermes Dashboard for agentesPRO runs on the Larvuz VPS, not inside Netlify.

Reason: Hermes Dashboard/TUI uses WebSockets for the embedded terminal/chat. Netlify proxy redirects do not reliably support WebSocket proxying, so the secure and functional setup is:

```txt
config.agentespro.app DNS → Larvuz VPS → Caddy HTTPS → Hermes Dashboard localhost:9119
```

## VPS state

- Hermes Dashboard service: `hermes-dashboard.service`
- Local dashboard: `127.0.0.1:9119`
- Caddy reverse proxy: `config.agentespro.app -> 127.0.0.1:9119`
- Temporary Basic Auth user: `gus`
- Temporary password is stored on the VPS at:
  `/root/.hermes/secure/config-agentespro-basic-auth.txt`

## DNS record required

Add this DNS record for the domain:

```txt
Type: A
Host: config
Value: 187.77.198.159
TTL: Auto
```

Once DNS resolves, Caddy will automatically issue the SSL certificate and the dashboard will be available at:

```txt
https://config.agentespro.app
```

## Netlify note

Netlify should continue deploying the main marketing site from this repo.
The `/config` path redirects to the config subdomain, but the subdomain itself should point directly to the VPS for WebSocket support.
