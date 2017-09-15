# AdonisJs Vow Browser 🚀
> Browser client for AdonisJs test runner

[![NPM Version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Appveyor][appveyor-image]][appveyor-url]
[![Coveralls][coveralls-image]][coveralls-url]

Vow is the testing engine for AdonisJs and this repo contains the browser client for it.

<img src="http://res.cloudinary.com/adonisjs/image/upload/q_100/v1497112678/adonis-purple_pzkmzt.svg" width="200px" align="right" hspace="30px" vspace="100px">

## Features

1. Built on top of [Google Puppeteer](https://github.com/GoogleChrome/puppeteer)
2. Offers seamless API to run tests in chromium.
3. Uses AdonisJs eco-system to make testing assertions easier.


## Installation
You can install the package from npm.
```bash
adonis install @adonisjs/vow-browser
```

## Basic Usage

```js
// add trait
trait('Test/Browser')

test('visit home page', async ({ browser }) => {
  const page = await browser.visit('/')
  await page.assertHas('AdonisJs')
}) 
```

## Moving Forward
Checkout the [official documentation](http://adonisjs.com/docs/testing) at the AdonisJs website for more info.

## Tests
Tests are written using [japa](http://github.com/thetutlage/japa). Run the following commands to run tests.

```bash
npm run test:local

# report coverage
npm run test

# on windows
npm run test:win
```

## Release History

Checkout [CHANGELOG.md](CHANGELOG.md) file for release history.

## Meta

AdonisJs – [@adonisframework](https://twitter.com/adonisframework) – virk@adonisjs.com

Checkout [LICENSE.txt](LICENSE.txt) for license information

Harminder Virk (Aman) - [https://github.com/thetutlage](https://github.com/thetutlage)

[appveyor-image]: https://img.shields.io/appveyor/ci/thetutlage/vow-browser/master.svg?style=flat-square
[appveyor-url]: https://ci.appveyor.com/project/thetutlage/vow-browser

[npm-image]: https://img.shields.io/npm/v/@adonisjs/vow-browser.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@adonisjs/vow-browser

[travis-image]: https://img.shields.io/travis/adonisjs/vow-browser/master.svg?style=flat-square
[travis-url]: https://travis-ci.org/adonisjs/vow-browser

[coveralls-image]: https://img.shields.io/coveralls/adonisjs/vow-browser/develop.svg?style=flat-square

[coveralls-url]: https://coveralls.io/github/adonisjs/vow-browser
