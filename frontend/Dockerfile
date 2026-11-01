# ── Stage 1: build the React app ──────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline

COPY . .

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build identity (docker-compose.yml passes the commit being deployed).
# Only a hex commit id and a timestamp are accepted; anything else becomes
# "unknown". Published as <meta name="khalsni-build"> in index.html and as
# /version.json, and available to the app as import.meta.env.VITE_BUILD_SHA.
ARG VITE_BUILD_SHA=unknown
ARG BUILD_TIME=unknown
ENV VITE_BUILD_SHA=${VITE_BUILD_SHA}

RUN npm run build \
 && sha="$(printf '%s' "${VITE_BUILD_SHA}" | tr 'A-F' 'a-f' | grep -Ex '[0-9a-f]{7,40}' | cut -c1-12 || true)" \
 && sha="${sha:-unknown}" \
 && built="$(printf '%s' "${BUILD_TIME}" | grep -Ex '[0-9T:.Z+-]{10,35}' || true)" \
 && built="${built:-unknown}" \
 && sed -i "s#</head>#  <meta name=\"khalsni-build\" content=\"${sha}\" />\n  </head>#" dist/index.html \
 && grep -q "name=\"khalsni-build\" content=\"${sha}\"" dist/index.html \
 && printf '{"sha": "%s", "built_at": "%s"}\n' "${sha}" "${built}" > dist/version.json

# ── Stage 2: serve with nginx ──────────────────────────────────────────────────
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
