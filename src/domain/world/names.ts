/**
 * Univers fictif (UNIV-01) : clubs, stades, joueurs et compétitions parodiques.
 * Aucun nom ne doit renvoyer à une marque, un club ou une personne réelle.
 */

export interface ClubIdentity {
  name: string;
  /** Abréviation de 3 ou 4 lettres pour les tableaux de score. */
  shortName: string;
}

export const CLUB_IDENTITIES: readonly ClubIdentity[] = [
  { name: 'AS Saint-Pastis', shortName: 'ASSP' },
  { name: 'Olympique de Biroute-sur-Loire', shortName: 'OBL' },
  { name: 'FC Gueule-de-Bois', shortName: 'FCGB' },
  { name: 'Racing Club de Picon-les-Bains', shortName: 'RCPB' },
  { name: 'Stade Ricardien', shortName: 'STR' },
  { name: 'US Trou-Normand', shortName: 'USTN' },
  { name: 'Sporting Club de la Buvette', shortName: 'SCB' },
  { name: 'AC Tournée-Générale', shortName: 'ACTG' },
  { name: 'Entente Apéro-Saucisson', shortName: 'EAS' },
  { name: 'FC Cul-Sec', shortName: 'FCCS' },
  { name: 'Dynamo Rosé-Pamplemousse', shortName: 'DRP' },
  { name: 'Real Pétanque-sur-Mer', shortName: 'RPM' },
  { name: 'AS Mollet-de-Coq', shortName: 'ASMC' },
  { name: 'Union Sportive des Trois-Grammes', shortName: 'UTG' },
  { name: 'Inter de Saint-Glinglin', shortName: 'ISG' },
  { name: 'Olympique Pochtron', shortName: 'OPO' },
  { name: 'FC Troisième-Mi-Temps', shortName: 'FCMT' },
  { name: 'AS Tire-Bouchon', shortName: 'ASTB' },
  { name: 'Stade de Chope-en-Brie', shortName: 'SCEB' },
  { name: 'Club Athlétique de Ventre-à-Bière', shortName: 'CAVB' },
  { name: 'FC Petit-Jaune', shortName: 'FCPJ' },
  { name: 'Sporting de Bourré-le-Château', shortName: 'SBC' },
  { name: 'US Fond-de-Cuve', shortName: 'USFC' },
  { name: 'Athlético Kir-Royal', shortName: 'AKR' },
  { name: 'Racing Bar-Tabac', shortName: 'RBT' },
  { name: 'AS Fesses-Molles', shortName: 'ASFM' },
  { name: 'FC Slip-Kangourou', shortName: 'FCSK' },
  { name: 'Olympique de Saint-Rototo', shortName: 'OSR' },
  { name: 'Union de la Cuite', shortName: 'UDC' },
  { name: 'Entente Pinard-et-Fromage', shortName: 'EPF' },
  { name: 'FC Chaussette-Humide', shortName: 'FCCH' },
  { name: 'AS Mal-aux-Cheveux', shortName: 'AMC' },
  { name: 'Stade Lendemain-de-Veille', shortName: 'SLV' },
  { name: 'FC Buvette-Fermée', shortName: 'FCBF' },
  { name: 'AS Moustache-sur-Seine', shortName: 'AMS' },
  { name: 'Racing Club de Coup-du-Rouge', shortName: 'RCCR' },
  { name: 'US Plouc-les-Vaches', shortName: 'UPV' },
  { name: 'Olympique de Bidon-sur-Bière', shortName: 'OBB' },
  { name: 'FC Tabouret-de-Bar', shortName: 'FCTB' },
  { name: 'AS Gros-Rouge', shortName: 'ASGR' },
  { name: 'Sporting Club du Panaché', shortName: 'SCP' },
  { name: 'Entente Saint-Glouglou', shortName: 'ESG' },
  { name: 'FC Demi-Pression', shortName: 'FCDP' },
  { name: 'Stade de la Ripaille', shortName: 'SDR' },
  { name: 'US Trou-Perdu', shortName: 'USTP' },
  { name: 'AS Bérézina-les-Bains', shortName: 'ABB' },
  { name: 'FC Merguez-Frites', shortName: 'FCMF' },
  { name: 'Olympique de Gratte-Fesses', shortName: 'OGF' },
  { name: 'Racing Pastaga', shortName: 'RPA' },
  { name: 'AS Vin-Chaud-des-Neiges', shortName: 'AVCN' },
  { name: 'FC Sieste-Prolongée', shortName: 'FCSP' },
  { name: 'Dynamo Chope-Pleine', shortName: 'DCP' },
];

