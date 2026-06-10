# --- build: Astro 6 static site (pnpm, Node 22) ---
FROM node:22-alpine AS build
WORKDIR /app
# pnpm pinned via package.json "packageManager" → reproducible, correct dep versions
# (a fresh npm resolve pulls an incompatible @tailwindcss/vite + breaks the build).
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# --ignore-scripts: skip postinstall (avoids pnpm 11's interactive build-approval
# gate in non-TTY/CI); esbuild/sharp binaries come from platform optionalDependencies.
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
# Do NOT ship the private business strategy on a public/test deploy.
RUN rm -rf src/pages/internal
RUN pnpm run build

# --- serve: nginx, static dist/ ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
