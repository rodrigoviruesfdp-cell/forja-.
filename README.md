# Forja

App web instalable (PWA) para registrar entrenamientos de gimnasio y deportes, ver la progresión de pesos y, más adelante, entrenar con un coach IA.

- Funciona **sin conexión**: los datos se guardan primero en el móvil y se sincronizan con Supabase al volver la red.
- Español e inglés, kg y lb, tema oscuro por defecto.
- De momento es **para un solo usuario**: el registro público está desactivado.

> **Estado: Fase 1 terminada (entrega 1.10).** Todo lo que se planificó para la primera versión funciona:
> - el login, el perfil y las preferencias; la app instalable y sin conexión;
> - la **biblioteca de 876 ejercicios**, con buscador, filtros y ejercicios propios;
> - el **constructor de rutinas** (semanal o en rotación A/B/C/D, con deportes) y la pantalla **Hoy**, que te dice qué toca;
> - el **entreno en vivo**: cada serie en uno a tres toques, lo que hiciste la última vez, calentamientos, récords y un resumen al terminar;
> - los **deportes** (también de días pasados) con su spot y lo que cuentan, y el **calendario** con tu racha de semanas;
> - **compartir en Instagram** tus sesiones, rutinas, logros y transformaciones;
> - los **logros** con niveles y los **destacados** bajo tu perfil;
> - el **progreso**: gráficas por semana, series por músculo, la evolución de cada ejercicio y tus récords;
> - las **fotos de progreso**, privadas, con comparador de antes y después;
> - **datos de ejemplo** para ver la app llena sin tocar los tuyos;
> - diseño al estilo de iOS, revisado para que se lea bien y se toque fácil (contraste y botones de 44 pt).
>
> Lo siguiente: la **Fase 2** (coach IA, solo cuando la pidas) y la **Fase 3** (amigos por invitación). El plan y todas las decisiones están en [docs/DECISIONES.md](docs/DECISIONES.md); la parte social en [docs/SOCIAL.md](docs/SOCIAL.md) y los logros en [docs/LOGROS.md](docs/LOGROS.md).
>
> **Tu instalación ya está hecha:** proyecto Supabase `forja`, proyecto Vercel `forja` y app en <https://forja-gilt-six.vercel.app>. Los pasos 2 a 7 sirven solo si alguna vez hay que montarlo desde cero.

---

## Índice

