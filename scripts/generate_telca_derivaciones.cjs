const fs = require('fs');
const path = require('path');

const suspPath = path.join(__dirname, '../src/data/analisisSuspendidosData.json');
const telcaPath = path.join(__dirname, '../src/data/analisisTelcaData.json');

const susp = JSON.parse(fs.readFileSync(suspPath, 'utf8'));
const telca = JSON.parse(fs.readFileSync(telcaPath, 'utf8'));

function parseDate(str) {
  if (!str) return null;
  const parts = str.split(/[\s/:]+/);
  if (parts.length >= 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    const hh = parts[3] ? parseInt(parts[3], 10) : 0;
    const mm = parts[4] ? parseInt(parts[4], 10) : 0;
    return new Date(y, m, d, hh, mm).getTime();
  }
  return null;
}

// 1. Build lookup for Suspendidos
const suspByPedido = {};
const suspByAtm = {};

susp.forEach(r => {
  const p = String(r.PEDIDO || r.Pedido || '').trim();
  if (p && p !== '0' && p !== '101000000') {
    suspByPedido[p] = r;
  }
  const atm = String(r.ATM || r['ATM ID'] || '').replace(/^0+/, '');
  const t = parseDate(r['MARCA ALTA'] || r['Fecha Alta']);
  if (atm && t) {
    if (!suspByAtm[atm]) suspByAtm[atm] = [];
    suspByAtm[atm].push({ record: r, time: t });
  }
});

let directCount = 0;
let otCount = 0;
let sameAtm24hCount = 0;

const derivaciones = {};

telca.forEach(r => {
  const p = String(r.PEDIDO || r.Pedido || '').trim();
  if (!p) return;

  const text = (r['DETALLE FALLA'] || '') + ' ' + (r['OBSERVACIONES CONTROL'] || '');
  const atm = String(r.ATM || r['ATM ID'] || '').replace(/^0+/, '');
  const tDate = parseDate(r['MARCA ALTA'] || r['Fecha Alta'] || r['MARCA FIN']);

  // Match 1: Direct Pedido Match (same ID)
  if (p !== '101000000' && suspByPedido[p]) {
    const s = suspByPedido[p];
    derivaciones[p] = {
      isDerivado: true,
      tipoMatch: 'Nº Pedido Directo',
      pedidoCampo: p,
      fechaCampo: s['MARCA ALTA'] || s['Fecha Alta'] || '',
      tecnicoCampo: s['TECNICO ASISTIO'] || s['TECNICO ZONA'] || '',
      fallaCampo: s['DETALLE FALLA'] || s['Falla Informada'] || '',
      zonaCampo: s['ZONA LOCAL'] || '',
      codCierreCampo: s['CODIGO CIERRE'] || s['Cod Cierre'] || ''
    };
    directCount++;
    return;
  }

  // Match 2: Referenced Order ID (101xxxxxx) in text
  const matches = text.match(/101\d{6}/g);
  if (matches) {
    for (const m of matches) {
      if (suspByPedido[m]) {
        const s = suspByPedido[m];
        derivaciones[p] = {
          isDerivado: true,
          tipoMatch: 'OT Referenciada en Texto',
          pedidoCampo: m,
          fechaCampo: s['MARCA ALTA'] || s['Fecha Alta'] || '',
          tecnicoCampo: s['TECNICO ASISTIO'] || s['TECNICO ZONA'] || '',
          fallaCampo: s['DETALLE FALLA'] || s['Falla Informada'] || '',
          zonaCampo: s['ZONA LOCAL'] || '',
          codCierreCampo: s['CODIGO CIERRE'] || s['Cod Cierre'] || ''
        };
        otCount++;
        return;
      }
    }
  }

  // Match 3: Same ATM ticket opened in Suspendidos within 24 hours of remote call
  if (atm && tDate && suspByAtm[atm]) {
    const candidate = suspByAtm[atm].find(item => {
      const diffMs = item.time - tDate;
      // ticket created within 24h after remote contact (or up to 4h before)
      return diffMs >= -4 * 3600 * 1000 && diffMs <= 24 * 3600 * 1000;
    });

    if (candidate) {
      const s = candidate.record;
      derivaciones[p] = {
        isDerivado: true,
        tipoMatch: 'Derivación Operativa (Mismo ATM 24h)',
        pedidoCampo: String(s.PEDIDO || s.Pedido || ''),
        fechaCampo: s['MARCA ALTA'] || s['Fecha Alta'] || '',
        tecnicoCampo: s['TECNICO ASISTIO'] || s['TECNICO ZONA'] || '',
        fallaCampo: s['DETALLE FALLA'] || s['Falla Informada'] || '',
        zonaCampo: s['ZONA LOCAL'] || '',
        codCierreCampo: s['CODIGO CIERRE'] || s['Cod Cierre'] || ''
      };
      sameAtm24hCount++;
      return;
    }
  }
});

const summary = {
  totalTelca: telca.length,
  totalDerivados: Object.keys(derivaciones).length,
  pctDerivados: Number((Object.keys(derivaciones).length / telca.length * 100).toFixed(1)),
  directCount,
  otCount,
  sameAtm24hCount,
  derivaciones
};

const outputPath = path.join(__dirname, '../src/data/telcaDerivaciones.json');
fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf8');
console.log('Generated telcaDerivaciones.json successfully!');
console.log('Summary:', {
  totalTelca: summary.totalTelca,
  totalDerivados: summary.totalDerivados,
  pctDerivados: summary.pctDerivados,
  directCount: summary.directCount,
  otCount: summary.otCount,
  sameAtm24hCount: summary.sameAtm24hCount
});
