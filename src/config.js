const fundUrl = 'http://www.csindex.com.cn';
const fundIndexUrl = 'http://www.csindex.com.cn/zh-CN/search/index-derivatives?index_name=';
const fundSearchUrl = 'http://www.csindex.com.cn/zh-CN/search/index';
const fundDetailUrl = (code) => `http://fund.eastmoney.com/${code}.html?spm=search`;
const fundMoneyUrl = (code) => `http://fundf10.eastmoney.com/jjfl_${code}.html`;
const companyUrl = 'http://fund.eastmoney.com/Data/FundRankScale.aspx';
const iwencai = (c) => `http://iwencai.com/unifiedwap/result?w=${c}&querytype=&issugs&sign=${new Date().getTime()}`;
const iwencaiOrigin = 'http://www.iwencai.com/unifiedwap/home/index';

const fundamental = 'https://open.lixinger.com/api/a/stock/fundamental';

module.exports = {
  fundUrl,
  fundIndexUrl,
  fundSearchUrl,
  fundDetailUrl,
  fundMoneyUrl,
  companyUrl,
  iwencai,
  iwencaiOrigin,
  fundamental,
};
