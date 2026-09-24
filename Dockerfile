# --- Etapa de dependencias ---
# Usamos una imagen basada en Debian (glibc) en vez de Alpine: better-sqlite3
# publica binarios prebuilt para glibc, así se evita compilar el módulo nativo.
FROM node:22-slim AS deps
WORKDIR /app

# Herramientas de compilación por si no hay binario prebuilt para esta plataforma
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- Etapa final: imagen liviana con solo lo necesario para correr ---
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY public ./public
COPY server ./server

# Directorio donde better-sqlite3 persiste la base de datos
RUN mkdir -p /app/server/data

EXPOSE 5000

CMD ["node", "server/src/server.js"]
