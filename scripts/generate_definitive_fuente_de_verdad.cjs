const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// 1. Load MPCR sheet from Modelos MPCR.xlsx
const modelosPath = path.resolve('D:/Asistente Supervisor/Reportes/Datos/Modelos MPCR.xlsx');
let mpcrRows = [];
let callRateRows = [];
if (fs.existsSync(modelosPath)) {
  const wb = xlsx.readFile(modelosPath);
  mpcrRows = xlsx.utils.sheet_to_json(wb.Sheets['MPCR'] || {});
  callRateRows = xlsx.utils.sheet_to_json(wb.Sheets['Call Rate'] || wb.Sheets['CallRate'] || {});
}

// 2. Load all 2026 monthly Base files
const baseDir = path.resolve('D:/Asistente Supervisor/Reportes/Base Instalada/2026/2026');
const files = fs.readdirSync(baseDir).filter(f => f.endsWith('.xlsx'));

const baseEquipMap = new Map();
for (const file of files) {
  const wb = xlsx.readFile(path.join(baseDir, file));
  const sheet = wb.Sheets[wb.SheetNames.find(s => s.toUpperCase() === 'BASE') || wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);
  rows.forEach(r => {
    const marca = (r['MARCA_DESC'] || '').toString().trim();
    const modelo = (r['MODELO_DESC'] || '').toString().trim();
    const key = `${marca} ||| ${modelo}`;
    if (!baseEquipMap.has(key)) {
      baseEquipMap.set(key, { marca, modelo, count: 0, files: new Set() });
    }
    const item = baseEquipMap.get(key);
    item.count++;
    item.files.add(file);
  });
}

// 3. Mapping Engine based on User Directives & MPCR definitions:
// Rule 1: MARCA_DESC includes 'Smart Box' -> Negocio: 'Cash Today'
// Rule 2: MARCA_DESC includes 'CRP' -> Negocio: 'CRP'
// Rule 3: All other MARCA_DESC ('OPTEVA', 'OPTEVA MI', 'OPTEVA TAS', 'GRG', 'DIEBOLD NIXDORF', 'TDE 4500', etc.) -> Negocio: 'ATM'

