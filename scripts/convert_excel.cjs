const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../public/Fechas Parciales 2026-2.xlsx');
const OUT_PATH = path.join(__dirname, '../public/exam_data.json');

function formatDate(excelValue) {
  // If it's empty, return "Por Definir" or blank
  if (excelValue === undefined || excelValue === null || excelValue === "") return '-';
  
  // If Excel parsed it as a number (serial date), convert it:
  if (typeof excelValue === 'number') {
    // 25569 is the offset between 1900-01-01 and 1970-01-01
    // 86400 * 1000 is ms per day
    const utcDate = new Date((excelValue - 25569) * 86400 * 1000);
    // Keep as simple format DD/MM/YYYY
    const dd = String(utcDate.getUTCDate()).padStart(2, '0');
    const mm = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = utcDate.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  
  // Return as string if it wasn't a standard serial number
  return String(excelValue).trim();
}

try {
  console.log('⏳ Leyendo archivo Excel...');
  const workbook = xlsx.readFile(FILE_PATH);
  
  const allExamsMap = new Map();

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    // Convert to JSON using the first row as keys 
    // defval: "" ensures missing cells have a key but an empty string
    const rawData = xlsx.utils.sheet_to_json(sheet, { defval: "" });
    
    // Fallback dictionary for known columns to avoid case sensitivity issues
    rawData.forEach(row => {
      // Find exact keys in case they have trailing spaces
      const keys = Object.keys(row);
      const getVal = (possibleEnds) => {
        const key = keys.find(k => k.trim().toUpperCase().includes(possibleEnds));
        return key ? row[key] : "";
      };

      const materia = getVal('MATERIA');
      const profesor = getVal('PROFESOR');
      
      // Skip empty rows and the header repeating rows
      if (materia && profesor && materia.trim().toUpperCase() !== 'MATERIA') {
        const key = `${getVal('ESCUELA')}-${materia.trim()}-${profesor.trim()}-${getVal('SECCION')}`;
        
        if (!allExamsMap.has(key)) {
          allExamsMap.set(key, {
            escuela: getVal('ESCUELA'),
            materia: materia.trim(),
            profesor: profesor.trim(),
            seccion: getVal('SECCION'),
            aula: getVal('AULA'),
            hora: getVal('HORA'),
            dia: getVal('DIA') || sheetName,
            parcial_1: formatDate(getVal('I PARCIAL') || getVal('1 PARCIAL') || getVal('PARCIAL I')),
            parcial_2: formatDate(getVal('II PARCIAL') || getVal('2 PARCIAL') || getVal('PARCIAL II')),
            parcial_3: formatDate(getVal('III PARCIAL') || getVal('3 PARCIAL') || getVal('PARCIAL III')),
            parcial_4: formatDate(getVal('IV PARCIAL') || getVal('4 PARCIAL') || getVal('PARCIAL IV'))
          });
        }
      }
    });
  });

  const allExams = Array.from(allExamsMap.values());

  // Group by Escuela -> Materia -> info
  const structuredData = {};

  allExams.forEach(exam => {
    let escuelaRaw = exam.escuela || "Otras Especiales";
    // Split combined careers like "Civil/Industrial" into ["Civil", "Industrial"]
    let escuelasList = escuelaRaw.split('/').map(s => s.trim()).filter(s => s.length > 0);

    let materia = exam.materia || "Sin Nombre";

    escuelasList.forEach(escuela => {
      if (!structuredData[escuela]) {
        structuredData[escuela] = {};
      }
      if (!structuredData[escuela][materia]) {
        structuredData[escuela][materia] = [];
      }
      
      structuredData[escuela][materia].push({
        profesor: exam.profesor,
        seccion: exam.seccion,
        aula: exam.aula,
        hora: exam.hora,
        dia: exam.dia,
        parcial_1: exam.parcial_1,
        parcial_2: exam.parcial_2,
        parcial_3: exam.parcial_3,
        parcial_4: exam.parcial_4
      });
    });
  });

  fs.writeFileSync(OUT_PATH, JSON.stringify(structuredData, null, 2), 'utf-8');
  console.log(`✅ ¡Éxito! Se agruparon ${allExams.length} secciones de la facultad.`);
  console.log(`✅ Datos limpiados guardados en: public/exam_data.json`);
} catch (error) {
  console.error('❌ Error convirtiendo el archivo:', error.message);
}
