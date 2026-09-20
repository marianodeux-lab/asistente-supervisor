const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const modelosPath = path.resolve('D:/Asistente Supervisor/Reportes/Datos/Modelos MPCR.xlsx');
const wbMpcr = xlsx.readFile(modelosPath);
const callRateRows = xlsx.utils.sheet_to_json(wbMpcr.Sheets['Call Rate'] || wbMpcr.Sheets['CallRate'] || {});

console.log('Call Rate Table:', JSON.stringify(callRateRows, null, 2));
