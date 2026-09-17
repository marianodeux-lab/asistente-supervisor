const susp = require('../src/data/analisisSuspendidosData.json');
const base = require('../src/data/baseInstaladaClientesData.json');
const stockFijo = require('../src/data/stockFijoData.json');

console.log('--- REVENUE / ATENDIDOS ---');
console.log('Total pedidos:', susp.length);
const withRep = susp.filter(r => (String(r['Utiliza Repuesto'] || '')).toLowerCase() === 'sí' || (String(r['Utiliza Repuesto'] || '')).toLowerCase() === 'si');
console.log('Con repuesto:', withRep.length, '(', (withRep.length/susp.length*100).toFixed(1), '%)');

console.log('\n--- TOP 10 REPUESTOS ---');
const repMap = {};
let totalRepuestosUsados = 0;
susp.forEach(r => {
  const pn = String(r['PN INSTALA'] || '').trim();
  const desc = String(r['PN DESCRIPCION'] || '').trim();
  if (pn && pn !== '-' && pn !== '0' && pn.toLowerCase() !== 'sin repuesto' && pn.toLowerCase() !== 'undefined') {
    const key = pn + '|||' + desc;
    repMap[key] = (repMap[key] || 0) + 1;
    totalRepuestosUsados++;
  }
});
const sortedRep = Object.entries(repMap).sort((a,b) => b[1] - a[1]);
console.log('Total repuestos distintos:', sortedRep.length);
console.log('Total unidades de repuestos instaladas:', totalRepuestosUsados);
sortedRep.slice(0, 10).forEach(([k, c], i) => {
  const [pn, desc] = k.split('|||');
  const pct = ((c / totalRepuestosUsados) * 100).toFixed(1);
  console.log(`${i+1}. [${pn}] ${desc}: ${c} usos (${pct}%)`);
});

console.log('\n--- TECNICOS Y EFECTIVIDADES ---');
// Let's analyze technicians
const tecMap = {};
susp.forEach(r => {
  const tec = String(r['TECNICO ASISTIO'] || r['TECNICO ZONA'] || 'Sin Asignar').trim();
  if (!tec || tec === 'Sin Asignar') return;
  if (!tecMap[tec]) {
    tecMap[tec] = {
      tecnico: tec,
      zona: r['ZONA LOCAL'] || r['Zona Local'] || 'Sin Zona',
      pedidos: [],
      mpList: [],
      conRepuesto: 0,
      repuestosUsados: 0,
      primerVisitaOk: 0,
      reincidentes: 0,
      repuestosEnSF: 0
    };
  }
  tecMap[tec].pedidos.push(r);
});

// Build Stock Fijo set for each tech
const stockFijoByTech = {};
stockFijo.forEach(sf => {
  const techNorm = String(sf.tecnico || '').trim().toLowerCase();
  if (!stockFijoByTech[techNorm]) stockFijoByTech[techNorm] = new Set();
  const pnClean = String(sf.pn || '').trim().toUpperCase();
  stockFijoByTech[techNorm].add(pnClean);
});

