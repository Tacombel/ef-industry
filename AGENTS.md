# AGENTS.md — Project notes for OpenCode

## Dev server

```bash
# Start in background (survives shell timeout)
npx next dev > /tmp/nextdev.log 2>&1 &

# Check if responding
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/

# View logs
tail -f /tmp/nextdev.log
```
