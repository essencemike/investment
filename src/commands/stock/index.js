const inquirer = require('inquirer');

const { getInstance, previewStocks, exportExcel } = require('./stock');

const { error, bold, neonGreen } = require('../../utils/log');
const errorCaptured = require('../../utils/async');

const stock = async () => {
  // 询问筛选白马股还是便宜股
  const stockChoices = ['白马股', '便宜股'].map(name => ({ name, value: name }));
  const stockTypeQuestions = [{
    name: 'stockType',
    message: '请选择要筛选的股票组合的类型',
    type: 'list',
    choices: stockChoices,
  }];

  const { stockType } = await inquirer.prompt(stockTypeQuestions);

  // 请用户输入理杏仁的 token
  const { token } = await inquirer.prompt([{
    name: 'token',
    message: '请输入理杏仁的 Token (可以在理杏仁官网 - 开放平台中查看): ',
    type: 'input',
  }]);

  const instance = getInstance(stockType);

  // 下载数据
  const [err2, data] = await errorCaptured(instance.getStocks());

  if (err2) {
    error(err2);
    process.exit(1);
  }

  // 剔除不符合要求的股票
  const result = await instance.removeDisqualified(data);

  const head = instance.getHeaders();

  // previewStocks(head, result);

  if (result.length) {
    const [err1, goodBaima] = await errorCaptured(instance.getGoodHorse(token, result));

    if (err1) {
      error(err1);
      process.exit(1);
    }

    // 展示在终端上
    previewStocks(head, goodBaima);

     // 添加对话询问是否需要系统推荐
    const questions = [
      {
        name: 'yes',
        message: '是否导出Excel？',
        type: 'confirm',
      }
    ];

    const { yes } = await inquirer.prompt(questions);

    if (yes) {
      const [err, filePath] = await errorCaptured(exportExcel([head, ...goodBaima]));

      if (err) {
        error(err);
        process.exit(1);
      } else {
        console.log(bold(`导出成功，文件目录:  ${neonGreen(filePath)}`));
      }
    }
  } else {
    error('服务器超时！ 请稍后重试！ 爬虫有风险， 请不要短时间内频繁操作！， 请不要短时间内频繁操作！， 请不要短时间内频繁操作！');
  }

  process.exit(1);
};

module.exports = stock;
