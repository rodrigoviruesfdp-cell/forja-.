# Comunidad (Fase 3) — diseño previsto

Objetivo: un "Strava" para el gimnasio y para cualquier deporte. Compartir sesiones y récords, seguir a amigos, animarlos (kudos) y comentar. **Nada de esto está construido todavía**; este documento fija las decisiones para que lo que se construya antes no haya que rehacerlo.

## Lo que ya está preparado

- **Cada fila tiene dueño** (`user_id`) y **Row Level Security** en todas las tablas. Hoy cada usuario solo ve lo suyo.
- **`sessions.visibility`**: `private` (por defecto), `followers` y `public`. La app aún no deja cambiarla.
- **Identidad pública en `profiles`**:
  - `username` (único; minúsculas, números, `.` y `_`; de 3 a 30 caracteres);
  - `bio` y `avatar_url`;
  - `is_private` (por defecto `true`).

  El nombre de usuario ya se puede reservar desde Perfil.
- **Pestaña Comunidad** con "Próximamente". Perfil ha pasado al botón con tu inicial en la cabecera.

## Modelo de datos

Todas las tablas llevarán RLS. Se crearán en la migración de la Fase 3, no antes: así no quedan tablas vacías que haya que rehacer.

| Tabla | Columnas clave | Notas |
|---|---|---|
| `follows` | `follower_id`, `followee_id`, `status` (`pending`/`accepted`), `created_at` | Clave `(follower_id, followee_id)`. A una cuenta privada se la sigue con solicitud. |
| `kudos` | `session_id`, `user_id`, `created_at` | Clave `(session_id, user_id)`: un kudo por persona y sesión. |
| `comments` | `id`, `session_id`, `user_id`, `body`, `created_at`, `deleted_at` | Texto plano de hasta 500 caracteres. |
| `blocks` | `blocker_id`, `blocked_id` | El bloqueo prevalece sobre todo: ni feed, ni perfil, ni comentarios. |
| `reports` | `id`, `reporter_id`, `target_type`, `target_id`, `reason`, `status` | Cola de moderación. |
| `session_media` | `id`, `session_id`, `user_id`, `storage_path`, `width`, `height` | Fotos en Supabase Storage (bucket con RLS), comprimidas en el móvil antes de subirlas. |
| `notifications` | `id`, `user_id`, `type`, `actor_id`, `session_id`, `read_at` | Kudos, comentarios, nuevos seguidores. Más adelante, notificaciones push (Web Push). |

**Lectura de datos de otros** (la parte delicada):

- Una vista `public_profiles` que solo expone los campos públicos: `username`, `display_name`, `avatar_url`, `bio`, `is_private` y contadores.
- Políticas de lectura sobre `sessions`, `session_exercises` y `session_sets` de otros usuarios. Solo se ve una sesión si se cumple todo lo siguiente:
  - su `visibility` lo permite: `public`, o `followers` si sigues a su dueño con `status = accepted`;
  - no hay bloqueo en ninguna dirección;
  - el perfil no es privado, o lo sigues.
- El feed será una función `feed(cursor)` paginada por fecha, que respeta las mismas políticas.

## Funcionamiento

- **Tus datos siguen siendo local-first**: se escriben en el móvil y se sincronizan.
- **Lo social es online**: el feed, los perfiles ajenos y los kudos se consultan al servidor, con caché para verlos sin conexión. No hace falta escribir offline en el feed de otros.
- **Privado por defecto**: nada sale de tu cuenta hasta que eliges `followers` o `public` en una sesión o en tus ajustes.

## Deportes con GPS (tipo Strava)

Una app web instalada **no puede grabar rutas GPS de forma fiable**: el navegador corta el GPS con la pantalla bloqueada, sobre todo en iPhone. Hay tres opciones, de menos a más esfuerzo:

1. **Registro manual** (ya previsto en la 1.5): deporte, duración, RPE, distancia y notas.
2. **Importar** actividades de Strava o Garmin (sus APIs con OAuth) o archivos GPX/FIT.
3. **Envolver la app como nativa** con Capacitor, reutilizando el mismo código. Así hay GPS en segundo plano y acceso a Apple Salud y Health Connect. Encaja con abrir la app al público en las tiendas.

Si se registran rutas: zonas de privacidad (ocultar el inicio y el final cerca de casa) activadas por defecto.

## Antes de abrir al público

- Comprobar en directo si un nombre de usuario está libre (función RPC). Hoy, si está cogido, el cambio aparece como "no aceptado" en Perfil → Sincronización.
- Dominio propio para el correo (Resend verificado) y plan Vercel Pro (uso comercial).
- RGPD: exportar y borrar la cuenta desde la app, y política de privacidad.
- Moderación: reportes, bloqueo, límites de frecuencia en comentarios y kudos.
- Registro abierto con onboarding: objetivo, nivel, unidades y deportes que practicas.

## Orden propuesto

1. **3.1** Perfil público y seguir (con solicitudes para cuentas privadas).
2. **3.2** Visibilidad por sesión y feed.
3. **3.3** Kudos, comentarios y notificaciones.
4. **3.4** Fotos y tarjeta para compartir una sesión o un récord.
5. **3.5** Moderación (reportar, bloquear) y apertura del registro.
