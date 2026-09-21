# Chat Realtime

Proyecto base de un chat web en tiempo real construido con Node.js, Express y WebSocket.

## Requisitos

- Node.js 18 o superior
- npm

## Instalacion

```bash
npm install
```

Copia `.env.example` como `.env` si necesitas cambiar el puerto.

## Ejecucion

Modo desarrollo con reinicio automatico:

```bash
npm run dev
```

Modo normal:

```bash
npm start
```

Abre `http://localhost:3000` en dos pestañas o dispositivos para probar la comunicacion.

Los usuarios y mensajes se guardan en SQLite dentro de `server/data/chat.sqlite`. Al entrar, cada usuario recibe todo el historial disponible.

## Estructura

```text
CHAT/
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── server/
│   └── src/
│       └── server.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

El servidor incluye un endpoint de comprobacion en `GET /health`.
