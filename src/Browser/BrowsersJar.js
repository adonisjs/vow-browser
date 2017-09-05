'use strict'

/*
 * vow-browser-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const puppeteer = require('puppeteer')
const debug = require('debug')('adonis:vow:browser')
const Browser = require('.')

class BrowsersJar {
  constructor (BaseRequest, BaseResponse, assert) {
    debug('instantiating browsers jar')

    this.BaseRequest = BaseRequest
    this.BaseResponse = BaseResponse
    this._assert = assert
  }

  /**
   * Launch a new browser
   *
   * @method launch
   *
   * @return {Browser}
   */
  async launch () {
    const browser = await puppeteer.launch()
    return new Browser(this.BaseRequest, this.BaseResponse, browser, this._assert)
  }

  /**
   * Visit a new web page using the default browser
   *
   * @method visit
   *
   * @param  {String}   url
   * @param  {Function} callback
   *
   * @return {BrowserResponse}
   */
  async visit (url, callback) {
    if (!this.constructor.defaultBrowser) {
      debug('launching new browser')
      this.constructor.defaultBrowser = await this.launch()
    } else {
      debug('re-using existing browser')
    }
    return this.constructor.defaultBrowser.visit(url, callback)
  }

  /**
   * Closes the default browser
   *
   * @method close
   * @async
   *
   * @return {void}
   */
  async close () {
    await this.constructor.defaultBrowser.close()
    this.constructor.defaultBrowser = null
  }
}

BrowsersJar.defaultBrowser = null
module.exports = BrowsersJar