function resolveHardwareMapping(marca, modelo) {
  const marcaUpper = marca.toUpperCase().trim();
  const modeloUpper = modelo.toUpperCase().trim();

  // Determine Negocio
  let negocio = 'ATM';
  if (marcaUpper.includes('SMART BOX') || marcaUpper.includes('SMARTBOX')) {
    negocio = 'Cash Today';
  } else if (marcaUpper.includes('CRP')) {
    negocio = 'CRP';
  } else if (marcaUpper.includes('GUNNEBO')) {
    negocio = 'Cash Today';
  }

  // Determine Fabricante, Modelo Base, Modelo Estandarizado, MPCR
  let fabricante = 'Diebold Nixdorf';
  let modeloBase = modelo;
  let modeloEstandar = modelo;
  let mpcr = 'OPTEVA';
  let callRate = 0.5;

  if (negocio === 'CRP') {
    fabricante = 'Prosegur CRP';
    modeloBase = 'CRP-100';
    modeloEstandar = 'CRP-100 Control Asistencia';
    mpcr = 'CRP';
    callRate = 0.3;
  } else if (negocio === 'Cash Today') {
    if (modeloUpper.includes('CIMA') || modeloUpper.includes('SDM500') || modeloUpper.includes('INLANE')) {
      fabricante = 'CIMA';
      if (modeloUpper.includes('INLANE')) {
        modeloBase = modeloUpper.includes('DEPO') ? 'INLANE 300 DEPO' : 'INLANE 300';
        modeloEstandar = modeloUpper.includes('DEPO') ? 'CIMA Inlane 300 Depo' : 'CIMA Inlane 300';
        mpcr = 'CIMA';
      } else {
        modeloBase = 'SDM500';
        modeloEstandar = 'CIMA SDM500';
        mpcr = 'CIMA';
      }
      callRate = 0.35;
    } else if (modeloUpper.includes('CTE1')) {
      fabricante = 'SNBC';
      modeloBase = 'CTE1 SNBC';
      modeloEstandar = 'CTE1 SNBC';
      mpcr = 'CTE1 SNBC';
      callRate = 0.35;
    } else if (modeloUpper.includes('CTE2')) {
      fabricante = 'SNBC';
      modeloBase = modeloUpper.includes('-C') ? 'CTE2 SNBC -C' : 'CTE2 SNBC';
      modeloEstandar = modeloUpper.includes('-C') ? 'CTE2 SNBC -C' : 'CTE2 SNBC';
      mpcr = 'CTE2 SNBC';
      callRate = 0.35;
    } else if (modeloUpper.includes('CTI90')) {
      fabricante = 'SNBC';
      modeloBase = modeloUpper.includes('- C') || modeloUpper.includes('-C') ? 'CTI90 SNBC - C' : 'CTI90 SNBC';
      modeloEstandar = modeloUpper.includes('- C') || modeloUpper.includes('-C') ? 'CTI90 SNBC - C' : 'CTI90 SNBC';
      mpcr = 'CTI90 SNBC';
      callRate = 0.35;
    } else if (modeloUpper.includes('CTI UL') || modeloUpper.includes('CTI COMPACT')) {
      fabricante = 'SNBC';
      modeloBase = modeloUpper.includes('COMPACT') ? 'CTI COMPACT' : (modeloUpper.includes('- C') || modeloUpper.includes('-C') ? 'CTI UL - C' : 'CTI UL');
      modeloEstandar = modeloBase;
      mpcr = 'CTI UL SNBC';
      callRate = 0.35;
    } else if (modeloUpper.includes('DI90S')) {
      fabricante = 'SNBC';
      modeloBase = 'DI90S';
      modeloEstandar = 'DI90S';
      mpcr = 'CTI90 SNBC';
      callRate = 0.35;
    } else if (modeloUpper.includes('GLORY') || modeloUpper.includes('P500') || modeloUpper.includes('P1000') || modeloUpper.includes('P1001')) {
      fabricante = 'GLORY';
      if (modeloUpper.includes('P1000')) {
        modeloBase = 'GLORY P1000';
        modeloEstandar = 'GLORY P1000';
        mpcr = 'GLORY P1000';
      } else if (modeloUpper.includes('P1001')) {
        modeloBase = 'GLORY P1001';
        modeloEstandar = 'GLORY P1001';
        mpcr = 'GLORY P1001';
      } else {
        modeloBase = 'GLORY P500';
        modeloEstandar = 'GLORY P500';
        mpcr = 'GLORY P500';
      }
      callRate = 0.35;
    } else if (modeloUpper.includes('KISAN') || modeloUpper.includes('KD30')) {
      fabricante = 'KISAN';
      modeloBase = 'KISAN KD30';
      modeloEstandar = 'KISAN KD30';
      mpcr = 'KISAN';
      callRate = 0.35;
    } else if (modeloUpper.includes('PMINI') || modeloUpper.includes('MEI')) {
      fabricante = 'MEI';
      modeloBase = 'PMINI-MEI';
      modeloEstandar = 'PMINI-MEI';
      mpcr = 'MEI';
      callRate = 0.35;
    } else if (modeloUpper.includes('TAS') || modeloUpper === 'TAS') {
      fabricante = 'GLORY';
      modeloBase = 'TAS';
      modeloEstandar = 'GLORY TAS';
      mpcr = 'GLORY TAS';
      callRate = 0.35;
    } else if (marcaUpper.includes('GUNNEBO')) {
      fabricante = 'GUNNEBO';
      modeloBase = 'CAJA ROBOTIZADA';
      modeloEstandar = 'Gunnebo Robotizada';
      mpcr = 'GUNNEBO';
      callRate = 0.2;
    }
  } else {
    // Negocio === 'ATM'
    if (modeloUpper.includes('CS280') || modeloUpper.includes('CS285') || modeloUpper.includes('CS2070')) {
      fabricante = 'Wincor';
      if (modeloUpper.includes('CS2070')) {
        modeloBase = modelo;
        modeloEstandar = 'Wincor CS2070 Full CCDM';
        mpcr = 'WINCOR';
      } else if (modeloUpper.includes('CS285')) {
        modeloBase = modelo;
        modeloEstandar = 'Wincor CS285 TTW';
        mpcr = 'WINCOR';
      } else if (modeloUpper.includes('CS280')) {
        modeloBase = modelo;
        modeloEstandar = 'Wincor CS280 Cash';
        mpcr = 'WINCOR';
      }
      callRate = 0.5;
    } else if (marcaUpper === 'GRG' || modeloUpper.includes('DT-7000') || modeloUpper.includes('CI8000')) {
      fabricante = 'GRG Banking';
      if (modeloUpper.includes('H68') || modeloUpper.includes('68N') || modeloUpper.includes('68V')) {
        modeloBase = modelo;
        modeloEstandar = 'GRG H68 Reciclador';
        mpcr = 'GRG H68';
        callRate = 0.5;
      } else if (modeloUpper.includes('H34') || modeloUpper.includes('34N') || modeloUpper.includes('34NL')) {
        modeloBase = modelo;
        modeloEstandar = 'GRG H34 Full';
        mpcr = 'GRG H34';
        callRate = 0.5;
      } else if (modeloUpper.includes('H22') || modeloUpper.includes('22V') || modeloUpper.includes('22VL') || modeloUpper.includes('22N') || modeloUpper.includes('22NL')) {
        modeloBase = modelo;
        modeloEstandar = 'GRG H22 Cash';
        mpcr = 'GRG H22';
        callRate = 0.5;
      } else if (modeloUpper.includes('I21') || modeloUpper.includes('21')) {
        modeloBase = modelo;
        modeloEstandar = 'GRG H21';
        mpcr = 'GRG H21';
        callRate = 0.5;
      } else {
        modeloBase = modelo;
        modeloEstandar = `GRG ${modelo}`;
        mpcr = 'GRG';
        callRate = 0.5;
      }
    } else if (marcaUpper.includes('DIEBOLD NIXDORF') || modeloUpper.includes('DN200V')) {
      fabricante = 'Diebold Nixdorf';
      if (modeloUpper.includes('DN200V')) {
        modeloBase = modelo;
        modeloEstandar = 'DN200V Reciclador';
        mpcr = 'DN';
      } else if (modeloUpper.includes('4534')) {
        fabricante = 'Diebold Procomp';
        modeloBase = 'TDE 4534';
        modeloEstandar = 'TDE 4534';
        mpcr = 'TDE';
      } else if (modeloUpper.includes('828')) {
        modeloBase = 'Opteva 828';
        modeloEstandar = 'Opteva 828';
        mpcr = 'OPTEVA';
      } else {
        modeloBase = modelo;
        modeloEstandar = `Diebold ${modelo}`;
        mpcr = 'DN';
      }
      callRate = 0.5;
    } else if (marcaUpper === 'TDE 4500' || modeloUpper.includes('TDE')) {
      fabricante = 'Diebold Procomp';
      modeloBase = modelo;
      modeloEstandar = modelo;
      mpcr = modeloUpper.includes('MI') ? 'TDE MI' : 'TDE';
      callRate = 0.3;
    } else if (marcaUpper.includes('OPTEVA')) {
      fabricante = 'Diebold Nixdorf';
      if (marcaUpper === 'OPTEVA TAS' || modeloUpper.includes('TAS')) {
        if (modeloUpper.includes('720')) {
          modeloBase = modelo;
          modeloEstandar = 'Tas Opteva 720';
          mpcr = modeloUpper.includes('ENA') ? 'TAS MI' : 'OPTEVA';
        } else if (modeloUpper.includes('522')) {
          modeloBase = modelo;
          modeloEstandar = 'Tas Opteva 522';
          mpcr = 'OPTEVA';
        } else if (modeloUpper.includes('520')) {
          modeloBase = modelo;
          modeloEstandar = 'Tas Opteva 520';
          mpcr = 'OPTEVA';
        } else {
          modeloBase = modelo;
          modeloEstandar = `Tas Opteva ${modelo}`;
          mpcr = 'OPTEVA';
        }
      } else if (marcaUpper === 'OPTEVA MI' || modeloUpper.includes('ENA') || modeloUpper.includes('IDM')) {
        if (modeloUpper.includes('868')) {
          modeloBase = modelo;
          modeloEstandar = 'Opteva 868 ECRM';
          mpcr = 'OPTEVA ECRM';
          callRate = 0.7;
        } else {
          modeloBase = modelo;
          modeloEstandar = 'Opteva 720 ENA / MI';
          mpcr = 'OPTEVA MI';
          callRate = 0.5;
        }
      } else {
        if (modeloUpper.includes('720')) {
          modeloBase = modelo;
          modeloEstandar = 'Opteva 720 Full';
          mpcr = 'OPTEVA';
        } else if (modeloUpper.includes('522')) {
          modeloBase = modelo;
          modeloEstandar = 'Opteva 522';
          mpcr = 'OPTEVA';
        } else if (modeloUpper.includes('520')) {
          modeloBase = modelo;
          modeloEstandar = 'Opteva 520';
          mpcr = 'OPTEVA';
        } else if (modeloUpper.includes('510')) {
          modeloBase = modelo;
          modeloEstandar = 'Opteva 510';
          mpcr = 'OPTEVA';
        } else if (modeloUpper.includes('828')) {
          modeloBase = 'Opteva 828';
          modeloEstandar = 'Opteva 828';
          mpcr = 'OPTEVA';
        } else {
          modeloBase = modelo;
          modeloEstandar = `Opteva ${modelo}`;
          mpcr = 'OPTEVA';
        }
        callRate = 0.5;
      }
    }
  }

  return {
    marcaOriginal: marca,
    modeloOriginal: modelo,
    negocio,
    fabricante,
    modeloBase,
    modeloEstandar,
    mpcr,
    callRate
  };
}

