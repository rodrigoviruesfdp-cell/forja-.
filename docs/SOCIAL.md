# Comunidad (Fase 3) — diseño previsto

Objetivo: un "Strava" para el gimnasio y para cualquier deporte, **entre amigos**. Compartir sesiones, rutinas, logros y transformaciones, entrenar juntos y retaros. **Nada de esto está construido todavía**; este documento fija las decisiones para que lo que se construya antes no haya que rehacerlo.

## Alcance: amigos por invitación

- **Cuentas solo por invitación.** El registro público sigue desactivado. Invitar a alguien necesita la clave secreta de Supabase, así que se hará desde el servidor (ruta de Vercel o Edge Function), nunca desde el móvil.
- **Amigos = os seguís los dos, con aceptación.** Se usa la tabla `follows` con `status`; "amigo" es un seguimiento aceptado en las dos direcciones.
- **Abrir al público** (registro abierto, moderación completa, RGPD completo, mapa de spots) queda para una posible 3.6 y solo si algún día se decide.

## Lo que ya está preparado

- **Cada fila tiene dueño** (`user_id`) y **Row Level Security** en todas las tablas. Hoy cada usuario solo ve lo suyo.
- **Identidad pública en `profiles`**:
  - `username` (único; minúsculas, números, `.` y `_`; de 3 a 30 caracteres);
  - `bio` y `avatar_url`;
  - `is_private` (por defecto `true`).

  El nombre de usuario ya se puede reservar desde Perfil.
- **Pestaña Comunidad** con "Próximamente". Perfil ha pasado al botón con tu inicial en la cabecera.
- **`sessions.visibility`** existe, pero **no se usará**: publicar es hacer una copia (ver abajo).

## Publicar es hacer una copia

Las sesiones, series, rutinas y fotos **nunca se abren a otros usuarios**. Al publicar, la app crea una fila en `posts` con **solo lo que eliges mostrar** (resumen de la sesión, la rutina, el logro o la transformación) y, si lleva fotos, una copia de esas fotos para esa publicación.

- **Más seguro:** las políticas de lectura para otros solo existen sobre `posts` y sus fotos, no sobre tus tablas privadas.
- **Un único sitio** para el feed, los kudos, los comentarios y la moderación.
- **Editar la sesión después no cambia lo publicado**, y despublicar es borrar la copia.

## Modelo de datos

Todas las tablas llevarán RLS. Se crearán en la migración de cada entrega de la Fase 3, no antes: así no quedan tablas vacías que haya que rehacer.

| Tabla | Columnas clave | Notas |
|---|---|---|
| `follows` | `follower_id`, `followee_id`, `status` (`pending`/`accepted`), `created_at` | Clave `(follower_id, followee_id)`. Amigos = aceptado en las dos direcciones. |
| `posts` | `id`, `user_id`, `type` (`session`/`routine`/`achievement`/`transformation`), `snapshot` (jsonb), `session_id`, `routine_id`, `audience` (`friends`), `created_at`, `deleted_at` | La copia de lo que publicas. Solo la ven tus amigos. |
| `media` | `id`, `user_id`, `kind` (`progress`/`post`/`avatar`), `storage_path`, `thumb_path`, `taken_at`, `pose`, `width`, `height`, `deleted_at` (y `post_id` cuando lleguen las publicaciones) | **Una sola tabla para todas las fotos.** Creada en la 1.9 con las fotos de progreso, en un cubo privado con una carpeta por usuario; sustituye a la `session_media` prevista antes. |
| `group_sessions` | `id`, `created_by`, `date`, `sport`, `place_name`, `duel_metric`, `duel_mode` (`fair`/`raw`), `status`, `winner_id`, `closed_at` | "Entrenar juntos" y el duelo del día. |
| `group_session_members` | `group_id`, `user_id`, `session_id`, `status` (`invited`/`accepted`/`declined`), `summary` (jsonb), `score`, `disputed` | Cada uno comparte **solo su resumen**, nunca sus series. |
| `kudos` | `post_id`, `user_id`, `created_at` | Un kudo por persona y publicación. |
| `comments` | `id`, `post_id`, `user_id`, `body`, `created_at`, `deleted_at` | Texto plano de hasta 500 caracteres. |
| `blocks` | `blocker_id`, `blocked_id` | El bloqueo prevalece sobre todo. |
| `reports` | `id`, `reporter_id`, `target_type`, `target_id`, `reason`, `status` | Cola de moderación. |
| `notifications` | `id`, `user_id`, `type`, `actor_id`, `post_id`, `group_id`, `read_at` | Invitaciones, kudos, comentarios, resultados de duelos. Más adelante, notificaciones push (Web Push; en iPhone funcionan con la app instalada). |

