# Forja

App web instalable (PWA) para registrar entrenamientos de gimnasio y deportes, ver la progresión de pesos y, más adelante, entrenar con un coach IA.

- Funciona **sin conexión**: los datos se guardan primero en el móvil y se sincronizan con Supabase al volver la red.
- Español e inglés, kg y lb, tema oscuro por defecto.
- De momento es **para un solo usuario**: el registro público está desactivado.

> **Estado: entrega 1.2.** Ya funcionan:
> - el login, el perfil y las preferencias;
> - la sincronización sin conexión y la app instalable;
> - la **biblioteca de 876 ejercicios**, con buscador, filtros y ejercicios propios;
> - la base de la futura **Comunidad**.
>
> Calendario y Progreso son de momento un aviso de "próximamente". El plan completo está en [docs/DECISIONES.md](docs/DECISIONES.md) y el de la parte social en [docs/SOCIAL.md](docs/SOCIAL.md).
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
9. [Cómo probar las entregas](#9-cómo-probar-las-entregas)
10. [Actualizar la app más adelante](#10-actualizar-la-app-más-adelante)
11. [Para desarrolladores](#11-para-desarrolladores)
12. [Licencias y créditos](#12-licencias-y-créditos)

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

## 9. Cómo probar las entregas

### Entrega 1.2: biblioteca de ejercicios y base de la Comunidad

1. **Actualizar la app.** Esta vez, cierra la app del todo (deslízala fuera de las apps abiertas) y vuelve a abrirla. Si sigues viendo la versión anterior, repítelo una vez más.
   - A partir de esta versión, cuando haya una nueva verás abajo **"Hay una versión nueva · Actualizar"**.
2. **Navegación:** abajo verás **Hoy, Calendario, Rutinas, Progreso y Comunidad**. **Perfil** se abre desde el círculo con tu inicial, arriba a la derecha.
3. **Rutinas → Biblioteca de ejercicios:** tiene que poner 876 ejercicios. La primera vez que se abre tras actualizar, el móvil descarga el catálogo (unos segundos).
4. **Buscador:** prueba `sentadilla`, `press banca`, `squat` (en inglés también vale), `gluteos` (sin tilde) o `curl mancuernas`. Los resultados aparecen al escribir.
5. **Filtros:** toca **Músculo** y elige *Bíceps*; luego **Material** y elige *Mancuernas*. Entra en un ejercicio y vuelve: el filtro sigue puesto.
6. **Ficha de un ejercicio:**
   - las dos fotos se alternan y muestran el movimiento;
   - se ven el músculo principal, los secundarios, el material y los pasos;
   - las instrucciones del catálogo aún están en inglés.
7. **Ejercicio propio:**
   1. Pulsa el botón amarillo **+**.
   2. Si guardas sin rellenar, te avisa de lo que falta.
   3. Crea por ejemplo "Hip thrust en máquina" con músculo principal *Glúteos*.
   4. Después, edítalo y bórralo.
   5. El filtro **Mis ejercicios** muestra solo los tuyos.
8. **Comunidad:**
   1. Mira la pantalla de "Próximamente".
   2. Ve a tu perfil y reserva tu **nombre de usuario**: escribe `@tunombre` y pulsa Intro.
   3. Vuelve a Comunidad: verás "Tu nombre público será @tunombre".
9. **Sin conexión:** en modo avión, abre la biblioteca y busca. Funciona igual. Las fotos que ya hayas visto también se ven sin red.

### Entrega 1.1: login, perfil y modo sin conexión

1. **Entrar:** abre la app instalada, escribe tu email y pulsa **Enviar código**. Escribe el código del correo, o usa **Entrar con contraseña**.
   - Si pruebas con un email que no es el tuyo, tiene que decirte que esa cuenta no existe.
2. **Pantalla Hoy:** te saluda con tu nombre y la fecha. El ✓ verde de arriba a la derecha significa "todo guardado en el servidor".
3. **Perfil:**
   - Cambia el **idioma** a English: toda la app cambia al momento.
   - Cambia **kg / lb**. De momento solo se guarda; se notará cuando registres pesos (entrega 1.4).
   - Prueba los temas **Oscuro, Claro y Sistema**.
   - Rellena nombre, objetivo, nivel y lesiones.
4. **Sin conexión:**
   - Activa el **modo avión**, cambia el nivel y **cierra y vuelve a abrir la app**. Tiene que abrir igual, con el cambio hecho, y el icono de arriba a la derecha tiene que mostrar una nube tachada.
   - Quita el modo avión. En unos segundos vuelve el ✓ verde.
   - En Supabase, **Table Editor → profiles**, verás el cambio guardado.
5. **Otro dispositivo:** entra desde el ordenador y cambia el idioma. Al abrir la app en el móvil, también cambia.
6. **Cerrar sesión:** en **Perfil**. Si hubiera cambios sin subir, la app te avisa antes.

## 10. Actualizar la app más adelante

Cada vez que suba una entrega nueva a GitHub, **Vercel la publica sola** en 1–2 minutos. La app instalada se actualiza la siguiente vez que la abras con conexión.

Si una entrega trae una migración nueva (un archivo nuevo en `supabase/migrations`), te lo diré y tendrás que pegarla en el SQL Editor como en el paso 3.

## 11. Para desarrolladores

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
  features/       Pantallas y hooks por funcionalidad (auth, profile, shell…)
  domain/         Lógica pura con tests: unidades, esquemas (Zod), búsqueda de ejercicios… Sin React ni Supabase
  data/
    local/        Base de datos del móvil (IndexedDB con Dexie)
    sync/         Motor de sincronización (cola de cambios + descarga incremental)
    repositories/ Única forma de escribir datos desde la UI
    supabase/     Cliente de Supabase
  i18n/           Textos en español e inglés, y nombres traducidos del catálogo (exercise-names/)
  components/ui/  Componentes base (estilo shadcn/ui)
  service-worker/ Service worker (Serwist): caché de la app para usarla sin conexión
supabase/
  migrations/     Esquema SQL y políticas RLS
  tests/          Tests de RLS (pgTAP)
  templates/      Plantilla del correo de acceso
  functions/      Edge Function que carga el catálogo de ejercicios
docs/DECISIONES.md  Decisiones tomadas y pendientes
docs/SOCIAL.md      Diseño de la futura Comunidad
```

## 12. Licencias y créditos

- Tipografía **Archivo** (Omnibus-Type), licencia SIL Open Font License 1.1, vía Fontsource.
- Iconos **Lucide**, licencia ISC.
- Catálogo de ejercicios e imágenes: [free-exercise-db](https://github.com/yuhonas/free-exercise-db), de dominio público (*Unlicense*), servido por jsDelivr. Nombres traducidos al español para esta app. Se cita también en la ficha de cada ejercicio.
