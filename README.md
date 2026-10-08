# Forja

App web instalable (PWA) para registrar entrenamientos de gimnasio y deportes, ver la progresión de pesos y, más adelante, entrenar con un coach IA.

- Funciona **sin conexión**: los datos se guardan primero en el móvil y se sincronizan con Supabase al volver la red.
- Español e inglés, kg y lb, tema oscuro por defecto.
- De momento es **para un solo usuario**: el registro público está desactivado.

> **Estado: entrega 1.7.** Ya funcionan:
> - el login, el perfil y las preferencias;
> - la sincronización sin conexión y la app instalable;
> - la **biblioteca de 876 ejercicios**, con buscador, filtros y ejercicios propios;
> - el **constructor de rutinas**: semanal o en rotación A/B/C/D, con deportes, y la pantalla **Hoy** que te dice qué toca;
> - el **registro del entreno en vivo**: cada serie en uno a tres toques, lo que hiciste la última vez, calentamientos, récords y un resumen al terminar;
> - los **deportes** (también de días pasados) con su spot y lo que cuentan (olas, asaltos, vías…), y el **calendario** con tu racha de semanas;
> - **compartir en Instagram**: una imagen de tu sesión (con tu foto y los datos encima, o sobre fondo oscuro), una pegatina transparente y la imagen de tu rutina;
> - los **logros**: medallas con niveles que se consiguen entrenando, una animación al desbloquearlas y una fila de **destacados** bajo tu perfil, como en Instagram;
> - el **nuevo diseño** al estilo de iOS (materiales translúcidos, animaciones con muelle, hojas que se arrastran);
> - la base de la futura **Comunidad**.
>
> Progreso es de momento un aviso de "próximamente". El plan completo está en [docs/DECISIONES.md](docs/DECISIONES.md) y el de la parte social en [docs/SOCIAL.md](docs/SOCIAL.md) y el de los logros en [docs/LOGROS.md](docs/LOGROS.md).
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
| 6 | `20261008000300_sport_keys.sql` | Guarda los deportes como códigos (1.4) |
| 7 | `20261009000100_places_and_sport_metrics.sql` | Spots y datos de cada deporte (1.5) |
| 8 | `20261010000100_user_achievements.sql` | Logros conseguidos (1.7) |

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

### Entrega 1.7: logros y destacados

1. **Actualizar la app.** Ábrela con conexión y toca **Actualizar** en el aviso de arriba.
2. **Lo que ya hiciste cuenta.** Al abrirla (con conexión), la app repasa tus sesiones. Si ya cumples algún logro (por ejemplo **Primera piedra**, tu primera sesión), aparece la animación **¡Logro conseguido!** con la medalla. Toca **Siguiente** para ver el próximo, **Seguir** para cerrar o **Ver** para abrirlo.
3. **Destacados en tu perfil:** toca tu inicial arriba a la derecha (Perfil). Bajo tu nombre está la fila de círculos:
   - sin elegir nada, salen tus 5 últimos logros;
   - un **anillo de color** marca los que aún no has abierto;
   - el último círculo, **Todos**, abre la lista completa.
4. **Ver un logro:** toca un círculo. Se abre a pantalla completa, como una historia:
   - la medalla y su nivel (bronce, plata, oro, platino, diamante);
   - **cuándo** lo conseguiste y **con qué sesión**;
   - lo que falta para el siguiente nivel (por ejemplo **10 / 50** sesiones de gimnasio);
   - toca los lados o desliza para pasar al siguiente; desliza hacia abajo o toca **✕** para cerrar.
5. **Destacar:** en un logro conseguido, **Destacar**. Desde ese momento tu perfil enseña solo los que destaques (hasta 8), en el orden en que los elegiste. **Destacado** otra vez lo quita.
6. **Todos los logros:** conseguidos, **en progreso** (con su barra) y **secretos** (salen como "?" hasta que los consigues).
7. **Al terminar un entreno o guardar un deporte**, si consigues un logro o subes de nivel, la animación sale en ese momento.
8. **Compartir un logro:** en el logro, **Compartir**. Igual que con las sesiones: con tu foto, sobre fondo oscuro o como pegatina cuadrada.
9. **Sin conexión:** todo funciona igual; los logros se suben al volver la red y no se duplican aunque uses dos móviles.

Los logros son un primer borrador para pulirlos juntos: la lista está en [docs/LOGROS.md](docs/LOGROS.md).

### Entrega 1.6: compartir en Instagram

