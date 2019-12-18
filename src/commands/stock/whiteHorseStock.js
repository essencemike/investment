const inquirer = require('inquirer');
const R = require('ramda');
const ora = require('ora');
const { limit } = require('stringz');
const { center, left } = require('wide-align');
const pMap = require('p-map');
const dayjs = require('dayjs');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const Rize = require('rize');
const axios = require('axios');

const { iwencai, iwencaiOrigin, fundamental } = require('../../config');

const { error, bold, neonGreen } = require('../../utils/log');
const errorCaptured = require('../../utils/async');
const { sleep } = require('../../utils/http');

class WhiteHorseStock {
  constructor() {
    this.rize = new Rize();
  }

  async getStocks() {
    const _this = this;
    // 根据时间生成相关的搜索条件
    const conditions = this.getConditions();

    // 根据搜索条件查询数据
    const spinner = ora('正在下载相关数据，请稍等...').start();

    const rize = this.rize.goto(iwencaiOrigin)
      .waitForNavigation(3000)
      .type('textarea.search-input', conditions)
      .press('Enter')
      .waitForNavigation(3000);

    await sleep(1000);

    const html = await rize.html();

    const $ = cheerio.load(html, { decodeEntities: false });
    const result = [];
    const tableWrapper = $('.iwc-table-container .iwc-table-content');
    tableWrapper.find('.iwc-table-scroll .iwc-table-body table tbody tr').each((index, r) => {
      // 添加 股票代码和股票名称等信息
      const td = $(r).find('td').map((i, d) => $(d).text()).get();

      // 去掉无用的信息
      const filteredTd = _this.removeElement([...td]);

      result.push(filteredTd);
    });

    // 处理获取的数据
    const data = this.convertData(result);

    await rize.closePage();

    spinner.stop();

    return data;
  }

  getStockCodes(data = []) {
    return data.map(d => d[0]);
  }

  async getPePB(token, result) {
    const stockCodes = this.getStockCodes(result);
    const date = 'latest';
    const metrics = ['d_pe_ttm_pos10', 'pb_wo_gw_pos10', 'sp'];
    const spinner = ora('获取基本面信息...').start();

    const { data } = await axios.post(fundamental, {
      token,
      stockCodes,
      date,
      metrics
    });

    spinner.stop();

    return data.data;
  }

  async getGoodHorse(token, result = []) {
    const data = await this.getPePB(token, result);

    // 将 pe 和 pb 数据添加到 result 上
    const info = result.map(d => {
      const stockCode = d[0];
      const stock = data.find(s => s.stockCode == stockCode);
      if (stock) {
        d.push(stock);
      }
      return d;
    });

    // 筛选出价格比较低的数据， pe + pb 都低于50
    const baima = info.filter(i => {
      const stock = i[i.length - 1];
      if (typeof stock === 'object') {
        return +stock.d_pe_ttm_pos10 < 0.5 && +stock.pb_wo_gw_pos10 < 0.5
      }
      return true;
    });

    const sortedBaima = baima.sort((a, b) => {
      const aStock = a[a.length - 1];
      const bStock = b[b.length - 1];

      return +aStock.d_pe_ttm_pos10 - +bStock.d_pe_ttm_pos10;
    });

    // 删除过程中用于筛选的数据
    // 只保留股票代码， 股票名称， 行业， PE分位点， PB分位点，单股股价，1手的价格
    const goodBaima = sortedBaima.map(b => {
      const [code, name, hangye] = b;
      const { d_pe_ttm_pos10, pb_wo_gw_pos10, sp } = b[b.length - 1];

      return [code, name, hangye, this.convertPrecent(d_pe_ttm_pos10), this.convertPrecent(pb_wo_gw_pos10), sp, Math.floor(sp * 100)];
    });

    return goodBaima;
  }

  convertPrecent(n) {
    return Number((n * 100).toFixed(2));
  }

  isBlank(type = '') {
    return type.indexOf('银行') !== -1;
  }

  isNotBad(array = []) {
    return array.every(a => +a >= 0);
  }

  isCycle(type) {
    const names = ['钢铁', '化工合成材料', '化工新材料', '化学制品', '采掘服务',
      '煤炭开采加工', '有色冶炼加工', '石油矿业开采', '机场航运', '交运设备服务',
      '港口航运', '建筑材料', '建筑装饰', '房地产', '国防军工', '专用设备', '汽车', '证券', '保险及其他'];

    return names.some(n => type.indexOf(n) !== -1);
  }

  isTheorem(data = []) {
    return data[0] > 0 && data[1] > 0;
  }

  isTheoremThree(data = []) {
    return data.filter(d => d < 1).length >= 2;
  }

  async removeDisqualified(data = []) {
    const spinner = ora('剔除周期股以及基本面变坏的股票...').start();
    await sleep(1000);
    const res = data.filter(d => {
      if (this.isBlank(d[2])) {
        return true;
      }

      // 周期股
      if (this.isCycle(d[2])) {
        return false;
      }

      const point = [d[3], d[4], d[5], d[6]];
      if (this.isNotBad(point)) {
        return true;
      }
    });
    spinner.stop()

    const spin = ora('剔除没有通过小熊三大定理检测的股票...').start();
    await sleep(1000);
    const result = res.filter(d => {
      const one = [d[10], d[11], d[12]];
      const two = [d[13], d[14], d[15]];
      const three = [d[7], d[8], d[9]];

      if (this.isBlank(d[2])) {
        return true;
      }

      if (this.isTheorem(one) || this.isTheorem(two)) {
        return false;
      }

      if (this.isTheoremThree(three)) {
        return false;
      }

      return true;
    });
    spin.stop();

    return result;
  }

