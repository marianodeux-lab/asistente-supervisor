const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const outDir = path.resolve('src/data');

// 1. Process updated Zonas Técnicos
const fileZonas = path.resolve('Reportes/Base Instalada/Zonas Técnicos.xlsx');
const wbZonas = XLSX.readFile(fileZonas);
const wsZonas = wbZonas.Sheets[wbZonas.SheetNames[0]];
const rawZonas = XLSX.utils.sheet_to_json(wsZonas, { defval: '' });

const tecnicosZonasRef = [];
rawZonas.forEach((r) => {
  const tec = String(r['TECNICO ZONA'] || '').trim();
  const zona = String(r['ZONA TÉCNICA'] || '').trim();
  if (!tec || !zona || tec.toLowerCase() === 'total') return;

  const region = String(r['REGIÓN'] || '').trim();
  const subzona = String(r['Zona Local'] || '').trim();
  const atm = Number(r['ATM']) || 0;
  const ctd = Number(r['Cash Today']) || 0;
  const total = Number(r['Sub-Total']) || (atm + ctd);

  tecnicosZonasRef.push({
    tecnico: tec,
    codigoZona: zona,
    region,
    zonaLocal: subzona,
    baseAtm: atm,
    baseCtd: ctd,
    subTotal: total
  });
});

fs.writeFileSync(path.join(outDir, 'zonasTecnicosReferencia.json'), JSON.stringify(tecnicosZonasRef, null, 2));
console.log(`✅ Zonas Técnicos actualizado: ${tecnicosZonasRef.length} registros guardados.`);

// 2. Process Base Instalada Monthly Files (Enero - Agosto 2026)
const dir2026 = path.resolve('Reportes/Base Instalada/2026/2026');
const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto'];
const monthlyBases = [];

const supervisedZones = new Set(tecnicosZonasRef.map(t => t.codigoZona.toUpperCase()));
const supervisedTecnicos = new Set(tecnicosZonasRef.map(t => t.tecnico.toUpperCase()));

monthNames.forEach(mName => {
  const fPath = path.join(dir2026, `${mName}.xlsx`);
  if (!fs.existsSync(fPath)) return;
  const wbM = XLSX.readFile(fPath);
  const sheetName = wbM.SheetNames.includes('BASE') ? 'BASE' : wbM.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wbM.Sheets[sheetName], { defval: '' });

  const supervisedRows = rows.filter(r => {
    const z = String(r['ZONA_DESC'] || r['ZONA TÉCNICA'] || '').toUpperCase();
    const t = String(r['TECNICO_ZONA'] || r['TECNICO'] || '').toUpperCase();
    return supervisedZones.has(z) || supervisedTecnicos.has(t);
  });

  const equipos = supervisedRows.map(r => {
    const rawNeg = String(r['NEGOCIO'] || r['NEG'] || '').trim().toUpperCase();
    const modeloDesc = String(r['MODELO_DESC'] || r['MODELO'] || '').trim().toUpperCase();
    let negocio = rawNeg;
    if (!negocio || negocio === '') {
      if (modeloDesc.includes('SNBC') || modeloDesc.includes('CIMA') || modeloDesc.includes('GUNNEBO') || modeloDesc.includes('SMART') || modeloDesc.includes('GLORY')) {
        negocio = 'CTD';
      } else {
        negocio = 'ATM';
      }
    }

    return {
      id: String(r['COD_EQUIPO'] || r['NUMER'] || r['SERIE_ATM'] || '').trim(),
      serie: String(r['SERIE_ATM'] || '').trim(),
      cliente: String(r['CLIENTE_DESC'] || r['CLIENTE'] || 'Cliente').trim(),
      modelo: String(r['MODELO_DESC'] || r['MODELO'] || '-').trim(),
      marca: String(r['MARCA_DESC'] || '').trim(),
      negocio,
      zona: String(r['ZONA_DESC'] || '').trim(),
      tecnico: String(r['TECNICO_ZONA'] || '').trim(),
      localidad: String(r['LOCALIDAD'] || '').trim(),
      direccion: String(r['DENOMINACION'] || '').trim(),
      ubicacion: String(r['UBICACION'] || '').trim(),
      provincia: String(r['PROVINCIA'] || '').trim(),
      red: String(r['RED'] || '').trim(),
      esquema: String(r['ESQUEMA'] || '').trim(),
      habilitado: String(r['H'] || 'S').trim()
    };
  });

  const countAtm = equipos.filter(e => e.negocio === 'ATM').length;
  const countCtd = equipos.filter(e => e.negocio !== 'ATM').length;

  monthlyBases.push({
    mes: mName,
    totalSupervisado: equipos.length,
    atm: countAtm,
    ctd: countCtd,
    equipos
  });
});

// 3. Compute Month-over-Month ABM
const abmHistory = [];
for (let i = 1; i < monthlyBases.length; i++) {
  const prevMonth = monthlyBases[i - 1];
  const currMonth = monthlyBases[i];

  const prevMap = new Map(prevMonth.equipos.map(e => [e.id || e.serie, e]));
  const currMap = new Map(currMonth.equipos.map(e => [e.id || e.serie, e]));

  const altas = [];
  const bajas = [];
  const modificaciones = [];

  for (const [key, eq] of currMap.entries()) {
    if (!prevMap.has(key)) {
      altas.push(eq);
    } else {
      const prevEq = prevMap.get(key);
      const changes = [];
      if (prevEq.tecnico !== eq.tecnico) changes.push({ campo: 'Técnico', antes: prevEq.tecnico, despues: eq.tecnico });
      if (prevEq.zona !== eq.zona) changes.push({ campo: 'Zona', antes: prevEq.zona, despues: eq.zona });
      if (prevEq.cliente !== eq.cliente) changes.push({ campo: 'Cliente', antes: prevEq.cliente, despues: eq.cliente });
      if (prevEq.modelo !== eq.modelo) changes.push({ campo: 'Modelo', antes: prevEq.modelo, despues: eq.modelo });
      if (changes.length > 0) {
        modificaciones.push({ equipo: eq, changes });
      }
    }
  }

  for (const [key, eq] of prevMap.entries()) {
    if (!currMap.has(key)) {
      bajas.push(eq);
    }
  }

  abmHistory.push({
    periodo: `${prevMonth.mes} → ${currMonth.mes}`,
    mesActual: currMonth.mes,
    mesAnterior: prevMonth.mes,
    totalAnterior: prevMonth.totalSupervisado,
    totalActual: currMonth.totalSupervisado,
    variacionNeta: currMonth.totalSupervisado - prevMonth.totalSupervisado,
    altasCount: altas.length,
    bajasCount: bajas.length,
    modificacionesCount: modificaciones.length,
    altasDetalle: altas,
    bajasDetalle: bajas,
    modificacionesDetalle: modificaciones
  });
}

const finalAbmPayload = {
  resumenMensual: monthlyBases.map(m => ({
    mes: m.mes,
    total: m.totalSupervisado,
    atm: m.atm,
    ctd: m.ctd
  })),
  historialAbm: abmHistory,
  baseActualAgosto: monthlyBases[monthlyBases.length - 1]
};

fs.writeFileSync(path.join(outDir, 'baseInstaladaAbmData.json'), JSON.stringify(finalAbmPayload, null, 2));
console.log(`✅ Base Instalada ABM generado con éxito. Periodos ABM: ${abmHistory.length}`);
