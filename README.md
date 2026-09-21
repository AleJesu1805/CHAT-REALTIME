# Chat Realtime

Proyecto base de un chat web en tiempo real construido con Node.js, Express y Socket.IO.

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
