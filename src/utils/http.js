const http = require('http');
const hh = require('http-https');

function sleep(duration) {
  return new Promise(resolve => {
    setTimeout(resolve, duration);
  });
}

function getPagesAsync(url) {
  return new Promise(function (resolve, reject) {
    http
      .get(url, function (res) {
        var chunks = [];

        res.on('data', function(chunk) {
          chunks.push(chunk);
        });

        res.on('end', function() {
          resolve(chunks);
        });
      })
      .on('error', function (e) {
        reject(e);
        console.log('获取信息出错！');
      });
  });
}

function getHttpsPages(url) {
  return new Promise(function (resolve, reject) {
    hh.request(url, function (res) {
      var chunks = [];

      res.on('data', function(chunk) {
        chunks.push(chunk);
      });

      res.on('end', function() {
        resolve(chunks);
      });
    }).on('error', function (e) {
      reject(e)
      console.log('获取信息出错！');
    });
  });
}

module.exports = { Crawl: getPagesAsync, CrawlH: getHttpsPages, sleep };