1. **Actualizar la app.** Ábrela con conexión y toca **Actualizar** en el aviso de arriba.
2. **Desde un deporte:** en **Hoy** toca un deporte hecho (por ejemplo, el surf) y, en su hoja, **Compartir**.
3. **Desde un entreno de gimnasio:** al terminarlo, en el resumen, **Compartir** (o el icono de compartir arriba a la derecha; también desde el calendario, abriendo ese día).
4. **Elige el estilo** arriba:
   - **Foto:** elige una foto de tu carrete (o hazla en el momento). Los datos aparecen encima, abajo, como en Strava. **Cambiar foto** para probar otra.
   - **Fondo:** los datos sobre un fondo oscuro con el amarillo de Forja.
   - **Pegatina:** solo los datos, con el fondo transparente, para ponerlos encima de una historia que ya tengas.
   - **Mostrar dónde** quita o pone el spot o lugar.
5. **Compartir:** se abre el menú del móvil. Elige **Instagram → Historia**. Si Instagram no aparece, toca **Guardar imagen** y elígela desde el carrete al crear la historia.
6. **Pegatina (experimental):** toca **Copiar pegatina**, abre una historia en Instagram con tu foto y pégala (mantén el dedo en la pantalla → **Pegar**, o el botón de pegatina). Si no se pega, **Guardar imagen** y añádela desde el carrete.
7. **Tu rutina:** en **Rutinas**, abre una y toca **⋯** (arriba a la derecha) → **Compartir rutina**. La imagen lleva los días (letras A, B, C… o los días de la semana) y sus ejercicios.
8. **Sin conexión:** todo funciona igual en modo avión. La imagen se hace en tu móvil: **tu foto no se sube a ningún sitio**.

### Entrega 1.5: deportes, spots y calendario

1. **Actualizar la app.** Ábrela con conexión y toca **Actualizar** en el aviso de arriba.
2. **Registrar un deporte:** en **Hoy**, **Registrar deporte**.
   - Elige el deporte (o escribe uno que no esté).
   - Duración con los atajos (30, 45, 60, 90, 120 min) o escrita.
   - Según el deporte, aparecen sus datos: **olas** en surf, **asaltos** en boxeo, **vías y bloques** en escalada, **distancia** en running, bici, natación…
   - **Spot** (o lugar): escribe "Zurriola" la primera vez; las siguientes aparece en la lista para tocarlo. Escribirlo igual con otras mayúsculas o sin tildes no lo duplica.
   - Esfuerzo de 1 a 10 y notas, opcionales. **Guardar**.
3. En **Hoy** aparece **Hecho hoy · Surf · 1 h 30 min · 14 olas · Zurriola**. Tócalo para corregirlo o eliminarlo (con **Deshacer**).
4. **Un deporte de la rutina:** si hoy toca (por ejemplo, fútbol los miércoles), su tarjeta tiene **Registrar fútbol**, que abre la hoja ya rellenada.
5. **Saltar un día:** en la tarjeta de lo que toca, **Saltar hoy**. Queda como **Saltado hoy** (con **Deshacer**). En una rotación, ese día no se pierde: pasa al siguiente día de entreno.
6. **Calendario** (pestaña de abajo):
   - **Racha:** semanas seguidas en las que llegas a tu objetivo de sesiones (gimnasio y deportes juntos). El anillo es la semana actual.
   - Cada día lleva **puntos verdes** (hecho), **círculos azules** (lo que planifica tu rutina, de hoy en adelante) o una **raya gris** (saltado).
   - Cambia de mes con las flechas o deslizando. **Hoy** te devuelve al mes actual.
   - **Toca un día** para ver lo que hiciste: un entreno de gimnasio abre su resumen; un deporte abre su hoja para corregirlo.
   - En días pasados, **Añadir deporte** apunta algo que hiciste ese día.
7. **Sin conexión:** todo funciona igual en modo avión; se sube al volver la red.

### Entrega 1.4: el entreno en vivo

1. **Actualizar la app.** Ábrela con conexión y toca **Actualizar** en el aviso de arriba.
2. **Empezar:** en **Hoy**, la tarjeta del día tiene **Empezar entreno**. Se abre el entreno con los ejercicios de ese día. La barra de abajo cambia: duración, descanso desde la última serie y **Terminar**.
3. **Primera serie de un ejercicio:** la primera vez no hay peso que proponer. Toca el círculo de la fila y se abre una hoja:
   - **Peso** con **− / +** (2,5 kg o 5 lb), o toca el número y escríbelo;
   - **Repeticiones** con **− / +**;
   - **Registrar serie**. La fila se pone en verde.
4. **Las siguientes series ya vienen rellenadas:** si repites, es **un toque** en el círculo. Para cambiar algo, toca la fila, ajusta y **Registrar serie** (tres toques).
5. **Calentamiento:** en la hoja, activa **Calentamiento**. La serie sale con una **C** y no cuenta para el objetivo, el volumen ni los récords.
6. **Corregir:** toca una serie hecha para cambiarla o **Borrar serie** (con **Deshacer**).
7. **Más opciones:**
   - **+ Serie** añade otra serie al ejercicio.
   - El menú **⋯** de cada ejercicio tiene notas, quitar una serie pendiente, cambiar por otro ejercicio, subir o bajar, ver la ficha y quitarlo del entreno.
   - **Añadir ejercicio**, al final, abre el buscador.
