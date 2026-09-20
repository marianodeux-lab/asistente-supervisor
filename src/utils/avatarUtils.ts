/**
 * Technician & Supervisor Avatar Resolver
 */

const AVATAR_MAP: Record<string, string> = {
  'alejandrojaviergarcia': '/avatars/Alejandro_Javier_García.png',
  'garciaalejandrojavier': '/avatars/Alejandro_Javier_García.png',
  'antoniogonzalezcabrera': '/avatars/Antonio_González_Cabrera.png',
  'gonzalezcabreraantonio': '/avatars/Antonio_González_Cabrera.png',
  'chiriello': '/avatars/Chiriello.png',
  'pablojavierchiriello': '/avatars/Chiriello.png',
  'chiriellopablojavier': '/avatars/Chiriello.png',
  'deusmariano': '/avatars/Deus_Mariano.png',
  'marianodeux': '/avatars/Deus_Mariano.png',
  'diegosebastiangodoy': '/avatars/Diego_Sebastián_Godoy.png',
  'godoydiego': '/avatars/Diego_Sebastián_Godoy.png',
  'fabianburatti': '/avatars/Fabián Buratti.png',
  'burattifabian': '/avatars/Fabián Buratti.png',
  'franciscoarielvicente': '/avatars/Francisco_Ariel_Vicente.png',
  'vicentefranciscoariel': '/avatars/Francisco_Ariel_Vicente.png',
  'joseangelmartos': '/avatars/José_Angel_Martos.png',
  'martosjoseangel': '/avatars/José_Angel_Martos.png',
  'juanmontiel': '/avatars/Juan_Montiel.png',
  'montieljuanfernando': '/avatars/Juan_Montiel.png',
  'leonardolazzaro': '/avatars/Leonardo Lázzaro.png',
  'lazzaroleonardo': '/avatars/Leonardo Lázzaro.png',
  'marcosalbertohernandez': '/avatars/Marcos_Alberto_Hernández.png',
  'hernandezmarcosalberto': '/avatars/Marcos_Alberto_Hernández.png',
  'martinaldayturriaga': '/avatars/Martin Aldayturriaga.png',
  'aldayturriagamartin': '/avatars/Martin Aldayturriaga.png',
  'martinallende': '/avatars/Martín_Allende.png',
  'allendemartinleandro': '/avatars/Martín_Allende.png',
  'matiashernancastano': '/avatars/Matías_Hernán_Castaño.png',
  'castanomatias': '/avatars/Matías_Hernán_Castaño.png',
  'pablofernandoibanez': '/avatars/PABLO FERNANDO IBAÑEZ.png',
  'ibanezpablofernando': '/avatars/PABLO FERNANDO IBAÑEZ.png'
};

function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Returns the URL path to the technician's photo, or a generated initial-based fallback avatar
 */
export function getTechnicianAvatar(name: string): string | null {
  if (!name) return null;
  const clean = normalizeName(name);
  
  // Direct match
  if (AVATAR_MAP[clean]) {
    return AVATAR_MAP[clean];
  }

  // Partial match
  for (const [key, url] of Object.entries(AVATAR_MAP)) {
    if (clean.includes(key) || key.includes(clean)) {
      return url;
    }
  }

  return null;
}

/**
 * Generates initials for technicians without a photo
 */
export function getInitials(name: string): string {
  if (!name) return 'ST';
  const parts = name.replace(/,/g, '').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
