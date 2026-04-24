# Error: npm run dev Fails Due to Missing Next.js Dependencies

## What Was the Error

Running `npm run dev` failed immediately with module resolution errors — Next.js internals could not be found even though the project had been set up from `create-next-app`.

## Why It Happened

The `node_modules` directory was either missing, corrupted, or out of sync with `package.json` / `package-lock.json`. This typically happens when:
- The repo was cloned without running `npm install`
- `node_modules` was deleted manually or by a cleanup script
- A previous `npm install` was interrupted mid-run
- The lock file was updated but `node_modules` was not refreshed

## How We Fixed It

Ran a clean install:
```bash
npm install
```

If that does not resolve it, a full clean install works:
```bash
rm -rf node_modules package-lock.json
npm install
```

After reinstalling, `npm run dev` started successfully.
