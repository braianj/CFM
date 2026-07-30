import type { Category, Player, PlayerRole } from '../types/tournament'

// Official rosters submitted by each club for the Copa Fin del Mundo 2026.
// Some registration sheets also carry identity documents and birth dates. Those are
// deliberately not stored here: the site never needs them.
// Jersey numbers are not stored either. They belong to a player's match roster
// entry, because a player may use a different number in every match.

type RosterEntry = string | [name: string, role: PlayerRole]

const slug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const roster = (category: Category, teamId: string, entries: RosterEntry[]): Player[] =>
  entries.map((entry) => {
    const [name, role] = typeof entry === 'string' ? [entry, undefined] : entry
    return { id: `${teamId}-${slug(name)}`, category, teamId, name, ...(role && { role }), active: true }
  })

export const players: Player[] = [
  ...roster('men', 'men-cau-1', [
    ['Marcelo Zayas', 'GK'],
    'Nicolas Piccone',
    'Federico Leuenberger',
    'Pedro Baeza',
    'Francisco Carrion',
    'Mauricio Bergeonneau',
    'Agustin Quiroga',
    'Francisco Magnelli',
    'Nicolas Veron',
    'Leandro Avila',
    'Braian Mellor',
    'Ezequiel Galar',
    'Juan Alejandro Baeza',
    'Facundo Lapertosa',
  ]),
  ...roster('men', 'men-cau-2', [
    ['Francisco Zunino', 'GK'],
    ['Matias Ignacio Vasquez', 'GK'],
    'Agustin Ceravolo',
    'Rodrigo Veuthey',
    'Javier Siede',
    'Adolfo German Sueldo',
    'Ignacio Silva',
    'Nicolas Shendera',
    'Valentín Encinas Camacho',
    'Thiago Schulz',
    'Cristian Legal',
    'Kevin Sueldo',
    'Joaquin Cuitiño',
    'Agustin Marsico',
    'Lautaro Muñoz',
    'Ramiro Beltrami',
  ]),
  ...roster('men', 'men-cau-3', [
    ['Joaquin Bernales', 'GK'],
    'Alejo Piccolini',
    'Martin Baeza',
    'Fermin Lopez Silva',
    'Teo Porco Fischer',
    'Luciano Velasquez',
    'Francisco Val',
    'Tristan Boersma',
    'Matias Soto',
    'Facundo Melchior',
    'Mateo Lopez Silva',
    'Ivan Shendera',
    ['Juan Lapertosa', 'GK'],
    // Debutó en H-8; no figuraba en la hoja de inscripción original.
    'Uriel Puig',
  ]),
  ...roster('men', 'men-los-nires', [
    ['Nicolas Badaracco', 'GK'],
    ['Jose Emir Romero', 'A'],
    'Unai Correa',
    'Nicolas La Greca Katabian',
    'Ariel David Cicka',
    ['Santiago Romero', 'A'],
    ['Leandro Zahr', 'C'],
    'Cristian Javier Simari Birkner',
    'Marcelo Alejandro Vaca',
    'Santiago Martin Molinolo',
    'Agustín José Ludovico',
    'Luis Misael Harambour Urbina',
    'Renzo Clementino Varga',
    'Santiago Frungieri',
    'Jose Antonio Diaz Chavez',
    'Eduardo Daniel Quiroz Ovalle',
  ]),
  ...roster('men', 'men-allpacas', [
    'Dustin Cecil Dallas Barr',
    ['Jonathan Gomez Dominguez', 'C'],
    ['Robert William Lalonde', 'A'],
    'Arturo Ochoa Mena',
    'Leando Matias Jofre',
    'Braian Gaston Aravena',
    'Julian Cuestas',
    'Josue Rojas Vegas',
    'Sebastien Grenier',
    'Daniel Quiros Delgado',
    ['Lucas Antonio Matus Blank', 'A'],
    'Ian Alonso Matus Blank',
    ['Luis Diego Chavarria Umaña', 'GK'],
    'Gian Valentino Cervini',
  ]),
  ...roster('men', 'men-ovejas-negras', [
    ['Octavio La Terza', 'GK'],
    'Leandro Diaz Guerra',
    'Juan Manuel Martinez',
    'Martin Firmapaz',
    'Pedro Leandro Gando',
    'Mauro Giuffo',
    'Marcos Sessa',
    'Fabricio Rivas',
    'Axel Emerson',
    'Lisandro Carillo',
    'Sebastian Okier',
    'Enrique Leib',
    'Pablo Guajardo',
  ]),
  ...roster('women', 'women-cau-kipas', [
    ['Morena Ottavis', 'GK'],
    ['Cecilia Guillamet Chargue', 'C'],
    'Barbara Aguado',
    'Daniela Alvarado',
    'Maura Abrahan',
    'Agustina Varaona',
    'Martina Echazu',
    'Celeste Mastracchio',
    'Mia Wolfsteller',
    'Nadine Guete',
    'Ema Luna Dapozo',
    'Yesica Flecha',
    'Maria Luisa Berola',
    'Maria Florencia Cotignola',
    'Ana Josefina Tibaudin',
  ]),
  ...roster('women', 'women-allpacas', [
    ['Alice Charlotte Claire Osmaston', 'A'],
    'Lizeth Patricia Molina Alvizuri',
    'Morgan Elizabeth Lypka',
    ['Gisella Ramos Vasquez', 'C'],
    'Silvia Alvarado Wu',
    ['Valentina Gonzalez Baccaiani', 'A'],
    'Iara Agostina Catrileo Mansilla',
    ['Zoe Diaz', 'GK'],
    'Elena Garcia Rosmanich',
  ]),
  ...roster('women', 'women-ovejas-negras', [
    ['Paula Balboa', 'GK'],
    'Victoria Castarés',
    'Magali Repetto',
    'Melisa Naumann',
    'Jesica Carimatto',
    'Yamila Tozzi',
    'Antonela Villavicencio',
    'Merlina Bottero',
    'Camila Mazzucchelli',
    'Giovanna Reccia',
    'Fatima Arano',
  ]),
  ...roster('women', 'women-acemhh', [
    ['Noelia Soledad DeMichelli', 'GK'],
    ['Romina Mariel Detto', 'A'],
    'Paula Olivera',
    ['Leila Magali Aguirre', 'C'],
    'Manuela Altamura',
    ['Camila Di Stefano', 'A'],
    'Magdalena Ester Harambour Urbina',
    'Isabel Yazmina Tejeda Gonzalez',
    // Ambas figuran en las planillas de D-4 y D-6 y no en la hoja de inscripción.
    'Ariadna Rodriguez',
    'Camila Magnoni',
  ]),
  ...roster('women', 'women-los-nires-zorras', [
    ['Ailin Melisa Aquino', 'A'],
    ['Catalina Lujan Bianciotto', 'A'],
    'Maria Victoria Seru Campos',
    'Carolina Sigel',
    'Margarita Schiavini',
    'Mia Antonella Valdebenito Casariego',
    'Guillermina Gowland',
    'Aitana Castillo Maiset',
    ['Ana Carbone', 'C'],
    ['Milagros Cavalleri', 'GK'],
  ]),
]

export const getPlayersByTeam = (teamId: string) =>
  players.filter((player) => player.teamId === teamId)