1. [Qué necesitas](#1-qué-necesitas)
2. [Crear el proyecto en Supabase](#2-crear-el-proyecto-en-supabase)
3. [Crear las tablas (migraciones)](#3-crear-las-tablas-migraciones)
4. [Configurar el acceso (solo tu cuenta)](#4-configurar-el-acceso-solo-tu-cuenta)
5. [Correo con código (recomendado)](#5-correo-con-código-recomendado)
6. [Publicar la app en Vercel](#6-publicar-la-app-en-vercel)
7. [Decirle a Supabase cuál es tu web](#7-decirle-a-supabase-cuál-es-tu-web)
8. [Instalar la app en el móvil](#8-instalar-la-app-en-el-móvil)
9. [Guía de uso](#9-guía-de-uso)
10. [Entrega 1.10: cómo probarla](#10-entrega-110-cómo-probarla)
11. [Problemas frecuentes](#11-problemas-frecuentes)
12. [Actualizar la app más adelante](#12-actualizar-la-app-más-adelante)
13. [Para desarrolladores](#13-para-desarrolladores)
14. [Licencias y créditos](#14-licencias-y-créditos)

Tiempo estimado la primera vez: **30–40 minutos**, aunque tu instalación ya está hecha. No necesitas instalar nada en tu ordenador: todo se hace desde el navegador.

---

## 1. Qué necesitas

| Cuenta | Para qué | Coste |
|---|---|---|
| GitHub (ya la tienes) | Guarda el código | Gratis |
| [Supabase](https://supabase.com) | Base de datos y login | Plan gratuito |
| [Vercel](https://vercel.com) | Publica la web | Plan gratuito (Hobby) |
| [Resend](https://resend.com) *(opcional, recomendado)* | Envía el correo con el código de acceso | Plan gratuito |

Dos avisos sobre los planes gratuitos:

- **Supabase pausa los proyectos gratuitos tras 7 días sin uso.** No se pierde nada: entras en el panel y pulsas *Restore*. Mientras tanto la app sigue funcionando en el móvil y sincroniza al reactivarlo.
- **El plan Hobby de Vercel es solo para uso no comercial.** Para abrir la app al público con pagos habrá que pasar a Pro.

## 2. Crear el proyecto en Supabase

1. Entra en <https://supabase.com> y pulsa **Start your project**. Regístrate con GitHub, que es lo más rápido.
2. Pulsa **New project**:
   - **Name:** `forja`, o el nombre que quieras.
   - **Database password:** pulsa *Generate a password* y **guárdala** en tu gestor de contraseñas.
   - **Region:** la más cercana. Desde España, *West EU (Paris)* o *Central EU (Frankfurt)*.
3. Pulsa **Create new project** y espera 1–2 minutos.

## 3. Crear las tablas (migraciones)

Las tablas y sus reglas de seguridad están en la carpeta [`supabase/migrations`](supabase/migrations). Se aplican pegándolas en el editor SQL de Supabase, **en orden**:

| Orden | Archivo | Qué hace |
|---|---|---|
| 1 | `20261007000100_core_schema.sql` | Crea todas las tablas |
| 2 | `20261007000200_rls.sql` | Activa la seguridad: cada usuario solo ve sus datos |
| 3 | `20261007000300_profiles_on_signup.sql` | Crea tu perfil automáticamente |
| 4 | `20261008000100_profile_public_identity.sql` | Nombre de usuario y datos públicos para la futura comunidad |
| 5 | `20261008000200_fk_indexes.sql` | Índices para que las consultas sigan siendo rápidas |
| 6 | `20261008000300_sport_keys.sql` | Guarda los deportes como códigos (1.4) |
| 7 | `20261009000100_places_and_sport_metrics.sql` | Spots y datos de cada deporte (1.5) |
| 8 | `20261010000100_user_achievements.sql` | Logros conseguidos (1.7) |
| 9 | `20261011000100_media.sql` | Fotos de progreso y su carpeta privada (1.9) |

Para cada archivo:

1. En GitHub, abre el archivo y pulsa el botón **Copy raw file** (el icono de copiar, arriba a la derecha del código).
2. En Supabase, menú izquierdo **SQL Editor**, y luego **New query**.
3. Pega el contenido y pulsa **Run**. Tiene que aparecer *Success. No rows returned*.

Si algún archivo da error, no sigas con el siguiente: copia el mensaje y pásamelo.

**Cargar el catálogo de ejercicios** (una vez). Necesitas el [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) o pedírmelo:

```bash
npx supabase login
npx supabase functions deploy seed-catalog --project-ref <tu-project-ref>
```

Después abre `https://<tu-project-ref>.supabase.co/functions/v1/seed-catalog` con la cabecera de tu clave *anon*, o pide que la ejecute por ti. Responde `{"ok":true,"total":876,...}`. Se puede repetir sin problema: solo escribe lo que haya cambiado.

## 4. Configurar el acceso (solo tu cuenta)

**a) Cerrar el registro público**

1. Ve a **Authentication → Sign In / Providers** (en algunas versiones, *Authentication → Settings*).
2. Desactiva **Allow new users to sign up** y guarda.
3. En la misma página, comprueba que el proveedor **Email** está activado.

**b) Crear tu usuario**

1. Ve a **Authentication → Users → Add user → Create new user**.
2. Escribe tu email y una contraseña, y marca **Auto Confirm User**.
3. Guarda. La contraseña sirve como plan B para entrar si el correo tarda.

**c) Copiar las claves**

1. Pulsa el botón **Connect** (arriba) o ve a **Project Settings → API Keys**.
2. Apunta dos datos:
   - **Project URL**: algo como `https://abcdefghijklmnop.supabase.co`.
   - **Publishable key**: empieza por `sb_publishable_…`.

> No uses nunca la clave **secret** (`sb_secret_…`) en la app ni la compartas. La publishable sí es pública por diseño: tus datos los protege RLS.

## 5. Correo con código (recomendado)

**Por qué hace falta:** en iPhone, el enlace del correo se abre en Safari y no dentro de la app instalada, así que la sesión no llega a la app. La solución es que el correo incluya un **código de 6 dígitos** que escribes en la app.

Desde junio de 2026, los proyectos gratuitos nuevos de Supabase no pueden cambiar la plantilla del correo con el servidor de correo de Supabase. Ese correo trae solo el enlace y tiene un límite de 2 envíos por hora. Para añadir el código hay que usar un servidor de correo propio, y Resend es gratis.

1. Crea una cuenta en <https://resend.com> **con el mismo email con el que vas a entrar en la app**.
2. Ve a **API Keys → Create API Key**, ponle un nombre (por ejemplo, `supabase`) y copia la clave (`re_…`).
3. En Supabase, ve a **Authentication → Emails → SMTP Settings**, activa **Enable custom SMTP** y rellena:
   - **Sender email:** `onboarding@resend.dev`
   - **Sender name:** `Forja`
   - **Host:** `smtp.resend.com`
   - **Port:** `465`
   - **Username:** `resend`
   - **Password:** la clave `re_…`
4. Guarda. Después ve a **Authentication → Emails → Templates → Magic Link**:
   - **Subject:** `Tu código de acceso / Your sign-in code`
   - **Body:** pega el contenido de [`supabase/templates/magic_link.html`](supabase/templates/magic_link.html).
5. Guarda.

> Con `onboarding@resend.dev` Resend solo puede enviar al email de tu propia cuenta de Resend. Para una app de un solo usuario es perfecto. Cuando abras la app al público habrá que verificar un dominio propio.

**Si prefieres no configurarlo ahora:** el login funciona igual con el enlace del correo si abres la web en el navegador. En la app instalada de iPhone, usa **Entrar con contraseña**.

## 6. Publicar la app en Vercel

1. Entra en <https://vercel.com> y regístrate con **GitHub**.
2. Pulsa **Add New… → Project** e importa el repositorio `prueba.claude-`. Si no aparece, pulsa *Adjust GitHub App Permissions* y dale acceso.
3. Vercel detecta Next.js solo. Despliega **Environment Variables** y añade estas dos variables con los valores del paso 4c:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | tu Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | tu publishable key |

4. Pulsa **Deploy** y espera 1–2 minutos. Vercel te dará una dirección como `https://prueba-claude-xxxx.vercel.app`: esa es tu app.
5. **Rama de producción:** el código está ahora en la rama `claude/hopeful-gauss-i3sqql`. Comprueba en **Settings → Environments → Production → Branch Tracking** (o *Settings → Git*) que la rama de producción es esa. Si no, cámbiala y vuelve a desplegar desde **Deployments → ⋯ → Redeploy**.

> Si al abrir la app ves "Falta conectar Supabase", las variables no están bien puestas. Revísalas en **Settings → Environment Variables** y vuelve a desplegar: las variables solo se aplican en un despliegue nuevo.

## 7. Decirle a Supabase cuál es tu web

Para que el enlace del correo lleve a tu app:

1. En Supabase, ve a **Authentication → URL Configuration**.
2. **Site URL:** tu dirección de Vercel, por ejemplo `https://prueba-claude-xxxx.vercel.app`.
3. **Redirect URLs → Add URL:** la misma dirección terminada en `/auth/confirm`, por ejemplo `https://prueba-claude-xxxx.vercel.app/auth/confirm`.
4. Guarda.

## 8. Instalar la app en el móvil

**iPhone (Safari):**
1. Abre tu dirección de Vercel en **Safari**. Tiene que ser Safari: en Chrome de iPhone no aparece la opción.
2. Pulsa **Compartir** (el cuadrado con la flecha hacia arriba).
3. Pulsa **Añadir a pantalla de inicio** y después **Añadir**.

**Android (Chrome):**
1. Abre tu dirección en **Chrome**.
2. Pulsa el menú **⋮** y después **Instalar aplicación** (o *Añadir a pantalla de inicio*).

A partir de ahí, abre siempre la app desde el icono **Forja**. La primera vez descarga tus datos; después abre al instante, también sin cobertura.

## 9. Guía de uso

### Primeros pasos

1. **Entra** con tu email: pulsa **Enviar código** y escribe el código del correo, o usa **Entrar con contraseña**.
2. **Perfil** (tu inicial, arriba a la derecha): idioma, **kg o lb**, tema (oscuro, claro o el del sistema), tu nombre, objetivo y nivel.
3. **Rutinas:** empieza con una plantilla (**Usar**) o crea la tuya con el **+**.
4. ¿Quieres ver la app llena antes de tener semanas de entrenos? **Perfil → Datos de ejemplo** (ver más abajo).

El punto sobre tu inicial dice cómo va la sincronización: **✓ verde**, todo guardado; **nube tachada**, sin conexión (se sube después).

### Hoy

- Te dice **qué toca hoy** según tu rutina, con sus ejercicios, y lo siguiente ("Después · mañana").
- **Empezar entreno** abre el entreno del día. **Saltar hoy** lo marca como saltado (en una rotación, ese día pasa al siguiente día de entreno).
- **Entrenar otro día** elige otro día de la rutina o un entreno libre. **Registrar deporte** apunta un deporte.
- Lo que ya has hecho hoy aparece como **Hecho hoy**: tócalo para verlo o corregirlo.

### El entreno en vivo

- Cada ejercicio trae sus series. **Un toque** en el círculo registra la serie propuesta; tocando la fila cambias peso y repeticiones (botones **− / +** o escribiendo).
- **Última vez** enseña lo que hiciste; **Copiar** lo rellena.
- **Calentamiento:** actívalo en la hoja de la serie. No cuenta para el objetivo, el volumen ni los récords.
- **Récords (PR):** si levantas más que nunca o mejoras tu 1RM estimado, aparece **¡Récord!**. La primera vez que haces un ejercicio no hay récords: no hay con qué comparar.
- El **⋯** de cada ejercicio: notas, cambiarlo por otro, moverlo, quitarlo. **Añadir ejercicio** al final.
- **Terminar** enseña el resumen (duración, volumen, series y récords) y te deja marcar el esfuerzo de 1 a 10. Si sales a medio entreno, una cápsula encima de la barra te devuelve a él.

### Deportes y spots

- **Registrar deporte:** el deporte (o uno escrito por ti), la duración, el esfuerzo y, según el deporte, sus datos: **olas** en surf, **asaltos** en boxeo, **vías** en escalada, **distancia** en running, bici, natación…
- **Spot o lugar:** escríbelo la primera vez; luego aparece en la lista. Con otras mayúsculas o sin tildes no se duplica.
- Se pueden apuntar **días pasados** (desde el calendario).

### Calendario y racha

- **Racha:** semanas seguidas en las que llegas a tu objetivo de sesiones (gimnasio y deportes juntos). La semana en curso no la rompe.
- Cada día: **puntos verdes** (hecho), **círculos azules** (lo que planifica tu rutina) o una **raya gris** (saltado). Toca un día para ver lo que hiciste o añadir un deporte.

### Rutinas

- **Semanal** (cada día de la semana tiene lo suyo) o **rotación** (A, B, C, D… uno detrás de otro en tus días de entreno), con deportes fijos en un día.
- Toca un ejercicio para cambiar series y repeticiones (fijas o en rango). Arrastra el asa ⠿ para reordenar; **Ordenar** cambia el orden de los días.
- El **⋯** de la rutina: cambiar el nombre, duplicarla, hacerla activa, compartirla o eliminarla.

### Biblioteca de ejercicios

- **Rutinas → Biblioteca de ejercicios:** 876 ejercicios con fotos. El buscador entiende español e inglés, con o sin tildes.
- Filtros por **músculo** y **material**; **Mis ejercicios** muestra los tuyos (créalos con el **+**).
- En un ejercicio que ya hayas hecho, **Ver mi progreso**.

### Progreso

- Arriba eliges el **periodo** (4 semanas, 3 meses, 1 año o todo).
- **Entrenamiento por semana:** gimnasio en azul y deporte en naranja; toca una columna para ver esa semana. **Carga** = minutos × esfuerzo.
- **Series por músculo**, **Ejercicios** (cada uno con su gráfica de 1RM estimado, peso, volumen o repeticiones), **Últimos récords** y **Deportes**.
- **Ver datos** enseña cualquier gráfica como tabla.

### Fotos de progreso

- **Progreso → Fotos de progreso → +**: haz la foto o elígela del carrete, con fecha, postura y peso corporal (opcional).
- **Comparar:** deslizando una línea entre antes y después, o lado a lado; abajo, el tiempo que ha pasado y el cambio de peso.
- **Privadas:** se guardan en una carpeta de tu cuenta que nadie más puede ver; el móvil las reduce y les quita la ubicación GPS antes de subirlas. **Eliminar** las borra del móvil y de tu cuenta.

### Logros y destacados

- Medallas con niveles (bronce, plata, oro, platino, diamante) que se consiguen entrenando. Al conseguir una sale la animación **¡Logro conseguido!**
- Bajo tu nombre, en **Perfil**, la fila de **destacados**: tus últimos logros o los que elijas con **Destacar** (hasta 8). **Todos** abre la lista completa, con lo que falta para cada nivel.

### Compartir en Instagram

- Desde un entreno terminado, un deporte, una rutina, un logro o una comparación de fotos: **Compartir**.
- Estilos: **Foto** (tu foto con los datos encima), **Fondo** (oscuro) o **Pegatina** (fondo transparente). Luego **Instagram → Historia**, o **Guardar imagen** y elegirla desde el carrete.
- La imagen se hace en tu móvil: tus fotos no se suben a ningún sitio.

### Datos de ejemplo

- **Perfil → Datos de ejemplo → Probar con datos de ejemplo:** la app se llena con 12 semanas de entrenos inventados (una rutina A/B/C/D con fútbol, surf en dos spots, carreras y tu peso bajando), con sus récords, logros, racha y gráficas.
- **Tus datos no se tocan y no se sube nada:** es una copia aparte que solo vive en ese móvil. Mientras estás en ella, una cápsula **Datos de ejemplo · Salir** lo recuerda encima de la barra.
- **Salir** te devuelve a tus datos y borra el ejemplo (también lo que hayas hecho dentro).

### Sin conexión y varios móviles

- Todo funciona en **modo avión**: se guarda en el móvil y se sube al volver la red. Las fotos y las imágenes del catálogo que ya has visto también se ven sin red.
- Si entras con tu cuenta en otro móvil o en el ordenador, todo aparece allí. Si cambias lo mismo en dos sitios a la vez, gana el último cambio.

## 10. Entrega 1.10: cómo probarla

1. **Actualizar la app.** Ábrela con conexión y toca **Actualizar** en el aviso de arriba.
2. **Datos de ejemplo:**
   - **Perfil → Datos de ejemplo → Probar con datos de ejemplo** y confirma.
   - En unos segundos estás en **Hoy** con la rutina de ejemplo; abajo, la cápsula **Datos de ejemplo · Salir**.
   - Recorre **Progreso** (gráficas de 12 semanas, récords), **Calendario** (racha), un ejercicio (por ejemplo *Press de banca*) y tu **Perfil** (destacados).
   - Puedes empezar un entreno: no se guarda en tu cuenta.
   - Toca la cápsula → **Salir**: vuelves a tus datos, tal como estaban.
3. **Rapidez:** cierra la app del todo y ábrela: **Hoy** tiene que salir al momento, ya con lo que toca. Los datos de otros móviles llegan un segundo después (la app enseña primero lo que tiene y luego sincroniza).
4. **Más fácil de leer y de tocar:**
   - En **tema claro**, el azul de los botones de texto es un poco más oscuro y los grises algo más marcados (siguen el modo "Aumentar contraste" de Apple).
   - Los botones pequeños (el periodo de Progreso, los deportes y duraciones al registrar un deporte, la **✕** de las hojas, los días L M X…) responden en un área de al menos 44 pt aunque se dibujen más pequeños.
   - La barra de abajo es algo menos transparente, para que se lea encima de cualquier cosa.

## 11. Problemas frecuentes

| Qué pasa | Qué hacer |
|---|---|
| La app dice **"Falta conectar Supabase"** | Las variables de Vercel no están bien puestas: revisa el paso 6 y vuelve a desplegar. |
| **No llega el correo** con el código | Mira en spam. Sin servidor de correo propio (paso 5), Supabase solo envía 2 correos por hora. Mientras tanto, **Entrar con contraseña**. |
| La **nube tachada** no se va aunque tengas conexión | Supabase pausa los proyectos gratuitos tras 7 días sin uso: entra en su panel y pulsa **Restore**. No se pierde nada; al volver, se sube solo. |
| **Perfil** muestra **"Cambios que el servidor no aceptó"** | El servidor rechazó ese dato (por ejemplo, un nombre de usuario ya cogido). **Descartar** recupera lo que hay en el servidor. |
| No aparece el aviso de **versión nueva** | Cierra la app del todo (en iPhone, desliza hacia arriba desde el multitarea) y ábrela con conexión. |
| Te has quedado en los **datos de ejemplo** | Toca la cápsula **Datos de ejemplo · Salir** o ve a **Perfil → Salir de los datos de ejemplo**. |
| En iPhone, el enlace del correo **abre Safari y no la app** | Es una limitación de las apps web en iPhone: usa el **código de 6 dígitos** (paso 5) o la contraseña. |

## 12. Actualizar la app más adelante

Cada vez que suba una entrega nueva a GitHub, **Vercel la publica sola** en 1–2 minutos. La próxima vez que abras la app con conexión verás arriba **"Hay una versión nueva de la app · Actualizar"**. Nunca se recarga sola en mitad de un entreno.

Si una entrega trae una migración nueva (un archivo nuevo en `supabase/migrations`), te lo diré y tendrás que pegarla en el SQL Editor como en el paso 3.

## 13. Para desarrolladores

Requisitos: Node 20.9+ (probado con 22) y Docker (solo para el Supabase local).

```bash
npm install
npx supabase start          # Supabase local (Postgres, Auth, correo de pruebas en http://127.0.0.1:54324)
cp .env.example .env.local  # y pon la URL/clave que imprime `supabase start`
npm run dev                 # http://localhost:3000
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (el service worker está desactivado en dev) |
| `npm run build && npm start` | Producción local (con service worker y modo offline) |
| `npm run check` | Lint + tipos + tests |
| `npm test` | Tests unitarios (Vitest) |
| `npm run test:db` | Tests de seguridad RLS (pgTAP) contra el Supabase local |
| `npx supabase db reset` | Recrea la base de datos local con las migraciones |
| `npm run icons` | Regenera los iconos de la PWA |
| `npm run seed:catalog` | Carga/actualiza el catálogo de ejercicios (necesita `SUPABASE_URL` y `SUPABASE_SECRET_KEY`) |

Test de integración de la sincronización contra el Supabase local:

```bash
SUPABASE_TEST_URL=http://127.0.0.1:54321 SUPABASE_TEST_KEY=<publishable> SUPABASE_TEST_SECRET=<secret> npm test
```

**Estructura:**

```
src/
  app/            Rutas de Next.js: solo montan pantallas
  features/       Pantallas y hooks por funcionalidad (achievements, auth, calendar, photos, profile, progress, routines, session, share, sports, shell…)
  domain/         Lógica pura con tests: unidades, esquemas (Zod), búsqueda, rutinas y plan del día, sesiones, 1RM y récords, deportes, spots, calendario y racha, qué datos lleva cada imagen para compartir, el motor de logros, las cifras de progreso, el generador de datos de ejemplo… Sin React ni Supabase
  data/
    local/        Base de datos del móvil (IndexedDB con Dexie)
    sync/         Motor de sincronización (cola de cambios + descarga incremental)
    media/        Fotos: prepararlas en el móvil y subirlas, bajarlas y borrarlas de Storage
    demo/         Datos de ejemplo: una base de datos aparte que nunca se sincroniza
    repositories/ Única forma de escribir datos desde la UI
    supabase/     Cliente de Supabase
  i18n/           Textos en español e inglés, y nombres traducidos del catálogo (exercise-names/)
  components/ui/  Componentes base al estilo iOS (botones, tarjetas, listas agrupadas, hojas con vaul, avisos con sonner…)
  components/motion/ Muelle común, pulsación y entradas escalonadas (Motion)
  service-worker/ Service worker (Serwist): caché de la app para usarla sin conexión
supabase/
  migrations/     Esquema SQL y políticas RLS
  tests/          Tests de RLS (pgTAP)
  templates/      Plantilla del correo de acceso
  functions/      Edge Function que carga el catálogo de ejercicios
docs/DECISIONES.md  Decisiones tomadas y pendientes
docs/SOCIAL.md      Diseño de la futura Comunidad
docs/LOGROS.md      Diseño de los logros y destacados
```

## 14. Licencias y créditos

- Tipografía del sistema: **SF Pro** en iPhone, iPad y Mac; Roboto o Segoe UI en el resto. No se descarga ninguna fuente.
- **Motion** (animaciones), **vaul** (hojas inferiores) y **sonner** (avisos), licencia MIT.
- Iconos **Lucide**, licencia ISC.
- Catálogo de ejercicios e imágenes: [free-exercise-db](https://github.com/yuhonas/free-exercise-db), de dominio público (*Unlicense*), servido por jsDelivr. Nombres traducidos al español para esta app. Se cita también en la ficha de cada ejercicio.
