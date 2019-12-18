const program  = require('commander');
const didYouMean = require('didyoumean');
const chalk = require('chalk');

const { error, bold, fdRed, neonGreen } = require('./utils/log');

const pkg = require('../package.json');

program.version(
  `\n${chalk`{bold.hex('#0069b9') INVEST}`} ${fdRed('GO')} version: ${
    pkg.version
  }\n`,
  '-v, --version'
);

program
  .command('fund <name>')
  .alias('f')
  .option('-n, --number <number>', '获取前 n 个跟该指数相关的信息。')
  .on('--help', () => {
    console.log('');
    console.log('  获取所有跟该指数相关的信息。');
    console.log('');
    console.log('  例如：');
    console.log(
      `      ${neonGreen(
        'invest fund 上证50'
      )}     => 就会显示关于上证50相关的所有指数信息。`
    );
    console.log(
      `      ${neonGreen(
        'invest fund 中证500'
      )}     => 就会显示关于中证500相关的所有指数信息。`
    );
    console.log('');
  })
  .action((name, option) => {
    require('./commands/fund')(name, option);
  });

program
  .command('stock')
  .alias('s')
  .on('--help', () => {
    console.log('');
    console.log('  筛选出白马股或者便宜股。');
    console.log('');
    console.log('  例如：');
    console.log(
      `      ${neonGreen(
        'invest stock'
      )}     => 就会显示关于白马股或者便宜股的股票信息。`
    );
    console.log(
      `      ${neonGreen(
        'invest s'
      )}         => 就会显示关于白马股或者便宜股的股票信息。`
    );
    console.log('');
  })
  .action(() => {
    require('./commands/stock')();
  });

program.on('--help', () => {
  console.log('');
  console.log('');
  console.log(
    `  Welcome to ${chalk`{bold.hex('#0069b9') INVEST}`} ${nbaRed('GO')} !`
  );
  console.log('');
  console.log(
    `  如果要查看某个指数相关的信息请输入: ${neonGreen(
      'int fund <name>'
    )}`
  );
  console.log('');
});

program.arguments('<command>').action(command => {
  error(`Unknown command: ${bold(command)}`);

  const commandNames = program.commands
    .map(c => c._name)
    .filter(name => name !== '*');

  const closeMatch = didYouMean(command, commandNames);

  if (closeMatch) {
    error(`Did you mean ${bold(closeMatch)} ?`);
  }

  process.exit(1);
});

if (process.argv.length === 2) program.help();

program.parse(process.argv);
