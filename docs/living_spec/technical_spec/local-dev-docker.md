# Local dev and Docker

## Local port

Use `20261` for Devlens local app unless task explicitly chooses another `2026x` port.

## Development

```bash
npm install
npm run dev
```

Expected app URL after port migration:

```text
http://localhost:20261
```

## Docker

Docker Compose should run one Next.js app service with mounted SQLite data volume.

## 9router change

Existing `20128` references must migrate to `20261` to avoid current 9router port range.