// 4. Process all combinations found in Base Instalada 2026
const completeCatalog = [];
baseEquipMap.forEach((val, key) => {
  const mapping = resolveHardwareMapping(val.marca, val.modelo);
  completeCatalog.push({
    ...mapping,
    totalBaseInstaladaRecords: val.count,
    foundInMonths: Array.from(val.files)
  });
});

completeCatalog.sort((a, b) => 
  a.negocio.localeCompare(b.negocio) || 
  a.fabricante.localeCompare(b.fabricante) || 
  a.modeloEstandar.localeCompare(b.modeloEstandar) ||
  a.modeloOriginal.localeCompare(b.modeloOriginal)
);

console.log(`Successfully generated ${completeCatalog.length} unique mapping entries.`);

// Summary by Negocio
const byNegocio = {};
completeCatalog.forEach(c => {
  if (!byNegocio[c.negocio]) byNegocio[c.negocio] = { models: 0, totalEquipmentCount: 0, fabricantes: new Set(), mpcrs: new Set() };
  byNegocio[c.negocio].models++;
  byNegocio[c.negocio].totalEquipmentCount += c.totalBaseInstaladaRecords;
  byNegocio[c.negocio].fabricantes.add(c.fabricante);
  byNegocio[c.negocio].mpcrs.add(c.mpcr);
});

