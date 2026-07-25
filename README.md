# CFM Ushuaia Hockey

Sitio público para seguir los torneos masculino y femenino de hockey sobre hielo, con un panel privado gratuito para publicar resultados y estadísticas.

Incluye el fixture oficial de la Copa Fin del Mundo 2026: seis equipos masculinos y cinco femeninos, del sábado 25 de julio al sábado 1 de agosto.

El selector de torneo tiene tres opciones: **Todos**, **Masculino** y **Femenino**. Todos es la vista por defecto y muestra el calendario completo en orden cronológico, con la categoría indicada en cada partido; las posiciones y las estadísticas se muestran en una sección por torneo.

La vista **Planteles** muestra los jugadores inscriptos de cada equipo, y de uno solo cuando lo elegís en el filtro.

En la vista de partidos se puede filtrar por equipo para ver solamente su calendario. El listado de un equipo conserva los partidos de definición a los que todavía puede llegar, igual que las hojas por equipo del fixture, y nunca mezcla el otro torneo. El filtro se recuerda entre visitas y se limpia al cambiar de torneo.

La paleta es la del Club Andino Ushuaia, verde y blanco. Los verdes están tomados del material del club y todos los colores viven como variables CSS en `src/styles/global.css`, en dos capas: la paleta con los colores en crudo, y encima los roles de interacción que dicen qué significa cada uno. Los componentes usan los roles, nunca un color suelto, así lo seleccionado se ve igual en todas las pantallas.

El sistema de diseño se puede ver funcionando en:

```text
https://braianj.github.io/CFM/design/
```

Muestra la paleta, los roles, los controles con sus estados y los chips de partido, y calcula el contraste en vivo desde las variables reales. Se carga aparte, así que no pesa en el sitio. Un test verifica que cada combinación de texto llegue a 4.5:1 y cada borde o foco a 3:1.

## Desarrollo

Requiere Node.js 22 o posterior.

```bash
npm install
npm run dev
```

