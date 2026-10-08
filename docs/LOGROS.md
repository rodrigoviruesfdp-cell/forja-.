# Logros y destacados (1.7) — diseño previsto

Logros tipo videojuego que aparecen bajo el perfil, en una fila de **destacados** como la de Instagram. Funcionan con un solo usuario: no necesitan nada social. **Todavía no están construidos.** El catálogo es un primer borrador para pulirlo juntos.

## Qué ve el usuario

- **Fila de destacados bajo el perfil:** círculos con los logros que fijes (o los 5 últimos). Un anillo de color marca los que aún no has visto.
- **Al tocar uno**, se abre a pantalla completa como una historia: la insignia, la fecha, la sesión con la que lo conseguiste y lo que falta para el siguiente nivel ("146/200 días de boxeo"). Deslizas para pasar al siguiente, y desde ahí se puede compartir (generador de imágenes de la 1.6).
- **Al desbloquearlo:** animación a pantalla completa al terminar la sesión. Sin vibración: en iPhone una web no puede vibrar.
- **"Todos los logros":** conseguidos, en progreso y alguno secreto.

## Catálogo de ejemplo

| Logro | Cómo se consigue | Niveles |
|---|---|---|
| The Search 🏄 | Spots distintos con sesión de surf | 5 · 25 · 50 · 100 |
| Balboa 🥊 | Días distintos con boxeo | 10 · 50 · 100 · 200 |
| Primera piedra | Primera sesión completada | 1 |
| Hierro | Sesiones de gimnasio | 10 · 50 · 100 · 250 · 500 |
| Semana redonda | Semanas seguidas cumpliendo tu objetivo semanal | 4 · 12 · 26 · 52 |
| Récord tras récord | Récords personales | 1 · 10 · 50 · 100 |
| Toneladas | Kilos levantados en total | 10 t · 100 t · 1.000 t |
| Todoterreno | Deportes distintos practicados | 3 · 5 · 8 |
| Doblete | Gimnasio y deporte el mismo día | 1 · 10 · 50 |
| Madrugador (secreto) | Sesiones empezadas antes de las 7:00 | 10 |
| Compañero de olas (Fase 3) | Sesiones con el mismo amigo | 10 · 50 |

Los niveles intermedios hacen que algo que lleva años (100 spots) dé alegrías por el camino.

**Marcas:** "The Search" es el lema de campaña de Rip Curl y "Balboa" remite a Rocky. Para uso personal no hay problema; antes de dar acceso a otros, revisarlos o cambiarlos.

## Qué necesita antes

- Sesiones y récords (1.4).
- Deportes con código fijo, spots, datos propios de cada deporte y racha (1.5).

## Datos

- **Los logros se definen en el código** (`src/domain/achievements`), no en la base de datos. Añadir o retocar uno es publicar una versión nueva de la app, con sus textos en español e inglés.
- **Tabla `user_achievements`** (se crea en la 1.7): `achievement_key`, `tier`, `unlocked_at`, `session_id` (la sesión que lo desbloqueó), `seen_at` (para que la animación salga una sola vez, también en otro móvil) y `featured_position` (su sitio en destacados). Una fila por logro y nivel. Se sincroniza como el resto.
- **El progreso ("146/200") no se guarda: se calcula** cada vez.
- **Un logro conseguido no se pierde** aunque borres sesiones.

## Motor de reglas

Cada logro es **una medida, un filtro y unos niveles**.

- **Medidas** (unas 7): contar sesiones, días distintos, spots distintos o deportes distintos; sumar kilos, minutos, km u olas; semanas seguidas; récords.
- **Filtros:** deporte, tipo de sesión y hora.
- Un logro nuevo es una línea más del catálogo, no programación nueva (salvo que necesite una medida nueva).

**Se calcula en el móvil**, al terminar o editar una sesión (desde el "Terminar sesión" de la 1.4). Funciona sin conexión y la animación sale al instante. Calcularlo en el servidor exigiría red y duplicaría la lógica; solo se hará cuando los logros sean visibles para otros (Fase 3).

**Cómo no recalcular todo el historial en cada sesión:**

1. Solo se revisan los logros a los que afecta esa sesión: una de boxeo no mira los de surf.
2. Cada medida es una consulta rápida a la base del móvil: contar días de boxeo entre 1.500 sesiones tarda milisegundos.
3. **No se guardan contadores que se van sumando.** Se descuadran al editar o borrar una sesión antigua o al sincronizar desde otro móvil. Recalcular solo la medida afectada es siempre correcto y, con estos volúmenes, barato.
4. Solo se guarda el desbloqueo, y repetir el cálculo (también desde dos móviles) nunca lo duplica.
5. La revisión de todo el historial solo se hace cuando una versión trae logros nuevos: una vez y en segundo plano. Así un logro nuevo reconoce lo que ya hiciste.

## Diseño

- Insignias dibujadas por la app (forma y color según el nivel, con el icono del deporte) y animadas con Motion. Las ilustraciones hechas a mano, más adelante.
- **Por decidir juntos:**
  - estilo de insignia: metálica como Apple Fitness, ilustrada o minimalista;
  - cuántos destacados como máximo (propuesta: 8);
  - qué logros de surf y boxeo motivan de verdad.
