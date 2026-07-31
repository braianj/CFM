# Estado de las planillas, partido por partido

## Nuevo escaneo recibido el 31/7/2026

`planillas 3.pdf` tiene 28 páginas y contiene 15 planillas. Doce son partidos que no
estaban en los dos escaneos anteriores; D-6, H-7 y H-8 son copias. Las primeras trece
planillas usan dos carillas y las dos últimas están completas en una sola página.

| Páginas | Partido | Equipos | Relación con el lote anterior |
|---|---|---|---|
| 1-2 | D-6 | ACEMHH - Ñires Zorras | duplicada |
| 3-4 | D-7 | CAU Kipas - Ovejas Negras Damas | nueva |
| 5-6 | D-8 | All-Pakas Damas - ACEMHH | nueva |
| 7-8 | D-9 | All-Pakas Damas - Ñires Zorras | nueva |
| 9-10 | D-10 | Ovejas Negras Damas - ACEMHH | nueva |
| 11-12 | H-7 | CAU Blanco - All-Pakas | duplicada |
| 13-14 | H-8 | CAU Negro - Ovejas Negras | duplicada |
| 15-16 | H-10 | CAU Negro - CAU Verde | nueva |
| 17-18 | H-11 | All-Pakas - Ñires | nueva |
| 19-20 | H-12 | CAU Blanco - Ovejas Negras | nueva |
| 21-22 | H-13 | CAU Blanco - Ñires | nueva |
| 23-24 | H-14 | CAU Verde - Ovejas Negras | nueva |
| 25-26 | H-15 | CAU Negro - All-Pakas | nueva |
| 27 | D-REP | All-Pakas Damas - Ovejas Negras Damas | nueva |
| 28 | D-SF2 | CAU Kipas - ACEMHH | nueva |

Este índice está verificado contra el campo `PARTIDO #` de cada hoja y los equipos
impresos. La carga descrita debajo salió del segundo pase de convocatorias, goles,
asistencias y penalidades, cruzado con lo que ya estaba publicado.

H-9 (CAU Verde - Ñires) sigue sin aparecer en ninguno de los tres PDFs.

**Cargado el 31/7/2026:** 277 convocatorias y 86 eventos de los 12 partidos nuevos.
La importación excluyó expresamente las copias D-6, H-7 y H-8, y escribió documentos
nuevos solamente para D-7, D-8, D-9, D-10, H-10 a H-15, D-REP y D-SF2. Los 300 registros
de convocatoria y 122 eventos del lote anterior no fueron reescritos.

Los eventos incompletos se publicaron con el mismo criterio del primer lote: existe la
fila para que el gol o la falta no desaparezca, pero una casaca, asistencia, período,
reloj, motivo o identidad que no se lee con certeza queda vacío. La cantidad de eventos
de gol cierra contra el resultado de los doce partidos.

D-SF2 quedó marcado 2-1 en tiempo extra y finalizado. La actualización preparada para
D-REP (1-0) no se aplicó porque Firestore detectó que el partido había cambiado después
de la lectura inicial; se respetó la versión más reciente en lugar de sobrescribirla.
La cuota pública de lectura quedó agotada inmediatamente después de la carga, así que
queda pendiente un control visual final cuando vuelva a estar disponible.

**Cargado el 30/7/2026:** 122 eventos (69 goles y 53 faltas) de las 14 planillas, mas 65
convocatorias de las tres planillas del segundo escaneo. De esos 122, **91 quedaron
completos** y 31 tienen algun dato que la planilla no dejaba leer. El panel los marca con
un cartel de lo que falta y se completan a mano.

Control automatico: los goles cargados dan exactamente el resultado publicado en 13 de los
14 partidos. El unico que no cierra es D-3, y es porque el resultado publicado esta mal.
Ninguna casaca resuelta quedo apuntando a un jugador fuera de la convocatoria de su partido.

Orden cronológico. Dos escaneos distintos:

- **PDF 1** = `planillas.pdf`, 22 páginas, 11 planillas (dos carillas cada una).
- **PDF 2** = `CamScanner 28-07-2026 22.46.pdf`, 5 páginas, 3 planillas.

Cada partido lista primero lo que está leído sin dudas y después lo que no entiendo.
Los tiempos son **como los escribe la planilla**: reloj restante, no tiempo jugado.

