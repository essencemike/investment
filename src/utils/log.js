const chalk = require('chalk');

const error = msg => console.log(chalk.red.bold(msg));

const bold = msg => chalk`{white.bold ${msg}}`;

const fdRed = msg => chalk`{bold.hex('#f00b47') ${msg}}`;

const neonGreen = msg => chalk`{hex('#66ff66') ${msg}}`;

const colorTeamName = (color, name) => chalk`{bold.white.bgHex('${color}') ${name}}`;

module.exports = {
  error,
  bold,
  fdRed,
  neonGreen,
  colorTeamName,
};
