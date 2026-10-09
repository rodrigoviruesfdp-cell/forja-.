# Decisiones y pendientes

Documento vivo: se actualiza en cada entrega.

## Plan de la Fase 1

| # | Entrega | Estado |
|---|---|---|
| 1.1 | Cimientos: app instalable, login, perfil, idioma, unidades, base de datos completa con RLS, sincronización sin conexión | ✅ Hecha |
| 1.2 | Catálogo de ejercicios (free-exercise-db traducido), buscador con filtros, ejercicios propios; base de la Comunidad | ✅ Hecha |
| 1.3 | Constructor de rutinas: semanal o rotación A/B/C/D, deportes fijos, arrastrar o "+", reordenar, duplicar días, varias rutinas. Además: rediseño al estilo iOS | ✅ Hecha |
| 1.4 | Sesión en vivo: serie en ≤3 toques, "la última vez", calentamiento, notas, PR, offline; tests de 1RM y PR. Además: **deporte como código fijo** y un único **"Terminar sesión"** con resumen | ✅ Hecha |
| 1.5 | Otros deportes (también con fecha pasada), **spots**, **datos propios de cada deporte** (olas, asaltos…), calendario mensual con estados y racha | ✅ Hecha |
| 1.6 | **Compartir en Instagram:** imagen de la sesión con tu foto y los datos encima, imagen de la rutina, pegatina experimental | ✅ Hecha |
| 1.7 | **Logros y destacados** en el perfil (ver [`LOGROS.md`](LOGROS.md)) | ✅ Hecha |
| 1.8 | Progresión: gráficas, PR, volumen por músculo, carga semanal | ✅ Hecha |
| 1.9 | **Fotos de progreso** privadas, comparador e imagen de transformación | ✅ Hecha |
| 1.10 | Pulido: rendimiento, accesibilidad, datos de ejemplo, README final | ✅ Hecha |

**La Fase 1 está terminada.**

Las gráficas pasan de la 1.6 a la 1.8: la 1.4 ya enseña "la última vez" y los récords en el gimnasio, las gráficas necesitan semanas de datos, y compartir y los logros aprovechan lo registrado desde el primer día (los logros también se calculan hacia atrás).

Después: **Fase 2** (coach IA, solo cuando se pida) y **Fase 3** (amigos y compartir dentro de la app, ver [`SOCIAL.md`](SOCIAL.md)).

## Ideas evaluadas (octubre 2026)

| Idea | Decisión | Dónde |
|---|---|---|
| 1 vs 1 con sticker para Instagram | Se convierte en **"entrenar juntos"**: amigos que estaban en el mismo sitio el mismo día, con un duelo opcional. La imagen de tu propia sesión llega antes (1.6). | 1.6 y Fase 3 (3.3, 3.4) |
| Subir la rutina con fotos de progresión | Se separa: **fotos de progreso privadas** (1.9) e **imagen de la rutina** (1.6); publicar rutina o transformación dentro de la app es Fase 3 (3.2). Las fotos solo salen del móvil si publicas una transformación. | 1.6, 1.9 y 3.2 |
| Logros tipo videojuego en el perfil | Funcionan con un solo usuario. Fila de **destacados** bajo el perfil, como en Instagram. | 1.7 |

### Decisiones tomadas ahora para no rehacer nada después

1. **Deporte como código fijo** (`surf`, `boxing`…) y nombre libre solo para "otro" (1.4). Antes se guardaba el nombre traducido ("Fútbol"), y con sesiones en dos idiomas no se podrían contar "200 días de boxeo".
2. **Spots:** tabla propia de cada usuario (nombre; coordenadas cuando llegue el mapa) enlazada a la sesión (1.5). Una sesión de surf sin spot nunca contaría para un logro de spots.
3. **Datos propios de cada deporte** (olas, asaltos, mejor ola…) en un único campo flexible que la app valida según el deporte (1.5), en vez de una columna por deporte.
4. **Un único "Terminar sesión"** que calcula el resumen (duración, volumen, récords). De él cuelgan la pantalla final y, más adelante, los logros, la imagen para compartir y los grupos (1.4).
5. **Publicar es hacer una copia** (tabla `posts` con lo que eliges mostrar). Nadie lee tus tablas privadas; `sessions.visibility` se queda sin usar (Fase 3).
6. **Una sola tabla `media`** y una carpeta privada por usuario para todas las fotos; los originales nunca son públicos (1.9).
7. **Amigos:** os seguís los dos, con aceptación; cuentas solo por invitación, sin registro abierto (Fase 3).
8. **Sin "sistema de eventos" aparte:** las sesiones ya registran todo; logros, feed y duelos se calculan a partir de ellas.

### Lo que no se construye todavía

| Qué | Por qué |
|---|---|
| 1 vs 1 con desconocidos o rankings públicos | Los datos no se pueden verificar: ganaría quien más mienta, y exige moderación |
| Botón directo "pegatina en historia" como el de Strava | Instagram solo lo permite a apps nativas |
| Mapa y catálogo mundial de spots | De momento basta el nombre; un catálogo compartido obliga a fusionar duplicados y moderar |
| Importar de Strava o Apple Salud | Caro; una web no puede leer Apple Salud |
| Cifrar las fotos de forma que ni el servidor pueda verlas | Complica miniaturas y varios móviles; basta con almacenamiento privado |
| Detección automática de desnudos | Solo si se abre al público |
| Logros calculados en el servidor | Solo cuando sean visibles para otros (Fase 3) |
| Duelos en directo durante la sesión | Exige red en el gimnasio y tiempo real; el resumen al final da casi lo mismo |
| Animaciones complejas o insignias 3D | Primero insignias dibujadas por la app y animadas con Motion |
| Contadores que se van sumando para los logros | Se descuadran al editar o borrar; recalcular lo afectado es barato |

## Decisiones tomadas

### Arquitectura

