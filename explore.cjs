const xlsx = require('xlsx');

const workbook = xlsx.readFile("./public/Fechas Parciales 2026-2.xlsx");

workbook.SheetNames.forEach(sheetName => {
  console.log(`\n\n=== SHEET: ${sheetName} ===`);
  const sheet = workbook.Sheets[sheetName];
  // Convert sheet to a flat array of arrays to see raw layout
  const rawData = xlsx.utils.sheet_to_json(sheet, {header: 1});
  
  // print first 20 rows to understand the structure
  console.log(JSON.stringify(rawData.slice(0, 20), null, 2));
});
