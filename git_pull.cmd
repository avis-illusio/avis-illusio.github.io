$timestamp = Get-Date -Format "yyyy/M/d HH:mm:ss"
pnpm astro build
git remote add origin "git@github.com:avis-illusio/avis-illusio.github.io.git"
git add .
git commit -m "$timestamp"
git branch -M main
git push -u origin main --force