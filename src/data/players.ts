import type { Category, Player } from '../types/tournament'

// Official rosters submitted by each club for the Copa Fin del Mundo 2026.
// The registration sheets also carry identity documents and birth dates. Those are
// deliberately not stored here: the site never needs them.
// Jersey numbers are not stored either. They belong to a player's match roster
// entry, because a player may use a different number in every match.

const slug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const roster = (category: Category, teamId: string, names: string[]): Player[] =>
  names.map((name) => ({ id: `${teamId}-${slug(name)}`, category, teamId, name, active: true }))

export const players: Player[] = [
  ...roster('men', 'men-los-nires', [
    'Nicolas Badaracco',
    'Jose Emir Romero',
    'Unai Correa',
    'Nicolas La Greca Katabian',
    'Ariel David Cicka',
    'Santiago Romero',
    'Leandro Zahr',
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
    'Jonathan Gomez Dominguez',
    'Robert William Lalonde',
    'Arturo Ochoa Mena',
    'Leando Matias Jofre',
    'Braian Gaston Aravena',
    'Julian Cuestas',
    'Josue Rojas Vegas',
    'Sebastien Grenier',
    'Daniel Quiros Delgado',
    'Lucas Antonio Matus Blank',
    'Ian Alonso Matus Blank',
    'Luis Diego Chavarria Umaña',
    'Gian Valentino Cervini',
  ]),
  ...roster('women', 'women-allpacas', [
    'Alice Charlotte Claire Osmaston',
    'Lizeth Patricia Molina Alvizuri',
    'Morgan Elizabeth Lypka',
    'Gisella Ramos Vasquez',
    'Silvia Alvarado Wu',
    'Valentina Gonzalez Baccaiani',
    'Iara Agostina Catrileo Mansilla',
    'Zoe Diaz',
    'Elena Garcia Rosmanich',
  ]),
  ...roster('women', 'women-los-nires-zorras', [
    'Ailin Melisa Aquino',
    'Catalina Lujan Bianciotto',
    'Maria Victoria Seru Campos',
    'Carolina Sigel',
    'Margarita Schiavini',
    'Mia Antonella Valdebenito Casariego',
    'Guillermina Gowland',
    'Aitana Castillo Maiset',
    'Ana Carbone',
    'Milagros Cavalleri',
  ]),
  ...roster('women', 'women-acemhh', [
    'Noelia Soledad DeMichelli',
    'Romina Mariel Detto',
    'Paula Olivera',
    'Leila Magali Aguirre',
    'Manuela Altamura',
    'Camila Di Stefano',
    'Magdalena Ester Harambour Urbina',
    'Isabel Yazmina Tejeda Gonzalez',
  ]),
]

export const getPlayersByTeam = (teamId: string) =>
  players.filter((player) => player.teamId === teamId)
