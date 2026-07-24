# CFM Ushuaia Hockey

Sitio público para seguir los torneos masculino y femenino de hockey sobre hielo, con un panel privado gratuito para publicar resultados y estadísticas.

Incluye el fixture oficial de la Copa Fin del Mundo 2026: seis equipos masculinos y cinco femeninos, del sábado 25 de julio al sábado 1 de agosto.

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

Solo `braianj@gmail.com` puede escribir datos. El ingreso usa Google y los cambios se publican inmediatamente. Desde el panel se puede:

- editar los seis equipos masculinos y cinco femeninos;
- crear partidos seleccionando equipos, fecha, hora y etapa;
- cargar o quitar resultados, incluso parciales en vivo;
- registrar goles y asistencias;
- administrar los planteles y números de camiseta;
- definir los convocados y su número de camiseta para cada partido;
- registrar primera y segunda asistencia, período y tiempo de juego;
- registrar faltas, faltas graves y minutos de penalización;
- reemplazar equipos y partidos publicados por el fixture oficial versionado.

Los estados se calculan automáticamente desde el horario: próximo antes del inicio, en vivo durante 60 minutos y finalizado después. Ese valor acompaña la grilla oficial, que programa un partido por hora. Un partido en vivo puede conservar ambos resultados vacíos o tener un resultado parcial. Las posiciones solo incorporan partidos finalizados que tengan ambos marcadores.

La acción **Reemplazar por el fixture oficial** borra todos los equipos y partidos publicados y vuelve a cargar los del repositorio. No toca planteles, convocatorias ni estadísticas. Usala una sola vez, antes de empezar a cargar resultados.

La web pública puede ser visitada por cualquiera sin iniciar sesión. Las reglas de Firestore permiten lectura pública y escritura exclusiva de la cuenta administradora.

## Datos iniciales y configuración

Los equipos, el fixture oficial y la configuración están versionados en el proyecto y funcionan como respaldo cuando Firestore está vacío o no responde. Los resultados y las estadísticas se administran desde el panel.

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
scoring: { win: 3, draw: 1, loss: 0 }
```

`qualification` controla las zonas visuales de la tabla. Se pueden cambiar sus posiciones y etiquetas sin tocar componentes.

## GitHub Pages

El build usa la ruta base `/CFM/`, por lo que los assets y el panel funcionan en GitHub Pages.

1. En GitHub, abrí **Settings → Pages**.
2. En **Build and deployment**, elegí **GitHub Actions**.
3. Subí cambios a `main`, o ejecutá manualmente el workflow **Deploy to GitHub Pages**.

El workflow `.github/workflows/deploy.yml` instala con `npm ci`, ejecuta lint, tipos, tests y build, y publica `dist` solamente si todo pasa.
