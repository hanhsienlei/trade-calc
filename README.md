# TradeCalc

Mobile-friendly trading position calculator — React + Vite PWA, deployed on GitHub Pages.

## Features

- Long / Short toggle
- Account balance + Risk % selector (0.5 / 1 / 1.5 / 2%)
- Entry, Stop Loss, Actual Position inputs
- Maker / Taker fee rates
- Up to 4 price targets, each with partial exit size (% or $)
- Per-target result table: R:R, Risk $, Risk %, Entry Fee, Exit Fees, Break Even, Potential Profit, Expected Profit, Profit %, Position Size, Shares
- Actual vs Calculated columns

## Local Dev

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

### Option A — GitHub Actions (recommended, auto-deploy on push)

1. Push this repo to `github.com/hanhsienlei/trade-calc`
2. Go to **Settings → Pages → Source → GitHub Actions**
3. Push to `main` — CI will build and deploy automatically

### Option B — Manual

```bash
npm run deploy
```

Then go to **Settings → Pages → Source → `gh-pages` branch**.

Live URL: `https://hanhsienlei.github.io/trade-calc/`

## PWA Install

On mobile Chrome/Safari, open the URL and tap **"Add to Home Screen"** for an app-like experience with offline support.
