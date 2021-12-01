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

const indexes = {
  psMetricsNavigateIndex    : '{ "index":{ "_index": "ps-metrics-navigate", "_type": "_doc" } }',
  psRequestsIndex           : '{ "index":{ "_index": "ps-requests", "_type": "_doc" } }',
  psPerfEntriesIndex        : '{ "index":{ "_index": "ps-perf-entries", "_type": "_doc" } }',
};

function _getMetricsNavigate (perfEntries, meta) {
  const metrics = {
    fp             : perfEntries.filter(pe => pe.name === 'first-paint'),
    fcp            : perfEntries.filter(pe => pe.name === 'first-contentful-paint'),
    ttfb           : perfEntries[0].responseStart - perfEntries[0].requestStart,
    response       : perfEntries[0].responseEnd - perfEntries[0].requestStart,
    load           : perfEntries[0].loadEventEnd,
    domComplete    : perfEntries[0].domComplete,
    domInteractive : perfEntries[0].domInteractive,
  };

  return [{
    ...{
      fp            : metrics.fp.length ? metrics.fp[0].startTime : 0,
      fcp           : metrics.fcp.length ? metrics.fcp[0].startTime : 0,
      ttfb          : metrics.ttfb,
      response      : metrics.response,
      load          : metrics.load,
      domComplete   : metrics.domComplete,
      domInteractive: metrics.domInteractive,
    },
    ...meta,
  }];
}

function _getRequests (perfEntries, meta) {
  const requestResources = {
    requests: perfEntries,
    images  : perfEntries.filter(pe => pe.name.match(regexMatchers.image)),
    css     : perfEntries.filter(pe => pe.name.match(regexMatchers.css)),
    scripts : perfEntries.filter(pe => pe.name.match(regexMatchers.scripts)),
    fonts   : perfEntries.filter(pe => pe.name.match(regexMatchers.fonts)),
  };

  const requestLength = {
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

  const requestTransferSize = {
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

  const requestEncodedSize = {
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

  const requestDecodedSize = {
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

  return [{
    ...requestLength,
    ...requestTransferSize,
    ...requestEncodedSize,
    ...requestDecodedSize,
    ...meta,
  }];
}

function _getPerfEntries (perfEntries, meta) {
  const clsPerfEntries = perfEntries.filter(pe => pe.entryType !== 'paint');
  const resultPerfEntries = [];

  clsPerfEntries.forEach((pe, i) => {
    resultPerfEntries.push({
      ...{
        transferSize   : pe.transferSize,
        encodedBodySize: pe.encodedBodySize,
        decodedBodySize: pe.decodedBodySize,
        dns            : pe.domainLookupEnd - pe.domainLookupStart,
        domComplete    : pe.domComplete,
        domInteractive : pe.domInteractive,
        entryType      : pe.entryType,
        headerSize     : pe.transferSize - pe.encodedBodySize,
        name           : pe.name,
        redirectTime   : pe.redirectEnd - pe.redirectStart,
        response       : pe.responseEnd - pe.requestStart,
        ttfb           : pe.responseStart - pe.requestStart,
        initConn       : pe.connectEnd - pe.connectStart,
        load           : pe.loadEventEnd,
        uuid           : uuid.v4(),
        sequence       : i,
      },
      ...meta,
    });
  });

  return resultPerfEntries;
}

function _getPlain (arr, index) {
  let resultPlain = '';
  arr.forEach(e => {
    resultPlain = `${resultPlain}\n${index}\n${JSON.stringify(e)}\n`;
  });

  return resultPlain;
}

async function exportWebPerfStats (perfEntries) {
  if (!perfEntries.length) return false;

  const now = new Date();
  const meta = {
    uuidPerfEntries: uuid.v4(),
    timestamp      : now.toISOString(),
  };

  const psMetricsNavigatePlain = _getPlain(_getMetricsNavigate(perfEntries, meta), indexes.psMetricsNavigateIndex);
  const psRequestsPlain = _getPlain(_getRequests(perfEntries, meta), indexes.psRequestsIndex);
  const psPerfEntriesPlain = _getPlain(_getPerfEntries(perfEntries, meta), indexes.psPerfEntriesIndex);

  const bulkPayload = `${psMetricsNavigatePlain}${psRequestsPlain}${psPerfEntriesPlain}`;
  await axios.post(`${elasticUrl}:${elasticPort}/_bulk`, bulkPayload, {
    headers: {
      'content-type': 'application/x-ndjson',
    }
  });

  return true;
}

module.exports = { exportWebPerfStats };
