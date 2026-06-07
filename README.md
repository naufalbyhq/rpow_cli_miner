# rpow_cli_miner

Native C/OpenCL RPOW miner with CPU and GPU backends, up to 700x faster than the website and 35x faster than CPU mining.

## Features

- Browserless CLI flow for RPOW backend/API
- Native CPU miner in C
- Native GPU miner in C with OpenCL
- Node fallback miner
- Session persistence with local state files
- Retry handling for transient API/network failures
- Portable Windows bundle with no `npm install`

## Included engines

- `--engine node`
- `--engine native`
- `--engine gpu`

## Quick start

```powershell
node rpow-cli.js login --email you@example.com --state .rpow-a.json
node rpow-cli.js complete-login --link "https://..." --state .rpow-a.json
node rpow-cli.js mine --count 1000 --engine gpu --state .rpow-a.json
```

## Use an existing cookie from `../cookies.txt`

If `../cookies.txt` already has raw RPOW2 cookie lines, skip login and create a CLI state file from one cookie line:

```powershell
node import-cookie-state.js --index 1 --out .rpow-cookie-1.json
node rpow-cli.js me --state .rpow-cookie-1.json
node rpow-cli.js mine --count 1 --engine node --state .rpow-cookie-1.json
```

`--index` is 1-based, so `--index 2` uses the second cookie line. The generated state file stores cookies in the `state.cookies` object that `rpow-cli.js` already sends on `/me`, `/challenge`, and `/mint` requests.

For faster mining, build or copy one of the native binaries first, then switch the engine:

```powershell
.\build-native.ps1
node rpow-cli.js mine --count 1 --engine native --state .rpow-cookie-1.json
```

or:

```powershell
.\build-gpu.ps1
node rpow-cli.js mine --count 1 --engine gpu --state .rpow-cookie-1.json
```

## Mine many cookies with matching proxies

Use `mine-cookies.js` when `../cookies.txt` and `../proxies.txt.webshare` should be mined together. Cookie line 1 uses proxy line 1, cookie line 2 uses proxy line 2, and so on.

```powershell
node mine-cookies.js --cookies ../cookies.txt --proxies ../proxies.txt.webshare --start 1 --limit 10 --count 1 --engine gpu
```

Options:

- `--start 1` starts from cookie line 1.
- `--limit 10` mines 10 cookie accounts, then stops. Omit it to mine every cookie in the file.
- `--count 1` means each cookie/account mints 1 token before moving to the next cookie.
- `--engine gpu|native|node` chooses the miner backend.

For a single cookie with a single proxy, pass `--proxy` directly:

```powershell
node rpow-cli.js mine --count 1 --engine gpu --state .rpow-cookie-1.json --proxy http://user:pass@host:port
```

## Windows GPU setup

1. Install Node.js 18+ and confirm it works:

```powershell
node -v
```

2. Make sure your GPU driver is installed with OpenCL support.

- NVIDIA: standard GeForce or Studio driver is usually enough.
- AMD: install the normal Adrenalin driver.

3. Build the GPU miner:

```powershell
.\build-gpu.ps1
```

4. Request a magic link:

```powershell
node rpow-cli.js login --email you@example.com --state .rpow-a.json
```

5. Complete login with the link from your email:

```powershell
node rpow-cli.js complete-login --link "https://..." --state .rpow-a.json
```

6. Start GPU mining:

```powershell
node rpow-cli.js mine --count 1000 --engine gpu --state .rpow-a.json
```

7. Optional tuning example for stronger GPUs:

```powershell
node rpow-cli.js mine --count 1000 --engine gpu --state .rpow-a.json --workers 16 --gpu-batch 2097152 --gpu-local-size 256
```

If the GPU binary does not start, test it directly:

```powershell
.\rpow-gpu-miner.exe --prefix 00 --difficulty 1 --batch-size 1024 --local-size 64
```

If GPU mining is unavailable, use CPU fallback:

```powershell
node rpow-cli.js mine --count 1000 --engine native --workers 8 --state .rpow-a.json
```

## GPU example

```powershell
node rpow-cli.js mine --count 1000 --engine gpu --state .rpow-a.json --workers 16 --gpu-batch 2097152 --gpu-local-size 256
```

## CPU example

```powershell
node rpow-cli.js mine --count 1000 --engine native --workers 12 --state .rpow-a.json
```

## Files

- `rpow-cli.js` - CLI orchestrator
- `rpow-native-miner.c` / `rpow-native-miner.exe` - native CPU miner
- `rpow-gpu-miner.c` / `rpow-gpu-miner.exe` - native GPU miner
- `rpow-miner-worker.js` - Node fallback worker
- `index.js` - frontend bundle used for API discovery

See `rpow-cli.README.md`, `INSTALL-OTHER-PC.md`, and `INSTALL-GPU-OTHER-PC.md` for more usage details.
