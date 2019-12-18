const { center, left } = require('wide-align');

const basicTable = require('./table');
const { bold } = require('./log');

const alignCenter = columns => columns.map(column => {
  if (typeof column === 'string') {
    return { content: column, vAlign: 'center', hAlign: 'center' };
  }

  return { ...column, vAlign: 'center', hAlign: 'center' };
});

function preview(columns, fdIndexs) {
  const fundTable = basicTable();
  fundTable.push(
    alignCenter(columns)
  );

  fdIndexs.forEach(fd => fundTable.push(alignCenter(fd)));

  console.log(fundTable.toString());
}

module.exports = preview;
