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
      const BrowsersJar = require('../src/Browser/BrowsersJar')

      return function ({ Context, Request, Response }) {
        Context.getter('browser', function () {
          return new BrowsersJar(Request, Response, this.assert)
        }, true)
      }
    })
  }
}

module.exports = BrowserProvider
