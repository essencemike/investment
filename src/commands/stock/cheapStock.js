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
const { Crawl } = require('../../utils/http');

const { error, bold, neonGreen, fdRed } = require('../../utils/log');
const errorCaptured = require('../../utils/async');

class CheapStock {
  constructor() {}

  getStocks() {
    console.log(fdRed('暂时还不支持筛选便宜股组合，尽情期待！！'));
  }
}

module.exports = CheapStock;