/** Stades miteux attribués aux clubs de l'IA. */
export const STADIUM_NAMES: readonly string[] = [
  'Stade de la Mare aux Canards',
  'Terrain annexe derrière la salle des fêtes',
  'Parc des Bouses',
  'Stade du Pré-Mouillé',
  'Champ de Monsieur Gaston',
  'Stade de la Buvette Fleurie',
  'Arène du Tracteur Rouillé',
  'Stade des Taupinières',
  'Terrain stabilisé de la Déchetterie',
  'Stade municipal (enfin, ce qu’il en reste)',
  'Stade Georgette-Pinard',
  'Le Chaudron Tiède',
  'Stade du Lavoir',
  'Pelouse de l’Étang aux Moustiques',
  'Stade de la Fosse Septique',
  'Enceinte Lucien-Ballochard',
  'Stade du Parking de la Supérette',
  'Complexe sportif des Orties',
  'Stade du Poteau Penché',
  'Terrain de la Ferme aux Oies',
];

/** UNIV-02 : le club du coach commence dans la boue, avec des vestiaires qui fuient. */
export const HUMAN_CLUB_STADIUM = 'Stade municipal du Bourbier (terrain boueux, buvette en préfabriqué, vestiaires qui fuient)';

export const FIRST_NAMES: readonly string[] = [
  'Jean-Mi', 'Kévin', 'Dédé', 'Jojo', 'Bébert', 'Momo', 'Riton', 'Gégé', 'Titi', 'Fredo',
  'Lulu', 'Nono', 'Polo', 'Toto', 'Mimile', 'Jeannot', 'Gaston', 'Raymond', 'Marcel', 'Dylan',
  'Brandon', 'Jordan', 'Steeve', 'Jean-Kévin', 'Jean-Claude', 'Loulou', 'Pierrot', 'Pascal', 'Jacky', 'Ludo',
  'Doudou', 'Fanfan', 'Bichette', 'Kiki', 'Totor', 'Nanard', 'Jean-Pat', 'Fifi', 'Mumu', 'Roro',
];

export const LAST_NAMES: readonly string[] = [
  'Pastaga', 'Glouglou', 'Ballochard', 'Tirebouchon', 'Lapinte', 'Grogosier', 'Pinardeau', 'Boitsanssoif',
  'Lamousse', 'Trinquet', 'Sifflard', 'Ventrebleu', 'Grosmollet', 'Dubidon', 'Lacuite', 'Rototo',
  'Dutonneau', 'Delapression', 'Lebouchon', 'Crampon', 'Soiffard', 'Picrate', 'Lagnôle', 'Sauciflard',
  'Merguez', 'Bourrichon', 'Tapedur', 'Ladalle', 'Fessard', 'Gratouille', 'Pétoncle', 'Mollasson',
  'Cassoulet', 'Lagrolle', 'Boudin', 'Rillette', 'Paupiette', 'Tartiflette', 'Descente', 'Cuvée',
  'Lebidou', 'Pochard', 'Grandgosier', 'Chopinette', 'Rinçette', 'Dufût', 'Lavinasse', 'Beaujolpif',
];

/** Divisions de l'élite (rang 1) au district (dernier rang), UNIV-03. */
export const DIVISION_NAMES: readonly string[] = [
  'Première Division Pastaga',
  'Division d’Honneur de la Buvette',
  'Promotion de la Troisième Mi-Temps',
  'District des Bourbiers',
];

/** Coupe à élimination directe ouverte à tous les clubs (UNIV-06). */
export const CUP_NAME = 'Coupe du Comptoir';
