# Speed Fix — Deploy Steps

## Step 1: Deploy the code changes

```bash
# On your VPS
cd /var/www/cakezake-orders
git pull

# Rebuild frontend with code splitting
cd client && npm run build && cd ..

# Restart server
pm2 restart cakezake-oms
```

## Step 2: Update Nginx config

```bash
sudo cp /var/www/cakezake-orders/nginx.conf /etc/nginx/sites-available/orders.cakezake.com
sudo nginx -t
sudo systemctl reload nginx
```

## Step 3: Move MongoDB Atlas cluster to Singapore (ap-southeast-1)

This is the BIGGEST single fix. If your cluster is in US-East, every query
from Nepal has +300ms latency. Singapore is ~80ms from Nepal.

1. Go to MongoDB Atlas → your cluster → ... → Edit Configuration
2. Change region to: AWS ap-southeast-1 (Singapore) or ap-south-1 (Mumbai)
3. Click Save (free tier migration takes ~10 minutes, no data loss)

## Step 4: Verify gzip is working

```bash
curl -H "Accept-Encoding: gzip" -I https://orders.cakezake.com/api/stats/summary-quick
# Should see: Content-Encoding: gzip
```

## What each fix does

| Fix | Expected improvement |
|-----|---------------------|
| Code splitting (lazy imports) | First load: 800KB → ~150KB JS |
| Recharts in separate chunk | Only loads when Dashboard visited |
| Stats cache (30-60s) | Dashboard: 2-4s → <100ms on repeat opens |
| MongoDB region (Singapore) | Every query: -200 to -300ms |
| Nginx gzip + asset caching | Repeat visits: near-instant |
| Session touchAfter | -1 MongoDB write per request |
| minPoolSize=2 | No cold connection per request |
