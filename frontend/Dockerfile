FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install --registry=https://registry.npmmirror.com && \
    npm cache clean --force

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
