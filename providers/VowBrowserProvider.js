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
      const BrowsersJarManager = require('../src/Browser/BrowsersJar')

      return function (Suite, launchOptions) {
        const BrowsersJar = BrowsersJarManager(launchOptions)

        /**
         * Bind browser to the text context
         */
        Suite.Context.getter('browser', function () {
          return new BrowsersJar(Suite.Request, Suite.Response, this.assert)
        }, true)

        /**
         * After each suite close the browser
         */
        Suite.after(async () => {
          await BrowsersJar.close()
        })
      }
    })
  }
}

module.exports = BrowserProvider
