# ---------- builder ----------
FROM node:18-alpine AS builder

WORKDIR /app

# apk 国内源
RUN sed -i 's|https://dl-cdn.alpinelinux.org|https://mirrors.aliyun.com|g' /etc/apk/repositories \
 && apk update \
 && apk add --no-cache python3 make g++ sqlite-dev

COPY package*.json ./

ENV BETTER_SQLITE3_BUILD_FROM_SOURCE=0
ENV npm_config_build_from_source=false

RUN npm config set fetch-timeout 600000 \
 && npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 30000 \
 && npm config set fetch-retry-maxtimeout 180000 \
 && npm install --registry=https://registry.npmmirror.com \
 && npm prune --production \
 && npm cache clean --force

COPY src ./src

# ---------- runtime ----------
FROM node:18-alpine

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache nginx curl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package*.json ./

EXPOSE 5000
CMD ["node", "src/index.js"]
