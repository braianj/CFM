import { useState } from 'react'
import { SegmentedControl } from '../components/SegmentedControl'
import { TeamFilter } from '../components/TeamFilter'
import { getTeamsByCategory } from '../data/teams'
import { contrast, readToken } from './contrast'
import styles from './DesignSystem.module.css'

interface Swatch {
  token: string
  use: string
  on?: string
  min?: number
}

const palette: Swatch[] = [
  { token: 'bg', use: 'Fondo de la página' },
  { token: 'surface', use: 'Tarjetas y tablas' },
  { token: 'surface-muted', use: 'Pistas y chips neutros' },
  { token: 'border', use: 'Separadores' },
  { token: 'border-strong', use: 'Bordes de campo', on: 'surface', min: 3 },
  { token: 'ink', use: 'Texto principal', on: 'bg', min: 4.5 },
  { token: 'muted', use: 'Texto secundario', on: 'surface', min: 4.5 },
  { token: 'deep', use: 'Cabeceras oscuras', on: 'surface', min: 4.5 },
  { token: 'accent', use: 'Verde de marca', on: 'surface', min: 4.5 },
  { token: 'accent-dark', use: 'Texto y botones verdes', on: 'surface', min: 4.5 },
  { token: 'accent-soft', use: 'Relleno suave' },
  { token: 'accent-faint', use: 'Banda de clasificación' },
  { token: 'gold', use: 'Zona secundaria' },
  { token: 'live', use: 'En vivo', on: 'surface', min: 4.5 },
  { token: 'focus', use: 'Anillo de foco', on: 'surface', min: 3 },
]

const roles: { token: string; means: string }[] = [
  { token: 'state-selected', means: 'Relleno de lo que está elegido' },
  { token: 'state-selected-ink', means: 'Texto encima de lo elegido' },
  { token: 'state-selected-soft', means: 'Campo que quedó filtrado' },
  { token: 'state-selected-line', means: 'Texto y borde de ese campo' },
  { token: 'state-hover', means: 'Al pasar el mouse' },
  { token: 'state-idle-ink', means: 'Opción disponible sin elegir' },
]

function Ratio({ token, on, min }: { token: string; on?: string; min?: number }) {
  if (!on || !min) return <span className={styles.na}>—</span>
  const value = contrast(readToken(token), readToken(on))
  if (value === null) return <span className={styles.na}>sin medir</span>
  return (
    <span className={value >= min ? styles.pass : styles.fail}>
      {value.toFixed(2)}:1 {value >= min ? 'cumple' : 'no llega'}
    </span>
  )
}

export function DesignSystem() {
  const [scope, setScope] = useState('all')
  const [team, setTeam] = useState('all')
  const teams = [...getTeamsByCategory('men'), ...getTeamsByCategory('women')]

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <div className={styles.puck} aria-hidden="true">CFM</div>
        <div>
          <span>Sistema de diseño</span>
          <h1>CFM Ushuaia Hockey</h1>
        </div>
      </header>

      <p className={styles.lead}>
        Todo el color vive en <code>src/styles/global.css</code>. Primero la paleta, que son los
        colores en crudo. Encima los roles de interacción, que dicen qué significa cada uno. Los
        componentes usan los roles, nunca un color suelto: por eso «seleccionado» se ve igual en
        todas las pantallas.
      </p>

      <section className={styles.section}>
        <h2>Paleta</h2>
        <p className={styles.hint}>
          El contraste se mide contra el fondo donde se usa. El mínimo es 4.5:1 para texto y 3:1
          para bordes y foco. Se calcula en vivo con los valores del archivo.
        </p>
        <div className={styles.grid}>
          {palette.map((entry) => (
            <article className={styles.swatch} key={entry.token}>
              <div className={styles.chip} style={{ background: `var(--${entry.token})` }} />
              <div>
                <code>--{entry.token}</code>
                <p>{entry.use}</p>
                <Ratio token={entry.token} on={entry.on} min={entry.min} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2>Roles de interacción</h2>
        <div className={styles.grid}>
          {roles.map((entry) => (
            <article className={styles.swatch} key={entry.token}>
              <div className={styles.chip} style={{ background: `var(--${entry.token})` }} />
              <div>
                <code>--{entry.token}</code>
                <p>{entry.means}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2>Selección</h2>
        <p className={styles.hint}>
          Lo elegido se rellena con el verde de marca y texto blanco. Lo disponible queda sin
          relleno y en gris. Un campo que filtra la pantalla se tiñe de verde claro, para que se
          note que lo que estás viendo está recortado.
        </p>
        <div className={styles.demo}>
          <SegmentedControl
            label="Control segmentado"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'men', label: 'Masculino' },
              { value: 'women', label: 'Femenino' },
            ]}
          />
          <TeamFilter teams={teams} value={team} onChange={setTeam} />
          <p className={styles.hint}>
            Elegí un equipo arriba: el campo cambia de color mientras el filtro está activo.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Botones</h2>
        <div className={styles.buttons}>
          <button type="button" className={styles.primary}>Acción principal</button>
          <button type="button" className={styles.secondary}>Secundaria</button>
          <button type="button" className={styles.danger}>Destructiva</button>
          <button type="button" className={styles.primary} disabled>Deshabilitada</button>
        </div>
        <p className={styles.hint}>Todos usan el mismo anillo de foco al navegar con teclado.</p>
      </section>

      <section className={styles.section}>
        <h2>Estados de un partido</h2>
        <div className={styles.states}>
          <span className={styles.upcoming}>Próximo</span>
          <span className={styles.liveChip}>En vivo</span>
          <span className={styles.finished}>Finalizado</span>
          <span className={styles.role}>GK</span>
        </div>
        <p className={styles.hint}>
          El rojo se reserva para «en vivo». No se usa como color decorativo en ningún otro lado.
        </p>
      </section>

      <a className={styles.back} href="./">Volver al sitio</a>
    </main>
  )
}