// Also ATM timeline for 60-day MP effectiveness
// Sort all service calls by ATM and Date
function parseDate(dStr) {
  if (!dStr) return null;
  // formats like "DD/MM/YYYY HH:mm" or "YYYY-MM-DD"
  if (typeof dStr === 'number') return new Date(dStr);
  const parts = String(dStr).split(/[\s/:]+/);
  if (parts.length >= 3) {
    // DD/MM/YYYY
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  const dt = new Date(dStr);
  return isNaN(dt.getTime()) ? null : dt;
}

const atmCalls = {};
susp.forEach(r => {
  const atm = String(r.ATM || '').trim();
  if (!atm) return;
  if (!atmCalls[atm]) atmCalls[atm] = [];
  const dt = parseDate(r['MARCA INICIO'] || r['MARCA FIN'] || r['MARCA ALTA']);
  const concepto = String(r['CONCEPTO LLAMADA'] || '').toUpperCase();
  atmCalls[atm].push({
    pedido: r.PEDIDO,
    dt,
    concepto,
    esMp: concepto.includes('PREVENTIVO') || concepto.includes('MP'),
    esFalla: concepto.includes('SERVICE') || concepto.includes('SC') || concepto.includes('RECLAMO') || concepto.includes('CORRECTIVO')
  });
});

// Compute metrics for each tech
const techSummary = [];
for (const [tec, data] of Object.entries(tecMap)) {
  const norm = tec.toLowerCase();
  const techSfSet = stockFijoByTech[norm] || new Set();

  let pedidosAtendidos = data.pedidos.length;
  let reincidentesCount = 0;
  let mpCount = 0;
  let mpSinFalla60d = 0;
  let repuestosUsadosCount = 0;
  let pedidosConRepuesto = 0;
  let repuestosEnSfCount = 0;

  data.pedidos.forEach(r => {
    const recurrente = String(r['FALLA RECURRENTE'] || '').trim().toUpperCase();
    if (recurrente === 'S' || recurrente === 'SI' || recurrente === 'SÍ') {
      reincidentesCount++;
    }

    const concepto = String(r['CONCEPTO LLAMADA'] || '').toUpperCase();
    const esMp = concepto.includes('PREVENTIVO') || concepto.includes('MP');
    if (esMp) {
      mpCount++;
      // Check next 60 days on this ATM
      const atm = String(r.ATM || '').trim();
      const mpDate = parseDate(r['MARCA INICIO'] || r['MARCA FIN'] || r['MARCA ALTA']);
      if (mpDate && atmCalls[atm]) {
        const fallasPostMp = atmCalls[atm].filter(c => {
          if (!c.esFalla || !c.dt) return false;
          const diffDays = (c.dt.getTime() - mpDate.getTime()) / (1000 * 3600 * 24);
          return diffDays > 0.05 && diffDays <= 60;
        });
        if (fallasPostMp.length === 0) {
          mpSinFalla60d++;
        }
      } else {
        // If no date or no other calls, it didn't fail
        mpSinFalla60d++;
      }
    }

    const usaRep = (String(r['Utiliza Repuesto'] || '')).toLowerCase() === 'sí' || (String(r['Utiliza Repuesto'] || '')).toLowerCase() === 'si';
    const pnInstala = String(r['PN INSTALA'] || '').trim().toUpperCase();
    if (usaRep && pnInstala && pnInstala !== '-' && pnInstala !== '0') {
      pedidosConRepuesto++;
      repuestosUsadosCount++;
      // check if in stock fijo
      if (techSfSet.has(pnInstala)) {
        repuestosEnSfCount++;
      }
    }
  });

  const efectividadPrimeraVisita = pedidosAtendidos > 0 
    ? (((pedidosAtendidos - reincidentesCount) / pedidosAtendidos) * 100).toFixed(1)
    : '100.0';

  const efectividadMp = mpCount > 0
    ? ((mpSinFalla60d / mpCount) * 100).toFixed(1)
    : '100.0';

  const pctRepuestosEnSf = pedidosConRepuesto > 0
    ? ((repuestosEnSfCount / pedidosConRepuesto) * 100).toFixed(1)
    : '0.0';

  techSummary.push({
    tecnico: tec,
    zona: data.zona,
    pedidosAtendidos,
    efectividadPrimeraVisita: parseFloat(efectividadPrimeraVisita),
    mpCount,
    efectividadMp: parseFloat(efectividadMp),
    repuestosUsadosCount,
    pedidosConRepuesto,
    repuestosEnSfCount,
    pctRepuestosEnSf: parseFloat(pctRepuestosEnSf)
  });
}

techSummary.sort((a,b) => b.pedidosAtendidos - a.pedidosAtendidos);
console.log('Top 10 Técnicos:');
techSummary.slice(0, 10).forEach(t => {
  console.log(`${t.tecnico} (${t.zona}): ${t.pedidosAtendidos} pedidos | 1a Visita: ${t.efectividadPrimeraVisita}% | MPs: ${t.mpCount} (Efect: ${t.efectividadMp}%) | Rep: ${t.repuestosUsadosCount} | En SF: ${t.pctRepuestosEnSf}% (${t.repuestosEnSfCount}/${t.pedidosConRepuesto})`);
});