Validación completa:

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run build
npm run preview
```

El build estático se genera en `dist/`.

## Administración

El panel está disponible en:

```text
https://braianj.github.io/CFM/admin/
```

Solo los administradores pueden escribir datos. El ingreso usa Google y los cambios se publican inmediatamente. Desde el panel se puede:

- editar los seis equipos masculinos y cinco femeninos;
- crear partidos seleccionando equipos, fecha, hora y etapa;
- cargar o quitar resultados, incluso parciales en vivo;
- indicar si un partido se definió en tiempo reglamentario, en tiempo extra o por penales;
- registrar goles y asistencias;
- administrar los planteles, y dar de baja o reactivar jugadores;
- definir los convocados y su número de camiseta para cada partido;
- registrar primera y segunda asistencia, período y tiempo de juego;
- registrar faltas, faltas graves y minutos de penalización;
- publicar el fixture oficial y los planteles inscriptos.

Los estados se calculan automáticamente desde el horario: próximo antes del inicio, en vivo durante 40 minutos y finalizado después. Un partido son dos tiempos de 20 minutos, y la grilla oficial programa un partido por hora. Un partido en vivo puede conservar ambos resultados vacíos o tener un resultado parcial. Las posiciones solo incorporan partidos finalizados que tengan ambos marcadores.

La acción **Publicar fixture y planteles oficiales** borra todos los equipos y partidos publicados, vuelve a cargar los del repositorio y agrega los planteles inscriptos. No toca convocatorias ni estadísticas. Usala una sola vez, antes de empezar a cargar resultados. Mientras los datos publicados no coincidan con los del repositorio, el panel lo avisa con un recuadro arriba de todo.

La web pública puede ser visitada por cualquiera sin iniciar sesión. Las reglas de Firestore permiten lectura pública de los datos del torneo y escritura exclusiva de los administradores.

## Datos iniciales y configuración

Los equipos, el fixture oficial y la configuración están versionados en el proyecto y funcionan como respaldo cuando Firestore está vacío o no responde. Los resultados y las estadísticas se administran desde el panel.

Los planteles inscriptos están en `src/data/players.ts`: 139 jugadores en los once equipos. El sitio los combina con lo publicado en Firestore usando el ID de cada jugador, así que un plantel nunca queda vacío mientras los documentos todavía están llegando. Por eso el panel da de baja a un jugador en vez de borrarlo: si se borrara el documento, volvería a aparecer desde el repositorio. Se guarda el nombre y el rol declarado (`C` capitán, `A` asistente, `GK` arquero). Algunas planillas de inscripción incluyen documento y fecha de nacimiento, y esos datos no se almacenan ni se publican. Los números de camiseta tampoco viven ahí, sino en la convocatoria de cada partido.

Los IDs de los partidos siguen los códigos de la organización: `h-1` a `h-15` y `d-1` a `d-10` para la fase regular, más `h-rep-a`, `h-rep-b`, `h-final-a`, `h-final-b`, `d-rep`, `d-sf1`, `d-sf2`, `d-3er` y `d-final`.

Los datos masculino y femenino usan `category: 'men'` y `category: 'women'` respectivamente. Los IDs también llevan la categoría como prefijo para impedir cruces accidentales.

### Agregar un equipo

Para agregar un equipo a los datos iniciales, agregá un objeto a la lista `teams`:

```ts
{
  id: 'women-new-team',
  name: 'Nuevo Equipo',
  shortName: 'NUEVO',
  category: 'women',
  color: '#1769aa',
}
```

El equipo aparecerá automáticamente en la tabla de su torneo.

### Agregar un partido

Para agregar un partido a los datos iniciales, agregá un objeto a la lista `matches`:

```ts
{
  id: 'd-11',
  category: 'women',
  startDateTime: '2026-07-30T10:30:00-03:00',
  stage: 'regular',
  homeTeamId: 'women-cau-kipas',
  awayTeamId: 'women-acemhh',
  homeScore: null,
  awayScore: null,
  status: 'upcoming',
  countsForStandings: true,
}
```

Usá siempre una fecha ISO con `-03:00`, la zona de Ushuaia. La interfaz ordena y agrupa los partidos automáticamente.

### Actualizar un resultado

Para un resultado 0–0, el cero es un resultado válido:

```ts
homeScore: 0,
awayScore: 0,
status: 'finished',
```

`null` significa que todavía no existe un resultado. Un partido solo cuenta en posiciones cuando:

- `status` es `finished`;
- ambos resultados son números;
- `countsForStandings` es `true`;
- ambos participantes tienen un `Team.id`.

Los estados permitidos son `upcoming`, `live`, `finished`, `postponed` y `tbd`. Los goles parciales de un partido `live` se muestran, pero no alteran posiciones.

### Playoffs y participantes pendientes

Masculino (seis equipos): 2.º–3.º juegan el Repechaje A y 5.º–6.º el Repechaje B; el ganador del Repechaje A enfrenta al 1.º en la Final A y el del Repechaje B al 4.º en la Final B.

Femenino (cinco equipos): 5.ª–4.ª juegan el Repechaje y 2.ª–3.ª la Semifinal 2; la ganadora del Repechaje enfrenta a la 1.ª en la Semifinal 1. Las perdedoras de ambas semifinales definen el tercer puesto y las ganadoras juegan la Final.

Mientras no se conozcan los participantes, los partidos usan etiquetas en lugar de equipos:

```ts
homeLabel: '1.º de fase regular',
awayLabel: 'Ganador del Repechaje A',
countsForStandings: false,
```

Cuando se conozcan los participantes, reemplazá `homeLabel` / `awayLabel` por `homeTeamId` / `awayTeamId`. Los playoffs deben conservar `countsForStandings: false`.

### Cambiar puntos o clasificación

Cada torneo tiene reglas independientes:

```ts
scoring: { win: 3, overtimeWin: 2, overtimeLoss: 1, shootoutWin: 2, shootoutLoss: 1, loss: 0, draw: 1 }
```

Ganar en tiempo reglamentario suma 3 y perder 0. Si el partido se define en tiempo extra o por penales, el ganador suma 2 y el perdedor 1. En el panel, cada partido tiene un selector **Cómo se definió** con las tres opciones; la tabla lo refleja en las columnas GOT y POT.

El tiempo extra y los penales pagan lo mismo, pero se guardan por separado y tienen su propia clave de puntaje, así que se puede cambiar uno sin tocar el otro. Estos torneos no tienen empates: `draw` existe solo como red de seguridad ante datos mal cargados.

`qualification` controla las zonas visuales de la tabla. Se pueden cambiar sus posiciones y etiquetas sin tocar componentes.

## Administradores

El panel tiene una sección **Administradores** con dos niveles de permiso:

| | Planilla | Organización |
|---|---|---|
| Cargar resultados y definir cómo se resolvió el partido | si | si |
| Convocatorias, goles, asistencias y faltas | si | si |
| Crear o borrar partidos, cambiar día, hora o equipos | no | si |
| Editar nombres de equipos | no | si |
| Agregar jugadores, darlos de baja o reactivarlos | no | si |
| Publicar el fixture oficial | no | si |
| Administrar esta lista | no | si |

Para dar acceso, escribí el correo de Google de la persona, elegí el nivel y listo. No hace falta tocar código ni volver a deployar.

La separación se aplica en las reglas de Firestore, no solo escondiendo botones: alguien con permiso de Planilla que intente cambiar la fecha de un partido recibe un rechazo del servidor.

La cuenta `braianj@gmail.com` es la dueña, está fija en el código y en las reglas, y no se puede quitar. Eso evita quedarse sin acceso al panel y permite crear el primer administrador cuando la lista está vacía.

La lista vive en la colección `admins` de Firestore y no es pública, porque son direcciones personales. Cada persona logueada puede leer solamente su propia entrada; la lista completa la ven únicamente los administradores.

> Las reglas de Firestore **no** se publican desde GitHub Actions. Si cambia `firestore.rules`, hay que pegarlas en la consola de Firebase (Firestore Database → Reglas → Publicar).

## Analítica de uso

El sitio usa Google Analytics para Firebase, con el identificador `MEASUREMENT_ID` en `src/firebase.ts`. Los informes están en la consola de Firebase, sección **Analytics**, y en la propiedad de Google Analytics del proyecto.

Para apagar la analítica alcanza con vaciar `MEASUREMENT_ID`: `track()` deja de hacer nada y el compilador elimina el SDK del bundle. El SDK se descarga aparte, después de que la página ya se ve, así que no retrasa la primera carga.

Se registran automáticamente las visitas, las sesiones y los visitantes nuevos. Además se registran estos eventos propios:

| Evento | Cuándo | Datos |
|---|---|---|
| `select_view` | cambio de vista | vista y torneo |
| `select_tournament` | cambio de torneo | torneo |
| `select_team` | filtro por equipo | ID, nombre y categoría del equipo |
| `admin_action` | acciones del panel | acción, y resultado o tipo de evento |

Nunca se envía el nombre de una persona ni ningún dato de las planillas de inscripción.

## GitHub Pages

El build usa la ruta base `/CFM/`, por lo que los assets y el panel funcionan en GitHub Pages.

1. En GitHub, abrí **Settings → Pages**.
2. En **Build and deployment**, elegí **GitHub Actions**.
3. Subí cambios a `main`, o ejecutá manualmente el workflow **Deploy to GitHub Pages**.

El workflow `.github/workflows/deploy.yml` instala con `npm ci`, ejecuta lint, tipos, tests y build, y publica `dist` solamente si todo pasa.
