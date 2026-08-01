# Arqueros — transcripción del pie de las planillas

Leído el 31/7/2026 de los tres escaneos. **Todavía no está cargado en Firestore**: la
cuota diaria de lectura del proyecto está agotada y no se puede resolver casaca →
jugador sin leer las convocatorias publicadas.

## La segunda planilla: los tiros por jugador

Cada partido tiene **dos hojas**. La segunda es la de juego, con goles y penalidades. La
primera es **la que firman los jugadores**, y trae `TIROS 1° / TIROS 2° / TIROS OT` por
jugador. De ahí salen las atajadas de los partidos cuyo pie quedó en blanco:

> **atajadas = tiros del rival − goles que le hicieron en juego**

Verificado contra H-4, donde tenemos las dos hojas: los tiros por jugador suman 12 para
CAU Negro y 13 para CAU Blanco, que es exactamente el `TAA` del pie, y de ahí salen las
12 y 8 atajadas que el pie ya declaraba. El método cierra al número.

**El gol que define un shootout no se le carga al arquero.** Cuenta para el resultado
pero no para el porcentaje de atajadas.

## De dónde sale cada número

El pie de la segunda carilla trae dos recuadros:

- **Atajadas**: una columna por arquero (`GKA1`…`GKB3`) y una fila por período, con la
  fila `TOT` al final. De ahí salen las atajadas.
- **Registro de arqueros**: `GKA | MJ | GC | GKB | MJ | GC`. De ahí salen la casaca y
  los minutos jugados.

**Los goles recibidos no se toman de ese recuadro.** Son los goles del rival, que ya
están publicados, y así no dependen de una lectura dudosa. El control es
`atajadas + goles recibidos = tiros al arco en contra`, y cierra en todas las planillas
listadas salvo donde se indica.

**La columna TAA no se usa.** Cambia de convención según quién completó la planilla:
en H-4 es «tiros de A : tiros de B» y en D-3 es «tiros contra A : tiros contra B».

## Lo leído

`A` es el equipo local y `B` el visitante, como los ordena la planilla.

| Partido | Arquero A | At. | GC | MJ | Arquero B | At. | GC | MJ |
|---|---|---|---|---|---|---|---|---|
| H-3 All-Pakas 7-1 Ovejas | #1 | 2 | 1 | 30 | #36 | 6 | 7 | 30 |
| H-4 CAU Negro 4-1 CAU Blanco | #50 | 12 | 1 | 30 | #30 | 8 | 4 | 30 |
| H-6 Ñires 3-0 Ovejas | #1 | 2 | 0 | 30 | #36 | 16 | 3 | 30 |
| H-8 CAU Negro 4-1 Ovejas | #50 | 3 | 1 | 30 | #36 | 11 | 4 | 30 |
| H-12 CAU Blanco 4-1 Ovejas | #30 | 6 | 1 | 30 | #36 | 14 | 4 | 30 |
| H-15 CAU Negro 6-2 All-Pakas | #50 | 6 | 2 | 30 | #1 | 13 | 6 | 30 |
| D-2 Kipas 5-0 All-Pakas D | #22 | 0 | 0 | 30 | #7 | 10 | 5 | 30 |
| D-6 ACEMHH 0-5 Ñires Zorras | #12 | 18 | 5 | 30 | #63 | 2 | 0 | 30 |
| D-7 Kipas 3-0 Ovejas D | #22 | 3 | 0 | 30 | #44 | 12 | 3 | **20** |
| D-8 All-Pakas D 0-3 ACEMHH | #7 | 5 | 3 | 30 | #12 | 7 | 0 | 30 |
| D-9 All-Pakas D 0-4 Ñires Zorras | #55 | 30 | 4 | 30 | #3 | 6 | 0 | 30 |
| D-SF2 Kipas 2-1 ACEMHH (OT) | #22 | 2 | 1 | **34** | #12 | 13 | 2 | **34** |

Doce planillas con casaca, atajadas y minutos, todas verificadas contra el resultado.

### Con atajadas pero sin casaca

El «Registro de arqueros» quedó vacío, así que hay que resolver quién atajó desde la
convocatoria del partido.

| Partido | At. A | GC A | At. B | GC B |
|---|---|---|---|---|
| H-10 CAU Negro 5-0 CAU Verde | 5 | 0 | 15 | 5 |
| H-11 All-Pakas 4-1 Ñires | 7 | 1 | 15 | 4 |
| D-3 Ovejas D 0-8 Ñires Zorras | 17 | 8 | 0 | 0 |

### Con problemas

- **H-7 CAU Blanco 2-3 All-Pakas (penales).** Sin casacas. La columna GKB1 cierra sola
  (8+10+2 = 20) pero la GKA1 no: los períodos suman 19 y la fila `Pen` tiene un número
  suelto. El shootout mete tiros que no son del juego corrido. Sin resolver.
- **H-14 CAU Verde 6-0 Ovejas.** El equipo A usó **dos arqueros** (hay números en GKA1 y
  en GKA2) y el Registro está vacío, así que no se puede repartir las 4 atajadas entre
  ellos. El arquero B sí cierra: 15 atajadas, 6 goles recibidos.
- **D-REP All-Pakas D 1-0 Ovejas D.** El arquero B cierra (#44, 8 atajadas, 1 gol). El A
  (#7) tiene los períodos en 3+3 = 6 pero el TOT dice 11. Sin resolver.

### Sin nada en el pie

H-1, H-2, H-5, H-13, D-1, D-4, D-5 y D-10 tienen el pie en blanco. H-9 no tiene planilla
en ninguno de los tres escaneos.

## Dos cosas que resolvió esta lectura

- **Milagros Cavalleri usó la #63 en D-6.** La convocatoria de esa planilla no le había
  escrito casaca, y por eso quedó fuera al cargar los 277 convocados. El Registro de
  arqueros sí la tiene.
- **La copia de D-6 del tercer escaneo trae las atajadas** que la copia del segundo no
  tenía. Al descartar duplicados por partido se perdía ese dato.

## Lo que falta para cargarlo

1. Leer las convocatorias publicadas para mapear casaca → jugador de cada partido.
   Bloqueado por la cuota de lectura de Firestore, que se repone sola.
2. Escribir solo los tres campos (`saves`, `goalsAgainst`, `minutesPlayed`) sobre la
   convocatoria existente, con `PATCH` y `updateMask`, para no pisar el resto.
3. Los tres partidos sin casaca se resuelven buscando en la convocatoria al jugador con
   rol `GK`; si hay más de uno, quedan sin cargar.
