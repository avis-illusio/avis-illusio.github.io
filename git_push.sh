timestamp=$(date "+%Y/%-m/%-d %H:%M:%S")
pnpm astro build
git remote add origin "git@github.com:avis-illusio/avis-illusio.github.io.git"
git add .
git commit -m "$timestamp"
git branch -M main
git push -u origin main --force