console.log('\n--- SUMMARY BY NEGOCIO ---');
Object.keys(byNegocio).forEach(k => {
  console.log(`Negocio: ${k}`);
  console.log(`  Model Combinations: ${byNegocio[k].models}`);
  console.log(`  Total Equipment Records (across 8 months): ${byNegocio[k].totalEquipmentCount}`);
  console.log(`  Fabricantes: ${Array.from(byNegocio[k].fabricantes).join(', ')}`);
  console.log(`  MPCRs: ${Array.from(byNegocio[k].mpcrs).join(', ')}`);
});

// Write to JSON data file
fs.writeFileSync(
  path.resolve('d:/Asistente Supervisor/src/data/fuenteDeVerdadData.json'),
  JSON.stringify({
    metadata: {
      generatedAt: new Date().toISOString(),
      description: 'Única Fuente de Verdad Canónica para Modelos, Negocios, Fabricantes, MPCR y Reglas de Negocio',
      rulesVersion: '2.0.0',
      totalMappedModels: completeCatalog.length
    },
    catalog: completeCatalog,
    byNegocio: Object.fromEntries(
      Object.entries(byNegocio).map(([k, v]) => [k, {
        models: v.models,
        totalEquipmentCount: v.totalEquipmentCount,
        fabricantes: Array.from(v.fabricantes),
        mpcrs: Array.from(v.mpcrs)
      }])
    ),
    callRates: callRateRows
  }, null, 2)
);

console.log('\nWrote src/data/fuenteDeVerdadData.json');
