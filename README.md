# ps-web-perf-library

This is a tiny library for exporting web performance statistics from Performance API of a browser into Elasticsearch and Kibana.

## Installation

Nothing special here, just use `npm`:

```
$ npm install ps-web-perf-library
```

or `yarn`:

```
$ yarn add ps-web-perf-library
```

## Elastic stack setup

I've created a docker image that you can use in order to:

- set up Elasticsearch indexes
- set up Kibana indexes
- set up Kibana dashboards

If everything goes smoothly, you can start collecting data and you will see them in your Kibana instance with no additional setup.

Get your Elastic stack credentials ready and run:

```
$ 
```

## Usage

Typically, you want to use it along with some test framework like WDIO or Puppeteer.

An example could be the following check where you navigate to a homepage:

```javascript
const { exportWebPerfStats } = require('ps-web-perf-library');

it('Open homepage', async () => {
  await browser
    .url(browser.config.baseUrl);

  await expect('#menu')
    .toBeDisplayedInViewport();

  const perfEntries = await browser.execute(() => {
    return window.performance.getEntries();
  });

  await exportWebPerfStats(perfEntries);
});
```

Performance statistics from `performance.getEntries()` API will end up in Elasticsearch, and will be shown on a Kibana dashboard.
