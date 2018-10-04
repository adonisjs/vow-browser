'use strict'

/*
 * vow-browser-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Browser = require('.')

class BrowsersJar {
  constructor () {
    this.browsers = []
  }

  newBrowser (Request, Response, assert, launchOptions) {
    const browser = new Browser(Request, Response, assert, launchOptions)
    this.browsers.push(browser)
    return browser
  }

  closeExistingBrowsers () {
    return Promise.all(this.browsers.map((browser) => browser.close()))
  }
}

module.exports = new BrowsersJar()
