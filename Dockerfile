# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Origin of the API, e.g. https://s.furiavento.cloud. Baked into the browser bundle.
ARG API_BASE_URL
RUN test -n "$API_BASE_URL" || (echo "Missing build arg API_BASE_URL" && exit 1)
RUN npx ng build --define "NG_API_BASE_URL='\"${API_BASE_URL}\"'"

FROM node:24-alpine AS runtime
# tini forwards SIGTERM so the container stops right away on redeploys.
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
# The server bundle is self-contained: no node_modules needed at runtime.
COPY --from=build /app/dist/url-shortener-frontend ./dist/url-shortener-frontend
USER node
EXPOSE 4000
# Static files are served before Angular's host validation, so this works whatever NG_ALLOWED_HOSTS is.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/favicon.ico" > /dev/null || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/url-shortener-frontend/server/server.mjs"]