8. **Salir a medio entreno:** vuelve atrás o cambia de pestaña. En **Hoy** verás **En curso · Continuar** y en las demás pestañas una cápsula encima de la barra que te devuelve al entreno.
9. **Terminar:** **Terminar** enseña el resumen (duración, volumen, series, ejercicios y récords), te avisa si te quedan series sin hacer y te deja marcar el esfuerzo de 1 a 10 y escribir notas. **Guardar entreno** lo cierra.
10. **Después:** en **Hoy** aparece **Hecho hoy** (tócalo para ver o corregir el entreno) y, en una rotación, lo siguiente pasa al próximo día.
11. **La última vez y los récords:** la próxima vez que hagas un ejercicio verás **Última vez** con lo que hiciste; **Copiar** rellena las series. Si levantas más peso que nunca o mejoras tu 1RM estimado, aparece **¡Récord!** y la serie lleva **PR**. La primera vez que haces un ejercicio no hay récords: no hay con qué comparar.
12. **Entrenar otro día:** debajo de la tarjeta de hoy puedes elegir otro día de la rutina o un **entreno libre** (empieza vacío).
13. **Descartar:** el **⋯** de arriba tiene **Descartar entreno** (te pide confirmación y deja **Deshacer**).
14. **Sin conexión:** en modo avión todo funciona igual. Al volver la red se sube solo.

### Entrega 1.3: rutinas y nuevo diseño

1. **Actualizar la app.** Ábrela con conexión. Arriba aparecerá el aviso **"Hay una versión nueva de la app"**: toca **Actualizar**. Si aún tenías la 1.1, se actualiza sola y se recarga una vez.
2. **Nuevo diseño:**
   - La barra de abajo flota y es translúcida. La pestaña elegida tiene una "lente" que se desliza al cambiar.
   - Los títulos grandes se encogen en la barra de arriba al hacer scroll.
   - Al entrar en una pantalla, la nueva llega desde la derecha; al volver, se va hacia la derecha.
   - Botones y tarjetas se "hunden" un poco al tocarlos.
   - Tu inicial, arriba a la derecha, lleva un punto con el estado de la sincronización (✓ verde = todo guardado).
3. **Hoy:** sin rutina, te propone crear una.
4. **Rutinas → plantilla "A/B/C/D + deporte" → Usar:**
   - se crea la rutina y se abre el editor;
   - es tu rutina activa (lo pone en verde arriba);
   - hay 4 días A, B, C, D con ejercicios y fútbol los miércoles.
5. **Editar un ejercicio:** toca uno.
   - Se abre una hoja desde abajo y la pantalla de detrás se hace pequeña, como en el iPhone. Se cierra arrastrándola hacia abajo.
   - Cambia las series con **− / +**.
   - Activa o quita el **rango** de repeticiones (8–12) o déjalas fijas.
   - Prueba **Subir**, **Bajar** y **Mover a otro día**.
6. **Reordenar:** mantén pulsado el asa ⠿ de un ejercicio y arrástralo; los demás se apartan. Para cambiar el orden A/B/C/D, toca **Ordenar**.
7. **Añadir ejercicios:** **Añadir ejercicio** abre un buscador. Marca varios y pulsa **Añadir N ejercicios**.
8. **Días:**
   - **Añadir día** crea el siguiente de la rotación (E…).
   - **Añadir deporte** permite elegir uno (pádel, running…) y fijarlo a un día o dejarlo sin día.
   - Con el menú **⋯** de un día puedes editarlo, duplicarlo o eliminarlo. Al eliminar aparece **Deshacer**.
9. **Semanal o rotación:** cambia **Organización** a *Semanal*.
   - Ves la semana de lunes a domingo, con los días repartidos en los días que sueles entrenar.
   - Los días sin entreno muestran **Descanso** y un **+**.
   - Vuelve a *Rotación* cuando quieras.
10. **Ajustes de la rutina:** **Días que sueles entrenar** (círculos L M X J V S D) y **Objetivo semanal**.
11. **Hoy:** muestra lo que toca hoy con sus ejercicios, lo siguiente ("Después · mañana") y tu semana.
12. **Varias rutinas:** crea otra con el **+** de Rutinas. Con el menú **⋯** puedes cambiarle el nombre, duplicarla, hacerla activa o eliminarla (te pide confirmación).
13. **Sin conexión:** en modo avión, abre la rutina y cambia algo. Al volver la red se sube sola.

### Entrega 1.2: biblioteca de ejercicios y base de la Comunidad

