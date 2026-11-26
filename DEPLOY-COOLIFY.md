# Desplegar en Coolify (app.vibes.rappi.com)

La app es una SPA estática: `Dockerfile` compila con Vite y sirve `dist/` con nginx en el **puerto 8000**. No usa backend, base de datos ni variables de entorno.

## Qué ya está listo en el repo

| Archivo | Para qué |
|---|---|
| `Dockerfile` | Build de Vite → nginx:alpine, puerto 8000, `HEALTHCHECK` con `wget` |
| `nginx.conf` | `/health` → 200; sirve la app con y sin el prefijo `/email-builder` |
| `.dockerignore` | Deja fuera `node_modules`, `dist`, `.git` y logs |
| `vite.config.ts` | `base: './'` → todas las rutas del build son relativas |
| `index.html` | Redirige `/email-builder` → `/email-builder/` (sin la barra, `./assets/` caería en la raíz, que es de otra app) |

Esto convive con el VPS de Hetzner: aquel usa su propio `Dockerfile` en `/root/email-builder-test/`, y el `base: './'` funciona igual en la raíz.

## Pasos en Coolify (con la VPN conectada)

1. **https://coolify.vibes.rappi.com** › Projects › tu proyecto › **+ Add resource** › **Private repository (with GitHub App)**.
   - Repo: `Email-Builder`, rama `master`.
   - Si no aparece, el admin de Coolify tiene que dar acceso a su GitHub App (o transferir el repo a la organización del equipo).
2. **General:**
   - Build pack: **Dockerfile**
   - Ports Exposes: **8000**
   - Domains: **`http://app.vibes.rappi.com/email-builder`** (con `http`, sin puerto, sin `www`, un solo dominio)
   - Redirect HTTP → HTTPS: **desactivado**
3. **Environment Variables:** ninguna.
4. **Persistent Storage:** ninguno. Los documentos viven en el `localStorage` del navegador.
5. **Healthcheck:** activado, ruta `/health`, puerto `8000`.
6. **Auto Deploy:** activado. Cada push a `master` publica.
7. **Deploy** y abrir `https://app.vibes.rappi.com/email-builder/`.

## Antes de mudar a los usuarios

El `localStorage` va atado al dominio: en la URL nueva el editor arranca **vacío**. Cada persona debe exportar el JSON de lo que tenga abierto en `178.104.225.166:8092` e importarlo en la nueva.

La clave es `email-builder:document`, con nombre propio, así que no choca con otras apps del mismo dominio.

## Si algo falla

- **Página en blanco / sin estilos:** abre F12 › Network y mira si `assets/index-*.js` sale de `/email-builder/assets/` o de `/assets/`. Si sale de `/assets/`, falta la barra final en la URL.
- **Abre otra app o su login:** el dominio está mal escrito en Coolify. Corrígelo, Save y Redeploy.
- **Deploy falla en healthcheck:** revisa que Ports Exposes sea 8000 y la ruta `/health`.
