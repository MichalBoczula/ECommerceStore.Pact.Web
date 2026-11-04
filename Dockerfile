FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --global npm@11.5.2 && npm ci
COPY angular.json tsconfig*.json ./
COPY src/ src/
COPY public/ public/
RUN npm run build -- --configuration production

FROM nginx:stable-alpine AS runtime
RUN apk upgrade --no-cache
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/server.conf.template /etc/nginx/pact-server.conf.template
COPY scripts/start-nginx.sh /opt/pact-web/start-nginx.sh
COPY --from=build /app/dist/ecommerce-store-pact-web/browser /usr/share/nginx/html
COPY --from=build /app/dist/ecommerce-store-pact-web/3rdpartylicenses.txt /usr/share/nginx/html/3rdpartylicenses.txt
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/health/ready || exit 1
ENTRYPOINT ["sh", "/opt/pact-web/start-nginx.sh"]
