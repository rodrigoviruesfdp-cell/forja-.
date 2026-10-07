# Decisiones y pendientes

Documento vivo: se actualiza en cada entrega.

## Plan de la Fase 1

| # | Entrega | Estado |
|---|---|---|
| 1.1 | Cimientos: app instalable, login, perfil, idioma, unidades, base de datos completa con RLS, sincronización sin conexión | ✅ Hecha |
| 1.2 | Catálogo de ejercicios (free-exercise-db traducido), buscador con filtros, ejercicios propios | Siguiente |
| 1.3 | Constructor de rutinas: semanal o rotación A/B/C/D, deportes fijos, arrastrar o "+", reordenar, duplicar días, varias rutinas | |
| 1.4 | Sesión en vivo: serie en ≤3 toques, "la última vez", calentamiento, notas, PR, offline; tests de 1RM y PR | |
| 1.5 | Otros deportes y calendario mensual con estados y racha | |
| 1.6 | Progresión: gráficas, PR, volumen por músculo, carga semanal | |
| 1.7 | Pulido: rendimiento, accesibilidad, datos de ejemplo, README final | |

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
- **Next.js 16** (Turbopack), **Tailwind 4**, componentes al estilo shadcn/ui escritos a mano sobre Radix (el registro de shadcn no estaba accesible desde el entorno de construcción), **Zod 4**, **Vitest**, **use-intl** para los textos.

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

### Diseño visual

- Superficies grafito (como el suelo de goma del gimnasio) y texto color tiza.
- Los colores siguen el código de los discos de competición y siempre significan algo: **amarillo** = acción principal, **verde** = hecho, **rojo** = récord personal, **azul** = planificado.
- Una sola familia tipográfica (**Archivo**) usando su eje de anchura: condensada y gruesa para números y títulos, normal para leer. Números tabulares.
- Objetivos táctiles de 48 px (mínimo 44 px) y navegación inferior al alcance del pulgar.

## Pendiente / a vigilar

- **Entrega 1.2:** traducir al español los nombres de los ejercicios de free-exercise-db (con un archivo revisable). Las instrucciones quedan en inglés de momento. Las imágenes se sirven desde GitHub; más adelante, copiarlas a Supabase Storage.
- **Datos de ejemplo:** llegarán con rutinas y sesiones (1.3–1.6), con un botón para cargarlos y otro para borrarlos.
- **`body_metrics` y `goals`:** las tablas existen, pero no tienen pantallas en la Fase 1.
- **Aviso de "nueva versión disponible":** ahora la app se actualiza sola al abrirla con conexión. Valorar un aviso para no cambiar de versión a mitad de una sesión.
- **Pausa de Supabase gratuito** tras 7 días sin uso. Si molesta, se puede añadir un "ping" diario o pasar a Pro.
- **Fase 3 (público):** dominio propio para el correo, verificar dominio en Resend, plan Vercel Pro, onboarding y políticas RLS de lectura pública según `visibility`.
- **Passkeys (Face ID / huella):** Supabase empieza a soportarlas. Serían el login ideal para la app instalada; revisar cuando estén disponibles en el plan gratuito.