Además, `routines.source_routine_id` para saber de quién copiaste una rutina ("basada en la rutina de @…"). Tu copia es tuya: si el autor cambia la suya, la tuya no cambia.

**Lectura de datos de otros:**

- Una vista `public_profiles` con los campos públicos (`username`, `display_name`, `avatar_url`, `bio`) y los logros destacados.
- `posts` y sus fotos: solo si sois amigos y no hay bloqueo en ninguna dirección.
- `group_sessions` y `group_session_members`: solo sus miembros.
- El feed será una función `feed(cursor)` paginada por fecha, con las mismas reglas.

## Entrenar juntos y duelo del día

1. Al registrar una sesión, añades a los amigos que estaban contigo. Ellos aceptan y sus sesiones quedan enlazadas.
2. La imagen para compartir muestra los datos de todos sobre vuestra foto. Cada uno puede desactivar "mis datos en imágenes".
3. **Duelo opcional:** elegís el reto (más olas, más km, quién supera más su nivel). Dos modos:
   - **Justo** (por defecto): gana quien más supera **su propia media** en ese tipo de sesión. Necesita al menos 3 sesiones previas de cada uno.
   - **A pelo:** gana el número más alto. Para niveles parecidos o sin historial.
4. **Contra las trampas:**
   - solo puedes enlazar a quien acepta (estaba allí);
   - cada uno ve los números del otro y puede marcar "no me cuadra", y entonces no hay ganador;
   - el resultado lo calcula una función en la base de datos cuando todos han cerrado su sesión, y queda fijado;
   - el duelo se cierra solo a las 48 horas;
   - no hay rankings públicos.
5. Marcador acumulado entre dos amigos ("12–9 este año"), calculado a partir de los duelos.

## Funcionamiento

- **Tus datos siguen siendo local-first**: se escriben en el móvil y se sincronizan.
- **Lo social es online**: el feed, los perfiles ajenos y los kudos se consultan al servidor, con caché para verlos sin conexión.
- **Privado por defecto**: nada sale de tu cuenta hasta que publicas algo.
- **Logros visibles para otros:** se recalcularán en el servidor, para que nadie pueda inventarse uno escribiendo directamente en la base de datos.

## Deportes con GPS (tipo Strava)

Una app web instalada **no puede grabar rutas GPS de forma fiable**: el navegador corta el GPS con la pantalla bloqueada, sobre todo en iPhone. Hay tres opciones, de menos a más esfuerzo:

1. **Registro manual** (1.5): deporte, duración, RPE, distancia, spot, datos propios del deporte y notas.
2. **Importar** actividades de Strava o Garmin (sus APIs con OAuth) o archivos GPX/FIT.
3. **Envolver la app como nativa** con Capacitor, reutilizando el mismo código. Así hay GPS en segundo plano, acceso a Apple Salud y Health Connect, y el botón de Instagram para poner una pegatina directamente en una historia.

Si se registran rutas: zonas de privacidad (ocultar el inicio y el final cerca de casa) activadas por defecto.

## Antes de dar acceso a amigos

- Comprobar en directo si un nombre de usuario está libre (función RPC). Hoy, si está cogido, el cambio aparece como "no aceptado" en Perfil → Sincronización.
- Dominio propio para el correo (Resend verificado).
- RGPD básico: exportar y borrar la cuenta desde la app, y política de privacidad. Las fotos de progreso pueden considerarse datos de salud: consentimiento explícito antes de publicarlas.
- Bloquear y reportar.
- Revisar los nombres de logros que remiten a marcas ("The Search", "Balboa").

## Orden propuesto

1. **3.1 Amigos:** cuentas por invitación, seguir con aceptación, perfil del amigo con sus destacados, exportar y borrar la cuenta.
2. **3.2 Publicar:** publicaciones (sesión, rutina, logro, transformación), feed de amigos, copiar rutina.
3. **3.3 Entrenar juntos:** grupos e imagen conjunta.
4. **3.4 Duelo del día:** retos, modo justo, "no me cuadra", marcador.
5. **3.5 Interacción:** kudos, comentarios y notificaciones.
6. **3.6 Abrir al público** (si algún día): registro abierto, moderación, RGPD completo, mapa de spots, plan Vercel Pro.
