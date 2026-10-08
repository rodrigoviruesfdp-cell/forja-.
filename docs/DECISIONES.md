# Decisiones y pendientes

Documento vivo: se actualiza en cada entrega.

## Plan de la Fase 1

| # | Entrega | Estado |
|---|---|---|
| 1.1 | Cimientos: app instalable, login, perfil, idioma, unidades, base de datos completa con RLS, sincronización sin conexión | ✅ Hecha |
| 1.2 | Catálogo de ejercicios (free-exercise-db traducido), buscador con filtros, ejercicios propios; base de la Comunidad | ✅ Hecha |
| 1.3 | Constructor de rutinas: semanal o rotación A/B/C/D, deportes fijos, arrastrar o "+", reordenar, duplicar días, varias rutinas. Además: rediseño al estilo iOS | ✅ Hecha |
| 1.4 | Sesión en vivo: serie en ≤3 toques, "la última vez", calentamiento, notas, PR, offline; tests de 1RM y PR. Además: **deporte como código fijo** y un único **"Terminar sesión"** con resumen | En curso |
| 1.5 | Otros deportes (también con fecha pasada), **spots**, **datos propios de cada deporte** (olas, asaltos…), calendario mensual con estados y racha | |
| 1.6 | **Compartir en Instagram:** imagen de la sesión con tu foto y los datos encima, imagen de la rutina, pegatina experimental | |
| 1.7 | **Logros y destacados** en el perfil (ver [`LOGROS.md`](LOGROS.md)) | |
| 1.8 | Progresión: gráficas, PR, volumen por músculo, carga semanal | |
| 1.9 | **Fotos de progreso** privadas, comparador e imagen de transformación | |
| 1.10 | Pulido: rendimiento, accesibilidad, datos de ejemplo, README final | |

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
- **Rotación:** toca el día siguiente al último **completado** (las sesiones llegan en la 1.4; hasta entonces es el A). Los días de gimnasio no tienen día de la semana; los deportes pueden fijarse a uno. Con "días que sueles entrenar" vacío, cualquier día vale.
- **Semanal:** cada día tiene su día de la semana; puede haber dos el mismo día (gimnasio + deporte).
- **Repeticiones:** fijas (5) o rango para doble progresión (8–12). Subir el mínimo por encima del máximo arrastra el máximo, y al revés.
- **Escrituras atómicas:** `saveChanges` guarda varias tablas en una sola transacción (rutina + días + ejercicios + perfil), con su cola de subida.
- **Deshacer:** borrar es un borrado suave. Deshacer reescribe la versión anterior de las filas.
- **Arrastrar:** solo desde el asa ⠿, para no bloquear el scroll. Se guarda al soltar, no en cada hueco. Para mover un ejercicio a otro día se usa **Mover a otro día**: arrastrar entre días en un móvil, con la página desplazándose, falla demasiado. Por accesibilidad, **Subir/Bajar** hacen lo mismo que arrastrar.
- **La primera rutina que creas pasa a ser la activa.** Al borrar la activa, no queda ninguna activa.

### Infraestructura

- **Supabase:** proyecto `forja` (región París, `eu-west-3`). Las migraciones se aplicaron con la integración de Supabase: el contenido es el mismo que en `supabase/migrations`, aunque la numeración de versiones en el servidor es distinta.
- **Vercel:** proyecto `forja` conectado al repositorio de GitHub. Cada `push` publica sola la app en <https://forja-gilt-six.vercel.app>. Las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ya están configuradas.

### Diseño visual (desde la 1.3, según las Human Interface Guidelines de Apple)

- **Fondos neutros:** `#F5F5F7` / negro, con tarjetas blancas / `#1C1C1E`.
- **Materiales translúcidos** (desenfoque + saturación) en barras, menús, hojas y avisos:
  - claro: blanco al 70 %;
  - oscuro: negro al 60 %.
- **Bordes finos** (negro al 6 % / blanco al 12 %) y **sombras amplias y suaves** (`0 8px 30px` al 6 %).
- **Esquinas concéntricas:** radio interior = radio exterior − margen. Las tarjetas fijan ambos valores (`<Card size>`) y lo de dentro usa `rounded-concentric`. Las cápsulas (barra inferior, botones) lo cumplen por construcción.
- **Tipografía del sistema:** SF Pro en Apple, con el espaciado de letras de iOS (solo en Apple); Roboto o Segoe en el resto. Escala de iOS: título grande 34, cuerpo 17, nota 13. Números en **SF Pro Rounded**, tabulares, como en la app Fitness.
- **Textos secundarios:**
  - `#6E6E73` en claro, porque `#86868B` no llega a 4,5:1 sobre blanco y en un gimnasio con mucha luz se lee mal;
  - `#86868B` para pistas y textos de ayuda.
- **Color:**
  - el **amarillo** se usa solo en la acción principal de cada pantalla;
  - **verde** = hecho / activo;
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
- Objetivos táctiles de 44 px como mínimo y navegación al alcance del pulgar.

## Pendiente / a vigilar

- **Instrucciones de los ejercicios en español:** pendiente (876 textos). Los nombres ya están traducidos y se pueden revisar en `src/i18n/exercise-names/es.json`.
- **Imágenes del catálogo en nuestro propio almacenamiento** (Supabase Storage) si jsDelivr da problemas.
- **Datos de ejemplo:** las plantillas de rutina cubren la 1.3. Las sesiones de ejemplo (para ver gráficas) llegarán con la 1.6, con un botón para cargarlas y otro para borrarlas.
- **Nombre de una rutina de plantilla:** se guarda en el idioma en el que se creó. Cambiar de idioma no la renombra.
- **Transiciones entre pantallas:** el gesto "atrás" de Android y el botón Volver hacen la animación de volver. En iPhone, la app instalada no tiene gesto de deslizar para volver (limitación de las PWA en iOS).
- **`body_metrics` y `goals`:** las tablas existen, pero no tienen pantallas en la Fase 1.
- **Nombre de usuario ocupado:** hoy aparece como "cambio no aceptado" en Perfil → Sincronización. Antes de abrir al público, comprobar la disponibilidad en directo.
- **Pausa de Supabase gratuito** tras 7 días sin uso. Si molesta, se puede añadir un "ping" diario o pasar a Pro.
- **Fase 3 (público):** ver [`docs/SOCIAL.md`](SOCIAL.md). Incluye dominio propio para el correo, plan Vercel Pro, RGPD, moderación y RLS de lectura pública según `visibility`.
- **Passkeys (Face ID / huella):** Supabase empieza a soportarlas. Serían el login ideal para la app instalada; revisar cuando estén disponibles en el plan gratuito.
