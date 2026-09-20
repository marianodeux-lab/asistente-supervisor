const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const geoExcelPath = path.join(projectRoot, 'Reportes/Datos/DireccionesARG_geocod.xlsx');
const photosDir = path.join(projectRoot, 'Reportes/Datos/Fotos PATAGONIA');
const outDataDir = path.join(projectRoot, 'src/data');
const outAvatarsDir = path.join(projectRoot, 'public/avatars');

if (!fs.existsSync(outAvatarsDir)) {
  fs.mkdirSync(outAvatarsDir, { recursive: true });
}

// 1. Copy photos and build avatar mapping
const photoFiles = fs.existsSync(photosDir) ? fs.readdirSync(photosDir) : [];
const avatarMap = {};

photoFiles.forEach(file => {
  const src = path.join(photosDir, file);
  const dest = path.join(outAvatarsDir, file);
  fs.copyFileSync(src, dest);
  
  // Create normalized keys for easy matching
  const baseName = file.replace(/\.[^/.]+$/, '').toLowerCase();
  const cleanKey = baseName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
  avatarMap[cleanKey] = `/avatars/${file}`;
});

console.log(`📸 Copied ${photoFiles.length} avatars to public/avatars/`);

// 2. Process Geocoded Coordinates from Excel
if (fs.existsSync(geoExcelPath)) {
  const wb = XLSX.readFile(geoExcelPath);
  const geoWs = wb.Sheets['GeoData'];
  const geoRows = XLSX.utils.sheet_to_json(geoWs);
  
  const baseWs = wb.Sheets['Base'];
  const baseRows = XLSX.utils.sheet_to_json(baseWs);
  
  const atmCoords = {};
  const localidadCoords = {};

  // Index base info by COD_EQUIPO and ATM
  const baseInfoMap = new Map();
  baseRows.forEach(r => {
    const cod = String(r['COD_EQUIPO'] || '').trim();
    const luno = String(r['SERIE_ATM'] || '').trim();
    const info = {
      cliente: r['CLIENTE_DESC'] || '',
      modelo: r['MODELO_DESC'] || '',
      marca: r['MARCA_DESC'] || '',
      localidad: r['LOCALIDAD'] || '',
      provincia: r['PROVINCIA'] || '',
      zona: r['ZONA_DESC'] || '',
      tecnico: r['TECNICO_ZONA'] || '',
      km: Number(r['KM'] || 0),
      region: r['REGIONTECNICO'] || ''
    };
    if (cod) baseInfoMap.set(cod, info);
    if (luno) baseInfoMap.set(luno, info);
  });

  // Extract valid Lat/Lng
  geoRows.forEach(r => {
    const atm = String(r['ATM'] || '').trim();
    if (!atm) return;
    
    let lat = Number(r['LAT NUEVA'] !== undefined && r['LAT NUEVA'] !== null ? r['LAT NUEVA'] : r['LATITUD']);
    let lng = Number(r['LONG NUEVA'] !== undefined && r['LONG NUEVA'] !== null ? r['LONG NUEVA'] : r['LONGITUD']);
    
    // Normalize coordinates if stored as large integers (e.g. -35978171 -> -35.978171)
    if (Math.abs(lat) > 90) lat = lat / 1000000;
    if (Math.abs(lng) > 180) lng = lng / 1000000;

    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      const loc = String(r['LOCALIDAD'] || '').trim();
      const prov = String(r['PROVINCIA'] || '').trim();
      const denom = String(r['DENOMINACION'] || '').trim();
      
      const extra = baseInfoMap.get(atm) || {};

      atmCoords[atm] = {
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        denom,
        localidad: loc || extra.localidad || '',
        provincia: prov || extra.provincia || '',
        zona: extra.zona || '',
        tecnico: extra.tecnico || '',
        km: extra.km || 0
      };

      // Store representative coordinates for each localidad
      if (loc && (!localidadCoords[loc.toLowerCase()] || localidadCoords[loc.toLowerCase()].count < 1)) {
        localidadCoords[loc.toLowerCase()] = {
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          nombre: loc,
          provincia: prov,
          count: 1
        };
      }
    }
  });

  const outputPayload = {
    totalAtmCount: Object.keys(atmCoords).length,
    atmCoords,
    localidadCoords,
    avatarMap
  };

  fs.writeFileSync(path.join(outDataDir, 'geoCoordinatesData.json'), JSON.stringify(outputPayload));
  console.log(`🗺️ Saved geoCoordinatesData.json with ${Object.keys(atmCoords).length} geocoded ATMs and ${Object.keys(localidadCoords).length} localities.`);
}
