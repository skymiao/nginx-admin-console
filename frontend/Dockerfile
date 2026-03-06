FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# 配置npm
RUN npm config set fetch-timeout 600000 \
 && npm config set fetch-retries 10 \
 && npm config set fetch-retry-mintimeout 30000 \
 && npm config set fetch-retry-maxtimeout 180000 \
 && npm config set registry https://registry.npmmirror.com \
 && npm config set strict-ssl false

# 安装依赖
RUN npm install \
 && npm cache clean --force

COPY . .

ARG REACT_APP_API_URL=http://backend:5000
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

FROM nginx:alpine

WORKDIR /usr/share/nginx/html

RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    apk del tzdata

COPY --from=builder /app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
