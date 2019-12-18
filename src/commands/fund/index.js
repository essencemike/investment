const inquirer = require('inquirer');

const { getFundResult, getFundIndexData } = require('./fund');
const preview = require('../../utils/preview');
const analysis = require('./analysis');

const { error, bold, neonGreen } = require('../../utils/log');
const errorCaptured = require('../../utils/async');

const fund = async (name, option) => {
  const [err, {
    fund: { indx_sname }
  }] = await errorCaptured(getFundResult(name, option.number));

  if (err) {
    error(err);
    return;
  }

  const [err2, { fdIndexs, th }] = await errorCaptured(getFundIndexData(indx_sname));

  if (err2) {
    error(err2);
    return;
  }

  // 输出为表格
  preview(th, fdIndexs);

  // 添加对话询问是否需要系统推荐
  const questions = [
    {
      name: 'yes',
      message: '是否需要系统启用加权平均算法自动推荐？',
      type: 'confirm',
    }
  ];

  const { yes } = await inquirer.prompt(questions);

  if (yes) {
    // 启动自动分析
    const codes = fdIndexs.map(fd => fd[0]);
    const [err3, data] = await errorCaptured(analysis(codes));

    if (err3) {
      error(err3);
      return;
    }

    // 根据综合分数排序
    const fdes = data.sort((a, b) => +b[7] - +a[7]);
    const head = ['基金代码', '基金名称', '跟踪误差率', '基金规模', '成立时间', '基金公司名称', '费率', '综合分数'];
    preview(head, fdes);

    const first = fdes[0];
    const second = fdes[1];

    // 只考虑综合分数相同的前2位
    if (first[7] === second[7]) {
      console.log(bold(`综合分析请选择:  ${neonGreen(`${first[0]}, ${first[1]}`)}, 或者是： ${neonGreen(`${second[0]}, ${second[1]}`)}`));
    } else {
      console.log(bold(`综合分析请选择:  ${neonGreen(`${first[0]}, ${first[1]}`)}`));
    }
  }
};

module.exports = fund;
