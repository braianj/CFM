# CFM Hockey

Aplicación estática para seguir los torneos masculino y femenino de hockey sobre hielo. No usa backend: equipos, calendario, resultados, estados y configuración se editan en archivos TypeScript.

> Los partidos y resultados incluidos son datos de muestra. Reemplazalos por la programación oficial antes del torneo.

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

## Dónde editar los datos

- `src/data/teams.ts`: equipos, nombres cortos y colores.
- `src/data/matches.ts`: calendario, participantes, resultados, estado, sede y notas.
- `src/data/tournamentConfig.ts`: puntos, nombres, zona horaria y zonas de clasificación.

Los datos masculino y femenino usan `category: 'men'` y `category: 'women'` respectivamente. Los IDs también llevan la categoría como prefijo para impedir cruces accidentales.

### Agregar un equipo

Agregá un objeto a `teams` en `src/data/teams.ts`:

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

Agregá un objeto a `matches` en `src/data/matches.ts`:

```ts
{
  id: 'w-07',
  category: 'women',
  startDateTime: '2026-07-27T10:30:00-03:00',
  stage: 'regular',
  homeTeamId: 'women-cau-kipas',
  awayTeamId: 'women-acemhh',
  homeScore: null,
  awayScore: null,
  status: 'upcoming',
  countsForStandings: true,
  venue: 'Pista Municipal',
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

Los playoffs de muestra usan etiquetas en lugar de equipos:

```ts
homeLabel: 'Ganador Semifinal A',
awayLabel: '1.º de fase regular',
countsForStandings: false,
```

Cuando se conozcan los participantes, reemplazá `homeLabel` / `awayLabel` por `homeTeamId` / `awayTeamId`. Los playoffs deben conservar `countsForStandings: false`.

### Cambiar puntos o clasificación

En `src/data/tournamentConfig.ts`, cada torneo tiene reglas independientes:

```ts
scoring: { win: 3, draw: 1, loss: 0 }
```

`qualification` controla las zonas visuales de la tabla. Se pueden cambiar sus posiciones y etiquetas sin tocar componentes.

## GitHub Pages

`vite.config.ts` usa `base: './'`, por lo que los assets funcionan bajo cualquier ruta `https://<usuario>.github.io/<repositorio>/`.

1. En GitHub, abrí **Settings → Pages**.
2. En **Build and deployment**, elegí **GitHub Actions**.
3. Subí cambios a `main`, o ejecutá manualmente el workflow **Deploy to GitHub Pages**.

El workflow `.github/workflows/deploy.yml` instala con `npm ci`, ejecuta lint, tipos, tests y build, y publica `dist` solamente si todo pasa.
