const Table = require('cli-table3');
const xlsx = require('node-xlsx');
const fs = require('fs');
const path = require('path');

const CheapStock = require('./cheapStock');
const WhiteHorseStock = require('./whiteHorseStock');

const basicTable = require('../../utils/table');
const { bold, neonGreen } = require('../../utils/log');

const getInstance = (type) => {
  if (type === '白马股') {
    return new WhiteHorseStock();
  }

  return new CheapStock();
};

const alignCenter = columns => columns.map(column => {
  if (typeof column === 'string' || typeof column === 'number') {
    return { content: column, vAlign: 'center', hAlign: 'center' };
  }

  return { ...column, vAlign: 'center', hAlign: 'center' };
});

function previewStocks(columns, stocks) {
  const stockTable = new Table({ style: { head: [], border: [] } });
  stockTable.push(
    alignCenter(columns)
  );

  stocks.forEach(s => stockTable.push(alignCenter(s)));

  console.log(stockTable.toString());
}

async function exportExcel(data) {
  return new Promise((resolve, reject) => {
    const file = {
      name: `白马股筛选-${new Date().getTime()}`,
      data,
    };

    const buffer = xlsx.build([file]);
    const filePath = path.join(process.cwd(), `白马股筛选-${new Date().getTime()}.xlsx`);
    fs.writeFile(filePath, buffer, function(err) {
      if (err) {
        reject(err);
      }
      resolve(filePath);
    });
  });
}

module.exports = {
  getInstance,
  previewStocks,
  alignCenter,
  exportExcel,
};
