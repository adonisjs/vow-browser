'use strict'

/*
 * vow-browser-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const { ServiceProvider } = require('@adonisjs/fold')

class BrowserProvider extends ServiceProvider {
  register () {
    this.app.bind('Test/Browser', () => {
      const Browser = require('../src/Browser')

      return function (Suite, launchOptions) {
        /**
         * Bind browser to the text context
         */
        Suite.Context.getter('browser', function () {
          return new Browser(Suite.Request, Suite.Response, this.assert, launchOptions)
        }, true)

        /**
         * After each test close the browser
         */
        Suite.afterEach(async () => {
          await Suite.Context.browser.close()
        })
      }
    })
  }
}

module.exports = BrowserProvider
