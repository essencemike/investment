const ora = require('ora');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const dayjs = require('dayjs');
const axios = require('axios');

const { fundDetailUrl, fundMoneyUrl, companyUrl } = require('../../config');
const { Crawl } = require('../../utils/http');

const FundWeight = {
  company: 0.1,   // 基金公司
  deviation: 0.4, // 跟踪误差率
  scope: 0.2,     // 基金规模
  date: 0.2,      // 成立年限
  money: 0.1,     // 管理费率
};

const Weights = [1,0.9,0.8,0.7,0.6,0.5,0.4,0.3,0.2,0.1];

// 权重的顺序从大到小
function getWeight(source, weights = []) {
  const index = weights.map(w => parseFloat(source, 10) >= w).findIndex(w => w);
  return Weights[index] || 0;
}

function getWeightLt(source, weights = []) {
  const index = weights.map(w => parseFloat(source, 10) <= w).findIndex(w => w);
  return Weights[index] || 0;
}

const company = (money) => {
  money = money || 0;
  return getWeight(money, [10000, 9000, 8000, 7000, 6000, 5000, 4000, 3000, 2000, 900]) * 100 * FundWeight.company;
};

const deviation = (d) => {
  d = d || 0;
  return getWeightLt(d, [0.01, 0.02, 0.03, 0.04, 0.05, 0.07, 0.10, 0.20, 0.30, 0.40]) * 100 * FundWeight.deviation;
}

const scope = (d) => {
  d = d || 0;
  return getWeight(d, [300, 220, 200, 180, 160, 140, 120, 100, 80, 50]) * 100 * FundWeight.scope;
}

const date = (d) => {
  const diffYear = dayjs().diff(dayjs(d), 'year');
  return getWeight(diffYear, [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]) * 100 * FundWeight.date;
}

const money = (d) => {
  d = d || 0;
  return getWeightLt(d, [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3]) * 100 * FundWeight.money;
}

async function getScopeByName(name) {
  const { data } = await axios.get(companyUrl, { params: { _: +new Date() } });
  const res = data.split('=')[1];
  const { datas } = eval(`(${res})`);
  const companys = datas.sort((a, b) => +b[7] - +a[7]).slice(0, 40).map(c => ({ name: c[1], scope: c[7] }));
  const co = companys.find(c => c.name.indexOf(name) !== -1);

  return co ? co.scope : 0;
}

async function getFundDetail(code) {
  const data = await Crawl(fundDetailUrl(code));

  const html = iconv.decode(Buffer.concat(data), 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false });

  const tr = $('.infoOfFund table tbody tr');

  // 获取基金规模
  const scopeData = tr.eq(0).find('td').eq(1).text().split('：')[1].split('亿元')[0];
  const dateData = tr.eq(1).find('td').eq(0).text().split('：')[1];
  const companyName = tr.eq(1).find('td').eq(1).text().split('：')[1];
  const deviationData = (tr.eq(2).find('td').eq(0).text().split('跟踪误差：')[1] || '0').replace(/%/g, '');
  const name = $('.fundDetail-tit').find('div').eq(0).text().split('(')[0];
  const companyData = await getScopeByName(companyName);
  const score = [deviation(deviationData), scope(scopeData), date(dateData), company(companyData)].reduce((s, p) => s += p, 0);

  return [name, deviationData, scopeData, dateData, companyName, score];
}

async function getFundMoney(code) {
  const data = await Crawl(fundMoneyUrl(code));

  const html = iconv.decode(Buffer.concat(data), 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false });

  const moneyData = $('table.w770.comm.jjfl').eq(1).find('tbody tr td').eq(1).text().split('%')[0];
  return [moneyData, money(moneyData)];
}

async function getFundDetailsByCode(code) {
  const [name, deviationData, scopeData, dateData, companyName, score] = await getFundDetail(code);
  const [moneyData, monyScore] = await getFundMoney(code);
  const scoreNum = score + monyScore;

  return [code, name, deviationData, scopeData, dateData, companyName, moneyData, scoreNum+''];
}

const analysis = async (codes) => {
  const promises = [];
  const spinner = ora('系统分析中...').start();

  for (let i = 0; i < codes.length; i++) {
    promises.push(getFundDetailsByCode(codes[i]));
  }

  const data = await Promise.all(promises);

  spinner.stop();

  return data;
};

module.exports = analysis;