  convertData(data = []) {
    return data.map(d => {
      if (this.isBlank(d[2])) {
        return [...d.slice(0, 7), '--', '--', '--', '--', '--', '--', '--', '--', '--'];
      }
      const shell = [d[7], d[8], d[9]];
      const rece = [d[10], d[11], d[12]];
      const cunHuo = [d[13], d[14], d[15]];
      const flow = [d[16], d[17], d[18]];

      const base = d.slice(0, 7);

      // 应收账款 - 营收
      const theoremOne = rece.map((r, i) => (this.convertUnit(r) - this.convertUnit(shell[i])).toFixed(4));

      // 存货 - 营收
      const theoremTwo = cunHuo.map((r, i) => (this.convertUnit(r) - this.convertUnit(shell[i])).toFixed(4));

      return [...base, ...flow, ...theoremOne, ...theoremTwo];
    });
  }

  // 处理成单位为亿元的数字， 保留6位小数
  convertUnit(str = '') {
    if (str === '--') {
      return Number('0').toFixed(2);
    }

    if (str.endsWith('万')) {
      const n = str.replace('万', '').replace(',', '');
      return (Number(n) / 10000).toFixed(6);
    }

    return Number(str.replace('亿', '').replace(',', '')).toFixed(2);
  }

  getConditions() {
    /**
     * 2012年至2018年ROE大于等于15%,2019年9月30日ROE大于等于11.25%,上市时间大于5年,行业,2018年度营收增长率,
     * 2018年度净利润增长率,2019年9月30日营收增长率,2019年9月30日净利润增长率，2015年营收增长金额,2016年营收增长金额，2017年营收增长金额，
     * 2018年营收增长金额，2015年应收账款增长金额，2016年应收账款增长金额，2017年应收账款增长金额，
     * 2018年应收账款增长金额，2015年存货增长金额，2016年存货增长金额，2017年存货增长金额，2018年存货增长金额，2018年流动比率，2017年流动比率，2016年流动比率
     */
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    const [roe, point] = this.getRoeAnd4Point(year, month);
    // 暂时不考虑选取某一天的，只支持以当天时间来获取
    const marketTime = ['上市时间大于5年'];
    const industry = ['行业'];
    const shell = this.getShell(year);
    const receivable = this.getReceivableAccount(year);
    const cunHuo = this.getCunHuo(year);
    const flow = this.getFlow(year);

    return [
      ...roe,
      ...marketTime,
      ...industry,
      ...point,
      ...shell,
      ...receivable,
      ...cunHuo,
      ...flow
    ].join(',');
  }

  getBaseGrow(year, type) {
    return [year - 1, year - 2, year - 3].map(t => `${t}年${type}`);
  }

  getShell(year) {
    return this.getBaseGrow(year, '营收增长金额');
  }

  getReceivableAccount(year) {
    return this.getBaseGrow(year, '应收账款增长金额');
  }

  getCunHuo(year) {
    return this.getBaseGrow(year, '存货增长金额');
  }

  getFlow(year) {
    return this.getBaseGrow(year, '流动比率');
  }

  getHeaders() {
    return [
      '股票代码',
      '股票名称',
      '所属行业',
      'PE分位点',
      'PB分位点',
      '单股股价',
      '1手的价格'
    ];
  }

  getRoeAnd4Point(year, month) {
    const roe = [];
    const point = [];

    if (month >= 5) {
      roe.push(`${year - 7}年至${year - 1}年ROE大于等于15%`);
      point.push(`${year - 1}年度营收增长率`, `${year - 1}年度净利润增长率`);
    } else {
      roe.push(`${year - 8}年至${year - 2}年ROE大于等于15%`);
      point.push(`${year - 2}年度营收增长率`, `${year - 2}年度净利润增长率`);
    }

    if (month >= 1 && month < 5) {
      roe.push(`${year - 1}年9月30日ROE大于等于11.25%`);
      point.push(`${year - 1}年9月30日营收增长率`, `${year - 1}年9月30日净利润增长率`);
    } else if (month >= 5 && month < 9) {
      roe.push(`${year}年3月31日ROE大于等于3.75%`);
      point.push(`${year}年3月31日营收增长率`, `${year}年3月31日净利润增长率`);
    } else if (month >= 9 && month < 11) {
      roe.push(`${year}年6月30日ROE大于等于7.5%`);
      point.push(`${year}年6月30日营收增长率`, `${year}年6月30日净利润增长率`);
    } else {
      roe.push(`${year}年9月30日ROE大于等于11.25%`);
      point.push(`${year}年9月30日营收增长率`, `${year}年9月30日净利润增长率`);
    }

    return [roe, point];
  }

  removeElement(array = [], removeIds = []) {
    return array.filter((a, i) => (i >=2 && i < 4) || i >= 15);
  }
}

module.exports = WhiteHorseStock;
