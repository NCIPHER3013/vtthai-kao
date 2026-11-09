const XLSX = require('xlsx');

try {
  const workbook = XLSX.readFile('d:/pos-lite/docs/pos_linked.xlsx');
  
  const sheetsToInspect = ['Stock Items', 'Menu Costing', 'Recipes'];

  for (const sheetName of sheetsToInspect) {
      console.log(`\n=== Data from Sheet: ${sheetName} ===`);
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Print first 5 non-empty rows after the header/instruction rows
      let count = 0;
      for (let i = 0; i < Math.min(20, data.length); i++) {
          if (data[i] && data[i].length > 0 && data[i].join('').trim() !== '') {
              console.log(`Row ${i}:`, data[i]);
              count++;
              if (count >= 10) break;
          }
      }
  }
} catch (err) {
  console.error("Error reading file:", err);
}
