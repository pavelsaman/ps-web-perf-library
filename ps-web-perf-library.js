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
  const requestStats = {
    images : perfEntries.filter(pe => pe.name.match(regexMatchers.image)).length,
    css    : perfEntries.filter(pe => pe.name.match(regexMatchers.css)).length,
    scripts: perfEntries.filter(pe => pe.name.match(regexMatchers.scripts)).length,
    fonts  : perfEntries.filter(pe => pe.name.match(regexMatchers.fonts)).length,
  };

  return {
    ...requestStats,
    ...{ other: perfEntries.length - Object.keys(requestStats).map(k => requestStats[k]).reduce((a, b) => a + b, 0) },
  };
}

async function exportWebPerfStats (perfEntries) {
  if (!perfEntries.length) return false;

  const now = new Date();
  const meta = {
    uuidPerfEntries: uuid.v4(),
    datetime       : now.toISOString(),
  };

  await axios.post(`${elasticUrl}:${elasticPort}/ps-metrics/_doc/?pretty`, { ..._getMetrics(perfEntries), ...meta });
  await axios.post(`${elasticUrl}:${elasticPort}/ps-requests/_doc/?pretty`, { ..._getRequests(perfEntries), ...meta });

  return true;
}

module.exports = { exportWebPerfStats };