1. **Actualizar la app.** (Con la 1.3 ya no hace falta: se actualiza con el aviso.)
2. **Navegación:** abajo verás **Hoy, Calendario, Rutinas, Progreso y Comunidad**. **Perfil** se abre desde el círculo con tu inicial, arriba a la derecha.
3. **Rutinas → Biblioteca de ejercicios:** tiene que poner 876 ejercicios. La primera vez que se abre tras actualizar, el móvil descarga el catálogo (unos segundos).
4. **Buscador:** prueba `sentadilla`, `press banca`, `squat` (en inglés también vale), `gluteos` (sin tilde) o `curl mancuernas`. Los resultados aparecen al escribir.
5. **Filtros:** toca **Músculo** y elige *Bíceps*; luego **Material** y elige *Mancuernas*. Entra en un ejercicio y vuelve: el filtro sigue puesto.
6. **Ficha de un ejercicio:**
   - las dos fotos se alternan y muestran el movimiento;
   - se ven el músculo principal, los secundarios, el material y los pasos;
   - las instrucciones del catálogo aún están en inglés.
7. **Ejercicio propio:**
   1. Pulsa el botón **+** de arriba a la derecha.
   2. Si guardas sin rellenar, te avisa de lo que falta.
   3. Crea por ejemplo "Hip thrust en máquina" con músculo principal *Glúteos*.
   4. Después, edítalo (lápiz de arriba) y elimínalo (aparece **Deshacer** por si te equivocas).
   5. El filtro **Mis ejercicios** muestra solo los tuyos.
8. **Comunidad:**
   1. Mira la pantalla de "Próximamente".
   2. Ve a tu perfil y reserva tu **nombre de usuario**: escribe `@tunombre` y pulsa Intro.
   3. Vuelve a Comunidad: verás "Tu nombre público será @tunombre".
9. **Sin conexión:** en modo avión, abre la biblioteca y busca. Funciona igual. Las fotos que ya hayas visto también se ven sin red.

### Entrega 1.1: login, perfil y modo sin conexión

1. **Entrar:** abre la app instalada, escribe tu email y pulsa **Enviar código**. Escribe el código del correo, o usa **Entrar con contraseña**.
   - Si pruebas con un email que no es el tuyo, tiene que decirte que esa cuenta no existe.
2. **Pantalla Hoy:** te saluda con tu nombre y la fecha. El ✓ verde sobre tu inicial, arriba a la derecha, significa "todo guardado en el servidor".
3. **Perfil:**
   - Cambia el **idioma** a English: toda la app cambia al momento.
   - Cambia **kg / lb**. De momento solo se guarda; se notará cuando registres pesos (entrega 1.4).
   - Prueba los temas **Oscuro, Claro y Sistema**.
   - Rellena nombre, objetivo, nivel y lesiones.
4. **Sin conexión:**
   - Activa el **modo avión**, cambia el nivel y **cierra y vuelve a abrir la app**. Tiene que abrir igual, con el cambio hecho, y el punto de tu inicial tiene que mostrar una nube tachada.
   - Quita el modo avión. En unos segundos vuelve el ✓ verde.
   - En Supabase, **Table Editor → profiles**, verás el cambio guardado.
5. **Otro dispositivo:** entra desde el ordenador y cambia el idioma. Al abrir la app en el móvil, también cambia.
6. **Cerrar sesión:** en **Perfil**. Te lo confirma con una hoja desde abajo y, si hubiera cambios sin subir, te avisa.

## 10. Actualizar la app más adelante

Cada vez que suba una entrega nueva a GitHub, **Vercel la publica sola** en 1–2 minutos. La próxima vez que abras la app con conexión verás arriba **"Hay una versión nueva de la app · Actualizar"**. Nunca se recarga sola en mitad de un entreno.

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
  features/       Pantallas y hooks por funcionalidad (achievements, auth, calendar, profile, routines, session, share, sports, shell…)
  domain/         Lógica pura con tests: unidades, esquemas (Zod), búsqueda, rutinas y plan del día, sesiones, 1RM y récords, deportes, spots, calendario y racha, qué datos lleva cada imagen para compartir, el motor de logros… Sin React ni Supabase
  data/
    local/        Base de datos del móvil (IndexedDB con Dexie)
    sync/         Motor de sincronización (cola de cambios + descarga incremental)
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

## 12. Licencias y créditos

- Tipografía del sistema: **SF Pro** en iPhone, iPad y Mac; Roboto o Segoe UI en el resto. No se descarga ninguna fuente.
- **Motion** (animaciones), **vaul** (hojas inferiores) y **sonner** (avisos), licencia MIT.
- Iconos **Lucide**, licencia ISC.
- Catálogo de ejercicios e imágenes: [free-exercise-db](https://github.com/yuhonas/free-exercise-db), de dominio público (*Unlicense*), servido por jsDelivr. Nombres traducidos al español para esta app. Se cita también en la ficha de cada ejercicio.