- **Local-first.** La UI lee y escribe solo en una base de datos del móvil (IndexedDB con Dexie). Un motor propio sincroniza con Supabase:
  - **Subida:** cola de cambios en el móvil. Se agrupan por fila, se suben en orden de dependencias (padres antes que hijos) y una fila rechazada no bloquea al resto.
  - **Descarga:** incremental por `updated_at`, que lo asigna siempre el servidor. Se releen 2 minutos de solape para no perder escrituras tardías.
  - **Conflictos:** si una fila tiene un cambio local pendiente, la descarga no la pisa; al subir, gana el último que sube. Con un solo usuario es suficiente.

  Así la app abre al instante y funciona sin cobertura. Alternativas descartadas: PowerSync o ElectricSQL (servicios externos, demasiado para un usuario) y guardar solo la sesión en curso (no resuelve abrir la app sin red).
- **Una base de datos local por usuario** (`forja-<id>`): dos cuentas en el mismo móvil nunca se mezclan. Al cerrar sesión se borra la del usuario.
- **Páginas como "carcasa" estática + datos en el cliente.** El service worker (Serwist) precachea todas las pantallas, así que la app abre sin red. La seguridad no depende del front: la garantiza RLS en Postgres.
- **Sin servidor propio en la Fase 1.** Todo habla con Supabase directamente desde el móvil (con RLS). Las rutas de servidor se usarán para el coach IA en la Fase 2, para no exponer la clave de Anthropic.
- **Next.js 16** (Turbopack), **Tailwind 4**, componentes propios al estilo iOS sobre Radix (el registro de shadcn no estaba accesible desde el entorno de construcción), **Zod 4**, **Vitest**, **use-intl** para los textos.
- **Motion** (antes Framer Motion) para animaciones y arrastrar, **vaul** para las hojas inferiores y **sonner** para los avisos. Se descartó **dnd-kit** (previsto en el documento original): `Reorder` de Motion hace lo mismo con la física de muelle del resto de la app y una dependencia menos.

### Login

- Correo con **enlace + código de 6 dígitos**. En iPhone, el enlace se abre en Safari y no en la app instalada; el código se escribe dentro de la app. Requiere SMTP propio (Resend gratis), porque desde junio de 2026 Supabase no deja editar la plantilla en proyectos gratuitos nuevos con su correo por defecto.
- **Contraseña como plan B.** Sirve si no hay SMTP propio o si se alcanza el límite de correos.
- **Registro público desactivado** en Supabase y `shouldCreateUser: false` en la app. El único usuario se crea desde el panel.
- La sesión se considera abierta mientras exista en el móvil, aunque no haya red. Supabase la invalida solo si el servidor la rechaza de verdad.
- **Flujo "implicit"** de Supabase Auth: el enlace funciona aunque se abra en un navegador distinto del que lo pidió.

### Modelo de datos (cambios sobre el documento original)

- **Columnas en inglés** (`weight_kg`, `set_number`…), como los nombres de las tablas. Así se evitan tildes en SQL y se facilita abrir el proyecto a otros desarrolladores.

  | Documento original | Base de datos |
  |---|---|
  | nombre | `name` / `display_name` |
  | objetivo | `goal` |
  | nivel | `level` |
  | unidades | `units` |
  | notas_lesiones | `injury_notes` |
  | grupo_muscular_principal | `primary_muscle` |
  | músculos_secundarios | `secondary_muscles` |
  | equipamiento | `equipment` |
  | instrucciones | `instructions` |
  | imagen_url | `image_urls` (varias imágenes) |
  | creado_por | `created_by` |
  | activa | `profiles.active_routine_id` |
  | día_semana | `weekday` |
  | orden / posición | `position` |
  | series_objetivo | `target_sets` |
  | reps_objetivo | `target_reps_min` + `target_reps_max` |
  | fecha | `date` |
  | tipo | `kind` |
  | deporte | `sport` |
  | duración_min | `duration_min` |
  | distancia | `distance_km` |
  | estado | `status` |
  | nº_serie | `set_number` |
  | peso | `weight_kg` |
  | es_calentamiento | `is_warmup` |
  | es_pr | `is_pr` |
  | peso_corporal | `body_weight_kg` |
  | descripción | `description` |
  | valor_objetivo | `target_value` |
  | fecha_límite | `deadline` |

- **`user_id` en todas las tablas**, también en las hijas. Las hijas apuntan al padre con una clave compuesta `(parent_id, user_id)`, de modo que una fila nunca puede colgar de datos de otro usuario. Probado con tests pgTAP.
- **Tabla nueva `session_exercises`** entre `sessions` y `session_sets`. Guarda el orden de los ejercicios en la sesión, notas por ejercicio, permite cambiar un ejercicio sobre la marcha y conserva una copia de los objetivos (editar la rutina no reescribe el historial).
- **Rutina activa en `profiles.active_routine_id`**, no como booleano en `routines`. Así "solo una activa" se cumple por construcción y no hay conflictos al sincronizar.
- **Rutinas semanales o en rotación** (`schedule_type`):
  - **Semanal:** cada día lleva su día de la semana.
  - **Rotación (A/B/C/D…):** los días de gimnasio se hacen en orden, toque el día que toque. Los deportes pueden fijarse a un día (por ejemplo, fútbol los miércoles). Opcionalmente se indican los días que sueles entrenar (`training_weekdays`) para que el calendario proyecte lo que toca.
  - `weekly_target` es el número de sesiones por semana que cuentan para la racha.
- **Rango de repeticiones** (`target_reps_min`/`target_reps_max`) en lugar de un número fijo, pensando en la progresión doble del coach.
- **Estados de sesión:** `planned`, `in_progress`, `completed` y `skipped`. Las sesiones planificadas **no se guardan día a día**: el calendario las calcula a partir de la rutina activa. Se crea fila al empezar, registrar o saltar una sesión.
- **Borrado suave** (`deleted_at`) en todo lo que se puede borrar, para que el borrado también se sincronice. Nadie puede hacer borrados duros con la clave pública.
- **Unidades:** los pesos se guardan siempre en kg (3 decimales) y las libras solo se usan al escribir o mostrar. La ida y vuelta de cargas habituales en lb es exacta (testeado). Distancia en km. Días de la semana: 0 = lunes … 6 = domingo.
- **`visibility`** existe en `sessions` (`private` por defecto) pero no se usa hasta la Fase 3.
- **`es_personalizado`** no es una columna: se deduce de `created_by` (null = catálogo).
- **Enumeraciones como texto + CHECK**, más fáciles de ampliar en migraciones futuras que los `enum` de Postgres.
- `coach_messages` y la tabla de uso del coach se crearán en la migración de la Fase 2.