Resumen: **14 planillas leídas**. Ya hay 20 partidos con resultado cargado, así que además
de H-9 faltan las de D-7, D-8, H-10, H-11 y H-12.
De las 14 leídas, **6 están enteras** y **8 tienen algo que no puedo leer**.

| # | Partido | Página | Resultado | Estado |
|---|---|---|---|---|
| 1 | D-1 CAU Kipas 0-1 Ñires Zorras | PDF 1 · 15-16 | coincide | 1 duda menor |
| 2 | H-1 CAU Verde 2-6 CAU Blanco | PDF 1 · 1-2 | coincide | **4 dudas** |
| 3 | H-2 CAU Negro 3-0 Ñires | PDF 1 · 3-4 | coincide | **3 dudas** |
| 4 | H-3 All-Pakas 7-1 Ovejas Negras | PDF 1 · 5-6 | coincide | **3 dudas** |
| 5 | D-2 CAU Kipas 5-0 All-Pakas Damas | PDF 1 · 17-18 | coincide | 1 duda |
| 6 | H-4 CAU Negro 4-1 CAU Blanco | PDF 1 · 7-8 | coincide | 2 dudas |
| 7 | D-3 Ovejas Negras D 0-**8** Ñires Zorras | PDF 1 · 19-20 | **corregir a 0-8** | 2 dudas |
| 8 | H-5 CAU Verde 4-3 All-Pakas | PDF 1 · 9-10 | coincide | 1 duda |
| 9 | H-6 Ñires 3-0 Ovejas Negras | PDF 1 · 11-12 | coincide | 1 duda |
| 10 | D-4 CAU Kipas 2-1 ACEMHH (OT) | PDF 2 · 1 | coincide | **entero** |
| 11 | D-5 All-Pakas D 1-2 Ovejas Negras D (SO) | PDF 1 · 21-22 | coincide | 2 dudas |
| 12 | H-7 CAU Blanco 2-3 All-Pakas (SO) | PDF 1 · 13-14 | coincide | 2 dudas |
| 13 | D-6 ACEMHH 0-5 Ñires Zorras | PDF 2 · 4-5 | coincide | **entero** |
| 14 | H-8 CAU Negro 4-1 Ovejas Negras | PDF 2 · 2-3 | coincide | 1 duda |
| 15 | H-9 CAU Verde vs Ñires | **no está** | — | **sin planilla** |

---

## 1 · D-1 · sáb 25/7 20:30 · CAU Kipas 0 – 1 Ñires Zorras
PDF 1, páginas 15-16.

**Bien**
- Zorras: P2 7:11 gol #17, asistencia #23
- Faltas Kipas: P2 12:55 #50 2' ELBOWING · P2 6:08 #16 2' TRIPPING
- Faltas Zorras: P1 9:15 #22 2' TRIPPING · P1 2:19 #7 2' TRIPPING

**No entiendo**
- Falta de Kipas P2 0:19 #2 BOARDING: **no tiene minutos escritos**. ¿Son 2?

---

## 2 · H-1 · sáb 25/7 21:30 · CAU Verde 2 – 6 CAU Blanco
PDF 1, páginas 1-2. Es la planilla con más problemas de todas.

**Bien**y enten
- Verde: P1 6:15 gol #4, asistencia #16
- Blanco: P1 12:52 gol #53 · P1 0:50 gol #88 · P2 9:20 gol #6 asist #32 · P2 3:23 gol #32 asist #6 y #5

