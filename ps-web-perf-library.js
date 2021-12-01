const axios = require('axios');
const uuid = require('uuid');

const elasticUrl = 'http://localhost';
const elasticPort = '9200';

const regexMatchers = {
  image  : /(.jpg|.jpeg|.png|.svg|.gif|.ico)/,
  css    : /(.css|css2)/,
  scripts: /(.js|.php)/,
  fonts  : /(.woff|.woff2)$/,
};

function _getMetrics (perfEntries) {
  const metrics = {
    fp  : perfEntries.filter(pe => pe.name === 'first-paint'),
    fcp : perfEntries.filter(pe => pe.name === 'first-contentful-paint'),
    ttfb: perfEntries[0].responseStart - perfEntries[0].requestStart,
  };

  return {
    fp  : metrics.fp.length ? metrics.fp[0].startTime : 0,
    fcp : metrics.fcp.length ? metrics.fcp[0].startTime : 0,
    ttfb: metrics.ttfb,
  };
}

function _getRequests (perfEntries) {
  const requestResources = {
    requests: perfEntries,
    images  : perfEntries.filter(pe => pe.name.match(regexMatchers.image)),
    css     : perfEntries.filter(pe => pe.name.match(regexMatchers.css)),
    scripts : perfEntries.filter(pe => pe.name.match(regexMatchers.scripts)),
    fonts   : perfEntries.filter(pe => pe.name.match(regexMatchers.fonts)),
  };

  let requestLength = {
    requests: requestResources.requests.length,
    images  : requestResources.images.length,
    css     : requestResources.css.length,
    scripts : requestResources.scripts.length,
    fonts   : requestResources.fonts.length,
  };
  requestLength.other = requestLength.requests
    - requestLength.images
    - requestLength.css
    - requestLength.scripts
    - requestLength.fonts;

  let requestTransferSize = {
    requestsTransferSize: requestResources.requests.map(pe => pe.transferSize || 0).reduce((a, b) => a + b, 0),
    imagesTransferSize  : requestResources.images.map(pe => pe.transferSize || 0).reduce((a, b) => a + b, 0),
    cssTransferSize     : requestResources.css.map(pe => pe.transferSize || 0).reduce((a, b) => a + b, 0),
    scriptsTransferSize : requestResources.scripts.map(pe => pe.transferSize || 0).reduce((a, b) => a + b, 0),
    fontsTransferSize   : requestResources.fonts.map(pe => pe.transferSize || 0).reduce((a, b) => a + b, 0),
  };
  requestTransferSize.otherTransferSize = requestTransferSize.requestsTransferSize
    - requestTransferSize.imagesTransferSize
    - requestTransferSize.cssTransferSize
    - requestTransferSize.scriptsTransferSize
    - requestTransferSize.fontsTransferSize;

  let requestEncodedSize = {
    requestsEncodedSize: requestResources.requests.map(pe => pe.encodedBodySize || 0).reduce((a, b) => a + b, 0),
    imagesEncodedSize  : requestResources.images.map(pe => pe.encodedBodySize || 0).reduce((a, b) => a + b, 0),
    cssEncodedSize     : requestResources.css.map(pe => pe.encodedBodySize || 0).reduce((a, b) => a + b, 0),
    scriptsEncodedSize : requestResources.scripts.map(pe => pe.encodedBodySize || 0).reduce((a, b) => a + b, 0),
    fontsEncodedSize   : requestResources.fonts.map(pe => pe.encodedBodySize || 0).reduce((a, b) => a + b, 0),
  };
  requestEncodedSize.otherEncodedSize = requestEncodedSize.requestsEncodedSize
    - requestEncodedSize.imagesEncodedSize
    - requestEncodedSize.cssEncodedSize
    - requestEncodedSize.scriptsEncodedSize
    - requestEncodedSize.fontsEncodedSize;

  let requestDecodedSize = {
    requestsDecodedSize: requestResources.requests.map(pe => pe.decodedBodySize || 0).reduce((a, b) => a + b, 0),
    imagesDecodedSize  : requestResources.images.map(pe => pe.decodedBodySize || 0).reduce((a, b) => a + b, 0),
    cssDecodedSize     : requestResources.css.map(pe => pe.decodedBodySize || 0).reduce((a, b) => a + b, 0),
    scriptsDecodedSize : requestResources.scripts.map(pe => pe.decodedBodySize || 0).reduce((a, b) => a + b, 0),
    fontsDecodedSize   : requestResources.fonts.map(pe => pe.decodedBodySize || 0).reduce((a, b) => a + b, 0),
  };
  requestEncodedSize.otherDecodedSize = requestDecodedSize.requestsDecodedSize
    - requestDecodedSize.imagesDecodedSize
    - requestDecodedSize.cssDecodedSize
    - requestDecodedSize.scriptsDecodedSize
    - requestDecodedSize.fontsDecodedSize;

  return {
    ...requestLength,
    ...requestTransferSize,
    ...requestEncodedSize,
    ...requestDecodedSize,
  };
}

async function exportWebPerfStats (perfEntries) {
  if (!perfEntries.length) return false;

  const now = new Date();
  const meta = {
    uuidPerfEntries: uuid.v4(),
    datetime       : now.toISOString(),
  };

  const psMetricsIndex = '{ "index":{ "_index": "ps-metrics", "_type": "_doc" } }';
  const psRequestsIndex = '{ "index":{ "_index": "ps-requests", "_type": "_doc" } }';

  const psMetricsPlain = JSON.stringify({ ..._getMetrics(perfEntries), ...meta });
  const psRequestsPlain = JSON.stringify({ ..._getRequests(perfEntries), ...meta });

  let bulkPayload = `${psMetricsIndex}\n${psMetricsPlain}\n`;
  bulkPayload = `${bulkPayload}${psRequestsIndex}\n${psRequestsPlain}\n`;

  await axios.post(`${elasticUrl}:${elasticPort}/_bulk`, bulkPayload, {
    headers: {
      'content-type': 'application/x-ndjson',
    }
  });

  return true;
}

module.exports = { exportWebPerfStats };
