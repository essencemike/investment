const inquirer = require('inquirer');
const axios = require('axios');
const R = require('ramda');
const ora = require('ora');
const { limit } = require('stringz');
const { center, left } = require('wide-align');
const pMap = require('p-map');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const dayjs = require('dayjs');

const { fundSearchUrl, fundIndexUrl } = require('../../config');
const { bold, neonGreen } = require('../../utils/log');
const { Crawl } = require('../../utils/http');

const MAX_WIDTH = 101;
const FUND_WIDTH = 14;
const FUND_NAME_WIDTH = 20;
const FUND_NUM_WIDTH = 18;

const padFundCode = name => bold(center(name, FUND_WIDTH));
const padFundName = name => bold(left(name, FUND_NAME_WIDTH));
const padFundNum = name => bold(center(name, FUND_NUM_WIDTH));

function getIndexData(key) {
  return axios.get(fundSearchUrl, {
    params: {
      key,
      field: 'index_code',
      type: 'asc',
    }
  });
}

function createFundChoice(fd) {
  const code = center(bold(neonGreen(fd.index_code)), FUND_WIDTH);
  const name = left(bold(fd.indx_sname), FUND_NAME_WIDTH);
  const num = center(bold(fd.num), FUND_NUM_WIDTH);
  const assets = center(bold(fd.class_assets), FUND_WIDTH);
  const type = center(bold(fd.class_classify), FUND_WIDTH);
  const date = center(bold(fd.online_date), FUND_WIDTH);

  return `|${code}|${name}|${num}|${assets}|${type}|${date}|`;
}

const getFundResult = async (name, number) => {
  const spinner = ora(`正在下载${name}相关的信息...`).start();

  const { data } = await getIndexData(name);
  // 过滤掉主题、行业、策略、风格指数，只保留规模指数
  const array = eval(`(${data})`);
  const result = array
    .filter(d => d.class_classify === '规模')
    // .filter(d => d.class_classify === '策略')
    .map(r => R.pickAll(['index_code', 'indx_sname', 'num', 'class_assets', 'class_classify', 'online_date'], r));

  const header = `|${padFundCode('指数代码')}|${padFundName('指数名称')}|${padFundNum(
    '成分股数量'
  )}|${padFundCode('资产类别')}|${padFundCode('指数类型')}|${padFundCode('发布时间')}|`;

  const tableWidth = MAX_WIDTH;

  const questions = [
    {
      name: 'fund',
      message: '请选择你要查看的指数（初级版已经自定去掉了主题、行业、风格指数）？',
      type: 'list',
      pageSize: 30,
      choices: [
        new inquirer.Separator(`${limit('', tableWidth, '─')}`),
        new inquirer.Separator(header),
        new inquirer.Separator(`${limit('', tableWidth, '─')}`),
      ],
    }
  ];

  const last = result.length - 1;

  await pMap(result, async (fd, index) => {
    questions[0].choices.push({
      name: createFundChoice(fd),
      value: fd
    });

    if (index !== last) {
      questions[0].choices.push(
        new inquirer.Separator(`${limit('', tableWidth, '─')}`)
      );
    } else {
      questions[0].choices.push(
        new inquirer.Separator(`${limit('', tableWidth, '─')}`)
      );
    }
  }, { concurrency: 1 });

  spinner.stop();

  const answer = await inquirer.prompt(questions);

  return answer;
};

async function getFundIndexData(key) {
  const url = fundIndexUrl + key;
  const spinner = ora(`正在查询${key}相关的指数基金信息...`).start();
  const data = await Crawl(encodeURI(url));

  const html = iconv.decode(Buffer.concat(data), 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false });

  const th = $('.tablePage thead tr th').map((index, t) => $(t).text()).get();

  // 取出内容
  const tr = [];
  $('.tablePage tbody tr').each((index, r) => {
    const td = $(r).find('td').map((i, d) => $(d).text()).get();
    tr.push(td);
  });

  /**
   * 1. 过滤掉成立时间小于3年的
   * 2. 按照资产规模排序， 选择排名前10的基金
   */
  const fdIndexs = tr.filter(r => {
    const diffYear = dayjs().diff(dayjs(r[2]), 'year');
    return diffYear >= 3;
  }).sort((a, b) => b[6] - a[6]).slice(0, 10);

  spinner.stop();

  return { fdIndexs, th };
}

module.exports = {
  getFundResult,
  getFundIndexData,
};