**No entiendo**
1. **#6 de CAU Verde.** Es el más pesado: le corresponden un gol (P2 2:43) y **tres faltas**
   (P1 13:42 2', P1 2:20 2', P1 1:44 **10' de mala conducta**). Ese número no está en la
   convocatoria de Verde ese día. Y son 3 menores en un partido, o sea expulsión más una
   fecha, así que importa quién es.
2. **#35 de CAU Blanco**, gol de P1 6:38. No está en la convocatoria de Blanco.
3. **#3 de CAU Verde**, falta de P2 2:34. No está en la convocatoria.
4. **Gol de Blanco P1 1:44: dice gol #32 y asistencia #32.** Nadie se asiste a sí mismo.
   O la asistencia es otro número, o no hay asistencia.

---

## 3 · H-2 · sáb 25/7 22:50 · CAU Negro 3 – 0 Ñires
PDF 1, páginas 3-4.

**Bien**
- Negro: P1 4:11 gol #91 asist #92 · P2 4:23 gol #92
- Faltas Negro: P1 11:30 #32 2' · P1 0:49 #91 2' ROUGHING
- Faltas Ñires: P1 6:23 #12 2' · P2 8:48 #93 2' CROSS-CHECK

**No entiendo**
1. **Asistencia del gol de P2 9:50** (gol #64): se lee **#20**, que no está en la convocatoria
   de Negro.
2. **#22 de CAU Negro**, falta de P2 8:40. No está en la convocatoria.
3. **Falta de Ñires que leí como P2 18:35 #76.** Dos problemas: el #76 no está en la
   convocatoria, y **18:35 es imposible** en un período de 15 minutos. Leí mal el tiempo
   también, seguramente es 8:35 o 1:35.

---

## 4 · H-3 · dom 26/7 13:00 · All-Pakas 7 – 1 Ovejas Negras
PDF 1, páginas 5-6.

**Bien**
- All-Pakas: P1 14:51 gol #3 asist #96 · P1 10:39 gol #96 · P1 3:54 gol #20 ·
  P1 1:20 gol #96 · P1 0:24 gol #20 · P2 10:32 gol #9 asist #78 · P2 5:37 gol #20 asist #3
- Falta All-Pakas: P2 1:58 #97 2' CHARGING
- Falta Ovejas: P2 12:52 #97 2' INTERFERENCE

**No entiendo**
1. **Gol de Ovejas P2 0:49, #48.** No está en la convocatoria de Ovejas.
2. **Falta de All-Pakas P2 1:36, #89**, HIGH-STICKING. No está en la convocatoria.
3. **Falta de Ovejas P2 7:05, #21**, BOARDING. No está en la convocatoria.

Nota: el #97 aparece en los dos equipos, cada uno con una falta. Puede ser real (son
planteles distintos) pero conviene que lo mires.

---

## 5 · D-2 · dom 26/7 20:30 · CAU Kipas 5 – 0 All-Pakas Damas
PDF 1, páginas 17-18.

**Bien**
- Kipas: P1 12:51 gol #2 · P1 7:38 gol #50 · P2 5:39 gol #13 asist #50 · P2 2:35 gol #33 asist #24
- Falta Kipas: P1 3:29 #50 2' SLASHING
- Faltas All-Pakas D: P1 11:59 #31 2' TRIPPING · P2 6:31 #19 2' TRIPPING

**No entiendo**
- **Asistencia del gol de P1 14:40** (gol #95): se lee **#10**, que no está en la
  convocatoria de Kipas ese día.

---

## 6 · H-4 · dom 26/7 21:30 · CAU Negro 4 – 1 CAU Blanco
PDF 1, páginas 7-8.

**Bien**
- Negro: P1 4:32 gol #21 · P2 13:18 gol #92
- Blanco: P2 10:44 gol #5
- Falta Negro: P2 3:12 #4 2' TRIPPING
- Falta Blanco: P2 4:44 #84 2' HIGH-STICKING

**No entiendo**
1. **Gol de Negro P2 8:06, #97.** No está en la convocatoria de Negro. (El 97 es un número
   de Ovejas, que no juega este partido.)
2. **Gol de Negro que leí a las 0:01** (#92, asistencia #32). Un 0:01 es raro; puede ser
   0:31 u otro. El gol y la asistencia sí cierran.

---

## 7 · D-3 · dom 26/7 22:50 · Ovejas Negras Damas 0 – 8 Ñires Zorras
PDF 1, páginas 19-20. **El resultado cargado (0-7) está mal: es 0-8.**

Verificado: los ocho goles están numerados 1 a 8, ninguno tachado, y el «Resumen del
Partido» que firma el árbitro cierra `0-8` con 0-3 en el primer período y 0-5 en el segundo.

**Bien**
- Zorras P1: 11:16 gol #7 asist #23 · 8:33 gol #17 asist #23
- Zorras P2: 13:56 gol #23 · 13:14 gol #23 asist #90 · 2:11 gol #20 · 1:03 gol #18
- Faltas Ovejas D: P1 7:05 #17 2' HIGH-STICK · P1 0:51 #17 2' TRIPPING ·
  P2 11:00 #34 2' BOARDING · P2 7:48 #22 2' TRIPPING
- Falta Zorras: P2 2:56 #7 2' TRIPPING

**No entiendo**
1. **Gol de P2 10:26, #13.** No está en la convocatoria de Zorras ese día.
2. **El gol que leí como P1 1:28** (#14, asistencia #23). En el primer período los otros dos
   goles son a las 11:16 y 8:33; un 1:28 en medio rompe el orden del reloj, así que
   probablemente sea 11:28 o 14:28.

Nota: en el bloque de faltas de Ovejas hay filas tachadas, que no transcribí.

---

## 8 · H-5 · lun 27/7 08:00 · CAU Verde 4 – 3 All-Pakas
PDF 1, páginas 9-10.

**Bien**
- Verde: 13:37 gol #3 asist #6 · 7:49 gol #51 · 6:12 gol #10 asist #8
- All-Pakas: 5:34 gol #16 · 10:10 gol #11 · 1:32 gol #3
- Faltas Verde: P1 6:20 #7 2' ROUGHING · P2 12:36 #7 2' ROUGHING · P2 7:35 #51 10' ·
  P2 1:17 #9 2' CHARGING
- Faltas All-Pakas: P1 6:20 #20 2' ROUGHING · P2 12:36 #97 2' ROUGHING · P2 8:08 #9 2' INT ·
  P2 7:41 #11 2' CROSS-CHECK · P2 1:17 #20 2' HIGH-STICKING

**No entiendo**
- **Gol de Verde 11:18, #20** (asistencia #27). El #20 no está en la convocatoria de Verde.

Dos cosas más de esta planilla: **ninguno de los siete goles tiene el período anotado**, y
la falta de Verde de P1 6:54 #51 CHARGING **no tiene minutos**.

---

## 9 · H-6 · lun 27/7 20:30 · Ñires 3 – 0 Ovejas Negras
PDF 1, páginas 11-12.

**Bien**
- Ñires: P2 11:34 gol #12 asist #10 · P1 7:08 gol #69 asist #89
- Falta Ovejas: P1 1:17 #8 2' HOOKING

**No entiendo**
- **Asistencia del gol de P1 14:34** (gol #95): se lee **#13**, que no está en la
  convocatoria de Ñires.

---

## 10 · D-4 · lun 27/7 21:30 · CAU Kipas 2 – 1 ACEMHH Damas (tiempo extra) ✅
PDF 2, página 1. **Entero.** Es la planilla que faltaba.

**Bien, todo**
- Kipas: P1 5:05 gol #16 Maura Abrahan, asistencia #2 Ana Tibaudin
- Kipas: **OT 0:53 gol #50 Celeste Mastracchio**, asistencia #16 Maura Abrahan
- ACEMHH: P2 3:27 gol #17 Aguirre
- Falta Kipas: P2 8:53 #50 2' INTERFERENCE
- Faltas ACEMHH: P1 4:44 #95 2' HOOKING · P1 1:16 #46 2' INTERFERENCE · P2 4:36 #13 2' TRIPPING

El gol de oro en el suplementario confirma el 2-1 en tiempo extra que ya está cargado.

---

## 11 · D-5 · lun 27/7 22:50 · All-Pakas Damas 2 – 1 Ovejas Negras Damas (penales)
PDF 1, páginas 21-22.

**Bien**
- Ovejas D: P1 13:22 gol #16 Magali Repetto
- Falta Ovejas D: P2 10:17 #17 2' INTERFERENCE → **es Jesica Carimatto**

Resuelto: no había dos #17. **Fátima Arano usó la 27**, Carimatto la 17. Fue error mío.

**No entiendo**
1. **Gol de All-Pakas P1 1:06, #79.** All-Pakas usó 26, 9, 29, 21, 19, 31, 55, 7 y 80 ese
   día. El 79 no existe: mi lectura tiene que ser 29 (Lypka), 19 (Alvarado) o 80 (García).
2. **Asistencia del gol de Ovejas**: se lee **#81**, que no existe. En hielo estaban 83, 16,
   18, 91 y 34, así que es **91 Castarés** o **83 Villavicencio**.
Resuelto también el gol del shootout: el resultado publicado es **1-2**, o sea que los
penales los ganó Ovejas, y la nota «PENAL GOL #17» es de ellas. El #17 de Ovejas es
Carimatto. Eso lo deduje del resultado, no lo leí en la planilla.

---

## 12 · H-7 · mar 28/7 08:00 · CAU Blanco 2 – 3 All-Pakas (penales)
PDF 1, páginas 13-14.

**Bien**
- Blanco: P1 6:48 gol #5 asist #75 · P2 0:55 gol #32 asist #5
- All-Pakas: P2 7:38 gol #3 · P2 4:20 gol #89 · **shootout gol #3**
- Faltas All-Pakas: P1 7:31 #11 2' · P2 3:05 #97 2' BOARDING

**No entiendo**
- **Dos faltas de All-Pakas sin ninguna casaca escrita**: P1 12:14 2' TRIPPING y
  P2 3:34 2' CROSS-CHECK. Están los minutos y el motivo, pero no quién.

---

## 13 · D-6 · mar 28/7 20:30 · ACEMHH Damas 0 – 5 Ñires Zorras ✅
PDF 2, páginas 4-5. **Entero.**

**Bien, todo**
- Zorras: P1 12:41 gol #23 Catalina Bianciotto
- Zorras: P1 4:20 gol #22 Margarita Schiavini, asistencia #23 Bianciotto
- Zorras: P1 2:55 gol #14 Ana Carbone, asistencia #90 Victoria Seru Campos
- Zorras: P1 1:44 gol #20 Mía Valdebenito, asistencia #7 Carolina Sigel
- Zorras: P2 8:02 gol #18 Aitana Castillo, asistencia #7 Carolina Sigel
- Faltas ACEMHH: P2 5:05 #22 Camila Di Stefano 2' CROSS-CHECK ·
  P2 0:51 #18 Paula Olivera 2' HOLDING
- ACEMHH no marcó.

El resumen del árbitro da 0-4 en el primer período y 0-1 en el segundo, que cierra 0-5.

---

## 14 · H-8 · mar 28/7 21:30 · CAU Negro 4 – 1 Ovejas Negras
PDF 2, páginas 2-3. Esta planilla trae los nombres impresos, así que las casacas cierran
todas contra el plantel.

**Bien**
- Negro: P1 8:04 gol #91 Francisco Val (sin asistencia)
- Negro: P1 8:45 gol #92 Martín Baeza (sin asistencia)
- Negro: P2 2:44 gol #29 Teo Porco Fischer (sin asistencia)
- Ovejas: P1 4:12 gol #17 Martín Firmapaz, asistencia #21 Juan Manuel Martínez
- Faltas Negro: P2 13:33 #64 Tristán Boersma 2' HOOKING · P2 6:07 #92 Martín Baeza 2' SLASHING
- Ovejas no tuvo faltas.

El «Resumen del Partido» cierra **4-1** (3-1 el primero, 1-0 el segundo).

**No entiendo**
- **Las dos asistencias del gol de P1 5:26** (#98 Luciano Velásquez). Hay dos números
  escritos en las columnas de asistencia y no los saco: el primero parece 39 o 51, el
  segundo parece 29 o 2-1. El gol en sí está claro.

---

## 15 · H-9 · mar 28/7 22:50 · CAU Verde vs Ñires ❌
**No está en ninguno de los dos escaneos.** Es la única planilla de partido jugado que falta.

---

## Jugadores que aparecen en planilla y no están cargados

No bloquean ningún gol ni falta: solo aparecen en la convocatoria, así que afectan
únicamente los partidos jugados (PJ).

- **Uriel Puig**, CAU Negro, #81 en H-8.
- **Ariadna Rodríguez**, ACEMHH Damas, #25 en D-4 y en D-6.
- **Camila Magnoni**, ACEMHH Damas, #14 en D-4 y #85 en D-6.

Un nombre para confirmar: la planilla escribe **«Aguirre Lola»** y el plantel cargado dice
**Leila Magali Aguirre**. Mismo apellido, así que asumo que es la misma persona, pero
decilo vos.