### Producto

- **Idioma y unidades** seleccionables (es/en, kg/lb). Se guardan en el perfil, así que se sincronizan entre dispositivos, y además en el móvil para que el primer fotograma ya salga bien. La primera vez se detecta el idioma del teléfono.
- **Tema** oscuro por defecto, con claro y "sistema". Es una preferencia del dispositivo, no de la cuenta.
- **Guardado automático** en el perfil: los selectores guardan al cambiar y los textos al salir del campo. Sin botón "Guardar".
- Indicador de sincronización siempre visible (✓ verde, nube tachada o error). Responde a "¿se ha guardado mi entreno?".

### Biblioteca de ejercicios (1.2)

- **Fuente: [free-exercise-db](https://github.com/yuhonas/free-exercise-db)**, dominio público (Unlicense). Son 876 ejercicios, fijados a un commit concreto (`f00c92c7`) para que nunca cambien sin querer.
- **Identificadores deterministas** (UUID v5 a partir del id original): el mismo ejercicio tiene el mismo id en local y en producción, y recargar el catálogo nunca duplica nada.
- **Carga del catálogo:**
  - Se hace con una Edge Function de Supabase (`supabase/functions/seed-catalog`) que descarga el dataset y escribe **solo lo nuevo o lo cambiado**. Así, repetirla no obliga a los móviles a volver a descargar nada.
  - En producción se invocó una vez desde la base de datos con la extensión `pg_net` (habilitada para ello).
  - En local: `npm run seed:catalog`.
- **Traducciones dentro de la app, no en la base de datos** (`src/i18n/exercise-names/es.json`, un nombre por ejercicio). Corregir una traducción es publicar la app, sin tocar datos. El archivo se carga bajo demanda (~15 KB comprimido).
- **Las instrucciones del catálogo siguen en inglés.** La app lo avisa.
- **Imágenes:** dos fotos por ejercicio (inicio y final del movimiento) servidas por jsDelivr y fijadas al mismo commit.
  - En la ficha se alternan como un pequeño bucle animado; con "reducir movimiento" se muestran una junto a otra.
  - El service worker las guarda al verlas (hasta 600, durante 90 días) para usarlas sin conexión.
- **Búsqueda instantánea en el móvil**, sin red:
  - ignora tildes y mayúsculas;
  - todas las palabras deben aparecer, en cualquier orden;
  - busca en el nombre en español, en el original en inglés, en el músculo y en el material;
  - ordena primero los nombres que empiezan por lo buscado, y los más cortos.
- **Filtros:** músculo principal, material y "Mis ejercicios". La búsqueda y los filtros se recuerdan al ir a una ficha y volver.
- **Ejercicios propios:**
  - privados (RLS);
  - músculo principal obligatorio, secundarios, material, tipo e instrucciones (un paso por línea);
  - editar y borrar (borrado suave);
  - el catálogo es de solo lectura.
- **Navegación:**
  - la barra inferior pasa a ser Hoy, Calendario, Rutinas, Progreso y **Comunidad**;
  - **Perfil** se abre desde el botón con tu inicial en la cabecera;
  - la biblioteca está dentro de Rutinas.
- **Actualizaciones de la app:** una versión nueva se descarga en segundo plano y **espera**. Un aviso "Hay una versión nueva · Actualizar" deja elegir el momento, para que nunca se recargue a mitad de un entreno. Si no se toca, entra al cerrar la app del todo. Excepción: un móvil que nunca ha tenido ese aviso (venía de la 1.1) no puede mostrarlo, así que la versión nueva entra sola y recarga la app una vez. La app deja una marca (una caché vacía, `forja-update-ui-v1`) cuando ya puede mostrar el aviso.
- **Índices** para todas las claves foráneas (aviso del revisor de rendimiento de Supabase). Los índices antiguos de una sola columna se mantienen: no estorban y quitarlos requería confirmación manual.
- **Comunidad:**
  - el diseño completo está en [`docs/SOCIAL.md`](SOCIAL.md);
  - de momento solo se reserva el `username` y se añaden `bio`, `avatar_url` e `is_private` (privado por defecto) a `profiles`;
  - las tablas sociales se crearán al construirlo.

### Rutinas (1.3)

- **Sin cambios en la base de datos:** las tablas de rutinas ya estaban desde la 1.1.
- **Lógica pura en `src/domain/routines`** (con tests), separada de las pantallas.
  - **Reglas** (`builder.ts`): crear, duplicar, mover, reordenar y validar contra los límites de la base de datos.
  - **Cambio semanal ↔ rotación:** al pasar a rotación, los días de gimnasio conservan su orden y sus días de la semana pasan a "días que sueles entrenar". Al volver a semanal, se reparten en esos días y los que sobran quedan en "Sin día asignado".
  - **Plan del día** (`plan.ts`): qué toca hoy y qué viene después.
  - **Plantillas** (`templates.ts`): "A/B/C/D + deporte" (tu forma de entrenar) y "Full body 3 días", con ejercicios reales del catálogo. Un test comprueba que todos existen.
- **Rotación:** toca el día siguiente al último **empezado o completado** (desde la 1.4; sin sesiones, el A). Los días de gimnasio no tienen día de la semana; los deportes pueden fijarse a uno. Con "días que sueles entrenar" vacío, cualquier día vale.
- **Semanal:** cada día tiene su día de la semana; puede haber dos el mismo día (gimnasio + deporte).
- **Repeticiones:** fijas (5) o rango para doble progresión (8–12). Subir el mínimo por encima del máximo arrastra el máximo, y al revés.
- **Escrituras atómicas:** `saveChanges` guarda varias tablas en una sola transacción (rutina + días + ejercicios + perfil), con su cola de subida.
- **Deshacer:** borrar es un borrado suave. Deshacer reescribe la versión anterior de las filas.
- **Arrastrar:** solo desde el asa ⠿, para no bloquear el scroll. Se guarda al soltar, no en cada hueco. Para mover un ejercicio a otro día se usa **Mover a otro día**: arrastrar entre días en un móvil, con la página desplazándose, falla demasiado. Por accesibilidad, **Subir/Bajar** hacen lo mismo que arrastrar.
- **La primera rutina que creas pasa a ser la activa.** Al borrar la activa, no queda ninguna activa.

### Sesión en vivo (1.4)

- **Solo se guardan las series hechas.** Las que faltan se calculan a partir del objetivo del ejercicio, que se copia de la rutina al empezar (`session_exercises.target_sets`). Si paras antes, no queda nada que limpiar, y cada serie es una sola escritura. **+ Serie** sube el objetivo de esa sesión, sin tocar la rutina.
- **Una serie en uno a tres toques:**
  - la fila ya viene rellenada, así que un toque en su círculo la registra;
  - para cambiar algo: tocar la fila, ajustar con − / + y **Registrar serie**;
  - si no hay nada que proponer (primera vez), el círculo abre la hoja.
- **Qué se propone en cada fila:**
  - mientras repites lo de la última vez, las series siguientes de la última vez (también en pirámide);
  - en cuanto cambias algo, tu última serie se arrastra a las siguientes;
  - la primera vez, sin peso y con el mínimo de repeticiones del objetivo.

  **Copiar** (en "Última vez") rellena las filas pendientes con lo de la última vez.
- **Botones de peso:** 2,5 kg o 5 lb (un par de discos pequeños). Cualquier otro peso se escribe.
- **"La última vez"** es la última sesión **terminada** con ese ejercicio. La sesión en curso no cuenta.
- **Calentamientos:** no cuentan para el objetivo de series, el volumen ni los récords.
- **Récords (PR):**
  - una serie es récord si supera a todas las anteriores de ese ejercicio en **peso**, en **1RM estimado** (Epley) o, sin peso añadido (dominadas, fondos), en **repeticiones**;
  - el 1RM solo se estima hasta **12 repeticiones**: una serie larga y ligera no puede ser "récord" frente a una pesada de 5;
  - **la primera sesión de un ejercicio fija la referencia** y nunca tiene récords; si no, cada ejercicio nuevo llenaría el resumen de récords falsos;
  - `is_pr` se recalcula con todo el historial del ejercicio cada vez que se añade, cambia o borra una serie, porque eso puede cambiar series posteriores.
- **"Terminar sesión"** es una sola función (`finishSession`):
  - cierra la sesión y quita los ejercicios sin ninguna serie;
  - calcula la duración. Si la última serie es de hace más de 30 minutos, se te olvidó terminar y la sesión acaba en esa serie;
  - devuelve el resumen: duración, volumen, series, ejercicios y récords.

  El esfuerzo (RPE 1–10) es opcional y de un toque; servirá para la carga semanal (minutos × RPE). Los logros y la imagen para compartir colgarán de este mismo punto.
- **Un entreno a la vez.** Uno empezado cuenta para la rotación: al empezar el B, lo siguiente es el C. Si hoy ya empezaste o terminaste un día de gimnasio de la rutina, el hueco de hoy está usado y lo siguiente pasa al próximo día de entreno.
- **Cambiar un ejercicio** por otro solo se puede antes de registrar series. Con series, se quita y se añade otro, para no mezclar el historial de dos ejercicios.
- **Durante el entreno, la barra de abajo** pasa a ser la del entreno: duración, descanso desde la última serie y **Terminar**. En las demás pantallas, una cápsula encima de la barra lleva de vuelta.
- **Descanso sin alarma:** con la pantalla bloqueada, una app web no puede avisar de forma fiable (sobre todo en iPhone). Se muestra el tiempo desde la última serie.
- **Un entreno terminado se puede corregir** en el mismo sitio: series, ejercicios o borrarlo. Se abre desde **Hecho hoy**; los días pasados, desde el calendario (1.5).
- **Deporte como código fijo** (migración `20261008000300_sport_keys.sql`): `routine_days.sport` y `sessions.sport` guardan `football`, `boxing`, `surf`… El nombre traducido sale de los textos de la app. Un deporte que no está en la lista se guarda tal como lo escribiste. La migración convirtió los nombres que ya había ("Fútbol" → `football`).
- El buscador de ejercicios es el mismo para rutinas y entrenos (`src/features/exercises/exercise-picker.tsx`).

### Deportes, spots y calendario (1.5)

- **Esquema** (migración `20261009000100_places_and_sport_metrics.sql`):
  - tabla **`places`**: los spots de cada usuario (nombre y el deporte para el que se creó), con RLS como el resto;
  - **`sessions.place_id`**: dónde fue la sesión. Clave compuesta, así que solo puede apuntar a un spot tuyo;
  - **`sessions.metrics`**: lo que cuenta cada deporte, en un único campo JSON (`{"waves": 14}`). La app decide qué datos tiene cada deporte, así que añadir uno nuevo no necesita columnas.
- **Móviles con datos de la 1.4:** la base del móvil pasa a la versión 2 y rellena los campos nuevos en las sesiones guardadas. Además, cada subida añade los valores por defecto (`COLUMN_DEFAULTS`), por si una versión antigua de la app escribe una sesión sin ellos.
- **Qué pide cada deporte** (`sportProfile`):
  - distancia: running, ciclismo, natación, senderismo y esquí (y los deportes que no están en la lista);
  - olas: surf; asaltos: boxeo y artes marciales; vías y bloques: escalada;
  - duración, esfuerzo, notas y lugar: todos.

  En surf el lugar se llama **spot**.
- **Registrar un deporte:** hoy o un día pasado, nunca futuro. Duración con atajos (30–120 min) o escrita. Un deporte registrado después no tiene hora de inicio fiable (`started_at` vacío): lo que cuenta es el día.
- **Spots:**
  - se eligen de tu lista (primero los que usaste para ese deporte, el más reciente antes; luego los creados para él; luego el resto) o se escribe uno nuevo, que se crea al guardar;
  - el mismo nombre con otras mayúsculas, tildes o espacios es el mismo spot: así "100 spots distintos" contará bien;
  - de momento no se pueden renombrar, fusionar ni borrar. Las coordenadas llegarán con el mapa.
- **Saltar un día** crea una sesión `skipped` para esa fecha. En una rotación el día no se gasta: pasa al siguiente día de entreno. **Deshacer** la borra.
- **Calendario:**
  - meses de lunes a domingo; se cambia de mes con flechas o deslizando;
  - **verde** = hecho (hasta 3 puntos), **círculo azul** = planificado (solo hoy y días futuros, calculado con la rutina activa), **raya gris** = saltado;
  - los días pasados que tocaban y no se registraron no se marcan: los planes no se guardan;
  - al tocar un día se ve su detalle: un entreno de gimnasio abre su resumen; un deporte abre su hoja para corregirlo o borrarlo; hoy, lo planificado se puede **Empezar** o **Registrar**; hoy y los días pasados tienen **Añadir deporte**.
- **Racha:**
  - semanas seguidas (de lunes a domingo) con al menos tu objetivo de sesiones completadas, gimnasio y deportes juntos;
  - el objetivo es el **objetivo semanal** de la rutina activa, o lo que planifica, o 1 sin rutina;
  - la semana en curso solo suma: no rompe la racha hasta que termina;
  - se muestra la mejor racha y un anillo con la semana actual;
  - se usa el objetivo actual para todas las semanas: cambiarlo recalcula también las pasadas.
- **Color nuevo:** naranja de iOS (`--streak`) solo para la racha.

### Compartir en Instagram (1.6)

- **Todo se dibuja en el móvil** (un `canvas`): funciona sin conexión y la foto que eliges **no sale del móvil**; no hay nada nuevo en la base de datos ni en el servidor.
- **Tres estilos para una sesión** (gimnasio o deporte):
  - **Foto:** tu foto recortada a 9:16 (como `object-fit: cover`) con un degradado oscuro abajo y los datos encima, al estilo de Strava;
  - **Fondo:** los mismos datos sobre fondo oscuro con un brillo amarillo de Forja;
  - **Pegatina:** PNG transparente de 1080 × 720 con los datos y una sombra, para ponerla sobre otra historia.
- **Qué datos lleva** (`shareStats`, en `src/domain/share.ts`): como mucho tres números y nunca un cero.
  - Gimnasio: duración, volumen y series.
  - Deporte: duración, lo que cuenta ese deporte (olas, asaltos, vías…), distancia y esfuerzo.
  - Además: el título, la fecha, el spot (se puede ocultar) y, si hubo récords, una línea roja ("🏆 Récord en Press de banca" o "🏆 3 récords").
- **Diseño:**
  - tamaño de historia (1080 × 1920), sin texto en las franjas que tapa Instagram arriba (210 px) y abajo (280 px);
  - letra del sistema, la misma que la app (en iPhone, SF Pro; los números en SF Pro Rounded);
  - los textos largos se encogen hasta caber y, si no, se cortan con "…";
  - todos los números van al mismo tamaño, el mayor que quepa, y cada columna mide lo que ocupa su contenido.
- **Imagen de la rutina:**
  - los días en orden: A, B, C… y luego los deportes en una rotación; de lunes a domingo en una semanal, con la inicial del día;
  - los ejercicios de cada día van en una a tres líneas, según quepan (`routineLayout`), separados por "·", con "+3 más" si no caben todos;
  - si ni siquiera caben los nombres de todos los días, la última línea dice cuántos faltan.
- **Compartir:**
  - usa el menú de compartir del móvil (Web Share con archivos), donde aparece Instagram → Historia;
  - si el navegador no puede compartir archivos (ordenador), **Compartir** guarda la imagen;
  - cerrar el menú sin elegir no es un error.
- **Pegatina:** **Copiar pegatina** la deja en el portapapeles como PNG para pegarla en una historia. Safari solo copia imágenes dentro del mismo toque, así que se le entrega la imagen "prometida" en ese momento. Es **experimental**: el botón directo de Strava ("añadir a historia") solo existe para apps nativas.
- **Dónde está:** en la hoja de un deporte (**Compartir**), en el resumen de un entreno terminado (botón y icono arriba) y en el menú **⋯** de una rutina (**Compartir rutina**).
- Las imágenes se preparan en cuanto cambias algo, para que **Compartir** abra el menú en el mismo toque (iOS solo lo permite justo después de tocar).

### Logros y destacados (1.7)

El diseño completo y el catálogo están en [`LOGROS.md`](LOGROS.md). Lo que se decidió al construirlo:

- **Esquema** (migración `20261010000100_user_achievements.sql`): tabla **`user_achievements`**, una fila por logro y nivel conseguido, con la sesión que lo consiguió, cuándo lo viste (`seen_at`) y su sitio en destacados (`featured_position`). RLS como el resto y **sin DELETE**: un logro conseguido no se pierde aunque borres sesiones.
- **El id de cada fila sale de (usuario, logro, nivel)** (un hash): si dos móviles calculan el mismo desbloqueo, escriben la misma fila en vez de duplicarla. Además, la base de datos tiene `unique (user_id, achievement_key, tier)`.
- **El motor** (`src/domain/achievements`): cada logro es una medida, un filtro y unos niveles. Recorre tus sesiones completadas **en el orden en que pasaron** y apunta, para cada nivel, la sesión que lo alcanzó. Así, un deporte apuntado días después se coloca en su sitio. El progreso ("10 / 50") no se guarda: se calcula.
- **Cuándo se calcula:** en el móvil, al terminar un entreno o guardar un deporte (sale la animación en ese momento) y una vez al abrir la app, después de la primera sincronización, para que lleguen antes los logros de otro móvil. Lo que ya hiciste antes de la 1.7 se reconoce así la primera vez.
- **Animación:** a pantalla completa, uno detrás de otro ("1 de 3"), con la medalla entrando con un muelle y un brillo de su color. Al pasarla queda vista, también en tus otros móviles.
- **Medallas:** dibujadas por la app (SVG): bronce, plata, oro, platino y diamante según el nivel; oro si el logro tiene un solo nivel; gris si aún no lo tienes; "?" si es secreto.
- **Destacados:** bajo el perfil, como las historias destacadas de Instagram. Sin elegir, los 5 últimos; si destacas alguno, solo los destacados (hasta 8), en el orden en que los elegiste. Anillo de color = hay algo sin ver.
- **Visor:** a pantalla completa, como una historia: tocar los lados o deslizar para pasar, deslizar abajo para cerrar.
- **Compartir un logro** usa el generador de la 1.6: foto, fondo oscuro con el brillo de la medalla o pegatina cuadrada (1080 × 1080).
- **Toneladas** se cuentan en toneladas métricas aunque uses libras.

### Progreso (1.8)

- **Sin cambios en la base de datos:** todo se calcula en el móvil a partir de las sesiones completadas y sus series de trabajo (`src/domain/progress`). Funciona sin conexión.
- **Periodo** (4 semanas, 3 meses, 1 año, todo): semanas enteras de lunes a domingo hasta la actual. "Todo" empieza en la semana de tu primera sesión. Todo lo de la pantalla sigue al periodo elegido.
- **Cifras:** sesiones, tiempo, volumen (kilos × repeticiones de las series de trabajo) y récords. La comparación con el periodo anterior (los mismos días justo antes) solo sale si en ese periodo ya había sesiones, y es neutra (sin verde ni rojo): una semana de descarga no es "peor".
- **Entrenamiento por semana:** columnas apiladas, gimnasio y deporte. Con más de 26 semanas, por meses. Dos medidas que se eligen, nunca dos ejes a la vez:
  - **tiempo** (minutos);
  - **carga** = minutos × esfuerzo (la "carga de sesión", RPE 1–10). Las sesiones sin esfuerzo no cuentan, y se dice cuántas, en vez de inventarles un valor.
- **Series por músculo:** series de trabajo a la semana, de media, por el músculo **principal** de cada ejercicio (el estándar habitual para medir volumen; los músculos secundarios no suman).
- **Cada ejercicio:** un punto por sesión con su mejor valor:
  - **1RM estimado** (Epley, solo series de hasta 12 repeticiones, como los récords), **peso máximo** o **volumen**;
  - sin peso añadido (dominadas, fondos), **repeticiones** (la serie con más);
  - los récords en rojo; la gráfica se dibuja en la unidad del usuario para que el eje caiga en números redondos también en libras.
- **Gráficas propias en SVG** (`src/components/charts`), sin librerías: pesan poco, funcionan sin conexión y siguen el diseño de la app. Reglas:
  - colores comprobados para daltonismo con el validador de la guía de visualización: azul `#2a78d6`/`#3987e5` (gimnasio) y naranja `#eb6834`/`#d95926` (deporte), tokens `--chart-1` y `--chart-2`;
  - líneas de 2 px, columnas finas con la punta redondeada, rejilla fina, ejes con números redondos;
  - al tocar, los datos salen **en una línea fija encima de la gráfica** (como la app Salud), no en una etiqueta flotante que tape los botones; también con las flechas del teclado;
  - cada gráfica de columnas tiene **Ver datos** (una tabla), para que ningún dato dependa de tocar.

### Fotos de progreso (1.9)

- **Esquema** (migración `20261011000100_media.sql`):
  - tabla **`media`**, la "una sola tabla para todas las fotos" decidida antes: `kind` (`progress` ahora; `avatar` y `post` en la Fase 3), `storage_path` y `thumb_path`, `taken_at` (el día), `pose` (frente, perfil, espalda o ninguna), `width`, `height`. RLS como el resto;
  - la ruta del archivo **siempre empieza por el id del dueño** (lo comprueba la base de datos);
  - **Storage:** cubo `media` **privado**, como mucho 10 MB por archivo y solo imágenes. Cada usuario solo puede leer, subir, sustituir y borrar dentro de su carpeta. No hay enlaces públicos.
- **En el móvil, antes de subir:** la foto se pone derecha, se reduce a 1600 px (y una miniatura de 400 px) y se vuelve a guardar como JPEG. Al redibujarla **se pierden los metadatos** (GPS, cámara). Unos 300–500 KB por foto: el plan gratuito de Supabase (1 GB) da para miles.
- **Sin conexión primero, también con fotos:**
  - la fila va por la sincronización normal; los archivos los guarda el móvil (tabla local `media_files`) y los sube `MediaSync` **antes** de subir las filas, para que otro móvil casi nunca vea una foto sin su archivo;
  - en otro móvil, las fotos se descargan **solo cuando se miran** y se quedan guardadas;
  - sin conexión, una foto que aún no está en el móvil sale como una nube tachada.
- **Borrar es borrar:** la fila queda marcada como borrada (los demás móviles quitan su copia) y los archivos se eliminan de Storage en la siguiente sincronización (tabla local `media_removals`, que se reintenta). Sin "deshacer": se pide confirmación.
- **Peso corporal:** al añadir o editar una foto se puede anotar el peso de ese día; se guarda en `body_metrics` (una entrada por día, que se actualiza). El comparador y la imagen muestran el cambio.
- **Comparador:** por defecto, la última foto contra la primera de la misma postura (o la primera de todas). Dos modos: **deslizar** (la de antes encima, recortada en la línea; también con las flechas del teclado) y **lado a lado**. La más antigua siempre a la izquierda.
- **Imagen de transformación:** las dos fotos a toda altura, una al lado de la otra, con "Antes / Después", las fechas, el tiempo que ha pasado y (si quieres) el cambio de peso. Se dibuja en el móvil con el generador de la 1.6.
- Las fotos de progreso pueden considerarse **datos de salud**: por eso son privadas sin excepción y no hay nada que las publique dentro de la app (eso llegará, con consentimiento explícito, en la Fase 3).

### Pulido (1.10)

**Datos de ejemplo.** El plan decía "un botón para cargarlas y otro para borrarlas"; se ha hecho como un **modo aparte**, que hace lo mismo sin sus problemas:

- Mezclar sesiones inventadas con las tuyas en tu cuenta tenía tres pegas: los récords de tus series se calcularían contra pesos inventados; los logros conseguidos no se borran nunca, así que los del ejemplo se quedarían; y se subiría todo a Supabase.
- **Cómo es:** una **segunda base de datos local** (`forja-<id>-demo`) con una copia de tu catálogo y tu perfil y 12 semanas inventadas. Mientras estás en ella, la app la usa en lugar de la tuya y **su sincronización no va a ningún sitio** (ni filas ni fotos). Al salir se borra entera.
- **Las 12 semanas** salen de un generador puro y con semilla (`src/domain/sample`): la plantilla A/B/C/D + fútbol, con doble progresión (más repeticiones hasta el tope del rango y luego más peso), algún día saltado o perdido, surf en dos spots, carreras cada dos domingos y el peso corporal bajando. Los pesos son números redondos en tu unidad (kg o lb). Los récords se calculan con la misma lógica de siempre; los logros también, y se marcan como vistos para que no salga una ronda de celebraciones.
- **Cómo se nota:** se entra desde **Perfil → Datos de ejemplo**, con confirmación. Mientras dura, una cápsula **Datos de ejemplo · Salir** encima de la barra; en Perfil no aparecen **Sincronización** ni **Cerrar sesión** (para cerrar sesión, primero se sale del ejemplo).

**Rendimiento.** El requisito era abrir la sesión del día en menos de 2 s con conexión media. Medido con Chromium en un móvil simulado con el procesador **4 veces más lento** (un Android de gama media; un iPhone actual va bastante más rápido):

| Caso | Tiempo |
|---|---|
| App instalada (lo normal): abrir y ver lo que toca hoy | ≈ 1,2 s |
| Primera vez, sin nada en caché, 4G (9 Mbit/s) | ≈ 2,4 s (≈ 540 KB) |
| Primera vez, sin nada en caché, 4G lento (1,6 Mbit/s) | ≈ 4,3 s |
| Empezar el entreno desde Hoy | ≈ 0,6 s |
| Registrar una serie | ≈ 0,3 s |

- **Conclusión:** con la app instalada se cumple de sobra. La primera vez, sin nada guardado y con un móvil lento, pasa de 2 s; solo ocurre al instalarla.
- **Arreglado:**
  - al abrir, durante unos milisegundos **Hoy** creía que no había rutina y enseñaba **Empezar entreno libre**: un toque rápido empezaba un entreno vacío. Ahora no enseña botones hasta conocer el plan entero;
  - el plan se leía en tres consultas seguidas (perfil, rutina, último día hecho); ahora es una;
  - los nombres de los ejercicios en español se empiezan a cargar al abrir la app, no cuando aparece la tarjeta;
  - la sincronización espera 1,5 s tras abrir: primero se enseña lo que hay en el móvil, luego se actualiza. Sus escrituras obligaban a repetir las consultas de la pantalla. La primera descarga de un móvil nuevo no espera.
- **No se ha hecho** (poco beneficio para el riesgo ahora): cambiar Zod por `zod/mini` (≈ 25 KB menos), un cliente de Supabase sin la parte de tiempo real que no usamos, y cargar Motion por partes.

**Accesibilidad.** Revisión automática con **axe** (WCAG 2.1/2.2 AA y buenas prácticas) en las 22 pantallas y hojas principales, en tema claro y oscuro, más una comprobación de tamaños táctiles y de que nada se salga de lado en una pantalla de 320 px:

- antes: fallos de **contraste** en casi todas las pantallas (sobre todo en tema claro) y **66 controles por debajo de 44 pt**;
- después: **0 fallos**, salvo la barra de abajo atenuada mientras hay una hoja abierta. WCAG lo permite porque está inactiva, y los lectores de pantalla no llegan a ella;
- ya estaba bien: idioma de la página según tu idioma, zoom permitido, "Reducir movimiento", etiquetas en los botones de icono, gráficas con descripción y tabla.

**README final:** la guía de instalación se mantiene; las instrucciones de cada entrega pasan a ser una **guía de uso** por pantallas, con una sección de **problemas frecuentes**.

### Infraestructura

- **Supabase:** proyecto `forja` (región París, `eu-west-3`). Las migraciones se aplicaron con la integración de Supabase: el contenido es el mismo que en `supabase/migrations`, aunque la numeración de versiones en el servidor es distinta.
  - `20261008000300_sport_keys.sql` (1.4) solo convierte datos. En producción la herramienta de migraciones no respondía, así que el cambio se hizo con una actualización directa (el único deporte, "Surf", pasó a `surf`) y no figura en el historial de migraciones del servidor. El archivo se puede volver a ejecutar sin efecto.
- **Vercel:** proyecto `forja` conectado al repositorio de GitHub. Cada `push` publica sola la app en <https://forja-gilt-six.vercel.app>. Las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ya están configuradas.

### Diseño visual (desde la 1.3, según las Human Interface Guidelines de Apple)

- **Fondos neutros:** `#F5F5F7` / negro, con tarjetas blancas / `#1C1C1E`.
- **Materiales translúcidos** (desenfoque + saturación) en barras, menús, hojas y avisos:
  - claro: blanco al 85 %;
  - oscuro: negro al 80 % (desde la 1.10: con menos opacidad, las etiquetas de la barra no se leían encima de un botón amarillo o de una foto).
- **Bordes finos** (negro al 6 % / blanco al 12 %) y **sombras amplias y suaves** (`0 8px 30px` al 6 %).
- **Esquinas concéntricas:** radio interior = radio exterior − margen. Las tarjetas fijan ambos valores (`<Card size>`) y lo de dentro usa `rounded-concentric`. Las cápsulas (barra inferior, botones) lo cumplen por construcción.
- **Tipografía del sistema:** SF Pro en Apple, con el espaciado de letras de iOS (solo en Apple); Roboto o Segoe en el resto. Escala de iOS: título grande 34, cuerpo 17, nota 13. Números en **SF Pro Rounded**, tabulares, como en la app Fitness.
- **Contraste (desde la 1.10):** todo texto llega a **4,5:1** (WCAG AA) sobre cualquier superficie en la que aparezca, rellenos grises incluidos. Para eso se usan los tonos del modo **"Aumentar contraste" de Apple** en lugar de los normales, que no llegan con texto pequeño (`#007AFF` sobre blanco: 4,0:1):
  - textos secundarios `#636366` / `#A1A1A6`; terciarios `#6E6E73` / `#8E8E93` (claro / oscuro);
  - azul `#005ECB` / `#409CFF`; rojo `#C40018` / `#FF6961`.
- **Color:**
  - el **amarillo** se usa solo en la acción principal de cada pantalla;
  - **verde** = hecho / activo, solo en puntos, iconos e interruptores: como texto no llega al contraste, así que "Activa" o el reloj del entreno van en el color del texto con un icono verde al lado;
  - **rojo** = récord o destructivo;
  - **azul** = planificado y acciones en texto (como el tinte de iOS).
  - Lo seleccionado (filtros, días) va en el color del texto, no en amarillo.
- **Movimiento:** todo con muelle (`stiffness 350, damping 25, mass 0.8`) por defecto en `MotionConfig`.
  - Al pulsar: escala 0,96, y 1,01 al pasar el ratón.
  - Las listas entran escalonadas (0,04 s, 8 px).
  - Con "Reducir movimiento" solo quedan fundidos.
- **Navegación como en iOS:**
  - **barra inferior flotante** con una lente que se desliza a la pestaña elegida;
  - **título grande** que se recoge en la barra al hacer scroll;
  - transiciones **push/pop** con View Transitions de React, con una curva de muelle sin rebote en CSS `linear()`;
  - **hojas** con vaul: se arrastran y la pantalla de detrás se encoge;
  - hojas de acción en lugar de `confirm()` y avisos con **Deshacer** en lugar de preguntar antes de borrar.
- **Ajuste de vaul:** escala la página desde el principio del documento, y en una lista larga desplazaba lo que estás viendo. Se corrige con `transform-origin` en la parte visible y recortando esa zona con esquinas redondeadas.
- **Objetivos táctiles de 44 pt como mínimo** y navegación al alcance del pulgar. Los controles que se dibujan más pequeños, como en iOS (segmentos, chips, la ✕ de las hojas, los días L M X…), llevan una zona táctil invisible de 44 × 44 (utilidad `touch-target`).

## Pendiente / a vigilar

- **Instrucciones de los ejercicios en español:** pendiente (876 textos). Los nombres ya están traducidos y se pueden revisar en `src/i18n/exercise-names/es.json`.
- **Imágenes del catálogo en nuestro propio almacenamiento** (Supabase Storage) si jsDelivr da problemas.
- **Nombre de una rutina de plantilla:** se guarda en el idioma en el que se creó. Cambiar de idioma no la renombra.
- **Transiciones entre pantallas:** el gesto "atrás" de Android y el botón Volver hacen la animación de volver. En iPhone, la app instalada no tiene gesto de deslizar para volver (limitación de las PWA en iOS).
- **`body_metrics` y `goals`:** las tablas existen, pero no tienen pantallas en la Fase 1.
- **Nombre de usuario ocupado:** hoy aparece como "cambio no aceptado" en Perfil → Sincronización. Antes de abrir al público, comprobar la disponibilidad en directo.
- **Pausa de Supabase gratuito** tras 7 días sin uso. Si molesta, se puede añadir un "ping" diario o pasar a Pro.
- **Fase 3 (público):** ver [`docs/SOCIAL.md`](SOCIAL.md). Incluye dominio propio para el correo, plan Vercel Pro, RGPD, moderación y RLS de lectura pública según `visibility`.
- **Fotos (1.9):**
  - probar en un iPhone de verdad: hacer la foto con la cámara desde la app, fotos HEIC del carrete y fotos muy grandes;
  - más adelante: guías de encuadre para repetir la misma postura, recortar o girar a mano, y una gráfica del peso corporal (los datos ya se guardan);
  - si algún día se borra la cuenta, borrar también su carpeta de Storage (llega con "borrar mi cuenta", Fase 3).
- **Progreso (1.8):**
  - más adelante: elegir qué ejercicios seguir de cerca, objetivos (la tabla `goals` ya existe) y la carga semanal comparada con la media de las 4 semanas anteriores.
- **Logros (1.7):**
  - pulir el catálogo juntos: qué logros de surf y boxeo motivan de verdad, nombres y niveles;
  - estilo de medalla (ahora metálica y dibujada por la app) e ilustraciones hechas a mano;
  - reordenar los destacados arrastrando (hoy se ordenan por cuándo los destacaste);
  - "The Search" (lema de Rip Curl) y "Balboa" (Rocky): bien para uso personal; revisarlos antes de abrir a otros.
- **Compartir (1.6):**
  - probarlo en un iPhone de verdad: el menú de compartir, Instagram → Historia y pegar la pegatina (en el ordenador solo se pudo simular);
  - la pegatina es experimental: si Instagram no la pega, queda **Guardar imagen** y añadirla desde el carrete;
  - más adelante: elegir qué tres datos salen, más fondos y la imagen de "entrenar juntos" (Fase 3).
- **Deportes y calendario (1.5):**
  - registrar un **entreno de gimnasio en un día pasado** todavía no se puede: los récords se ordenan por la hora de cada serie, y apuntarlo hoy lo colocaría después de los entrenos recientes;
  - gestionar los spots (renombrar, fusionar duplicados, borrar) y el mapa.
- **Entreno (1.4):**
  - el RPE por serie existe en la base de datos, pero no tiene pantalla: no compensa el toque extra;
  - si una máquina va de 1 en 1 kg, el peso se escribe (el paso de los botones podría ser configurable más adelante);
  - el mismo entreno abierto en dos móviles a la vez: gana el último cambio de cada serie.
- **Pulido (1.10):**
  - probar los datos de ejemplo y la rapidez en un iPhone de verdad;
  - probar la app con **VoiceOver**; la revisión automática no lo sustituye;
  - si algún día la primera carga importa más (abrir al público): `zod/mini`, cliente de Supabase sin tiempo real y Motion por partes.
- **Passkeys (Face ID / huella):** Supabase empieza a soportarlas. Serían el login ideal para la app instalada; revisar cuando estén disponibles en el plan gratuito.
