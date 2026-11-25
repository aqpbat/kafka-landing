# 1) Build the static site
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Lead API URL baked into the client bundle (empty -> default from src/lib/lead.ts).
ARG PUBLIC_LEAD_API=""
ENV PUBLIC_LEAD_API=$PUBLIC_LEAD_API
RUN npm run build

# 2) Serve it with nginx
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
