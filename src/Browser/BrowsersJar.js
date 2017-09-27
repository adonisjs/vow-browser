'use strict'

/*
 * vow-browser-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const path = require('path')
const os = require('os')
const puppeteer = require('puppeteer')
const debug = require('debug')('adonis:vow:browser')
const Browser = require('.')

/**
 * Mac needs some love to pull the actual path to the
 * Chromium for the download `Chromium.app` file.
 *
 * @method getProperPath
 *
 * @param  {String}      folderPath
 *
 * @return {String}
 */
const getProperPath = function (folderPath) {
  const platform = os.platform()
  return platform === 'darwin' ? path.join(folderPath, 'Contents', 'MacOS', 'Chromium') : folderPath
}

module.exports = function (launchOptions) {
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
     * @async
     *
     * @param {Object} [options]
     *
     * @return {Browser}
     */
    async launch (options) {
      const clonedOptions = Object.assign({}, {
        executablePath: process.env.CHROMIUM_PATH || undefined
      }, options)

      if (clonedOptions.executablePath) {
        clonedOptions.executablePath = getProperPath(clonedOptions.executablePath)
      }

      const browser = await puppeteer.launch(clonedOptions)
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
        this.constructor.defaultBrowser = await this.launch(this.constructor.launchOptions)
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
    close () {
      return this.constructor.close()
    }

    /**
     * Closes the default browser
     *
     * @method close
     * @static
     *
     * @return {void}
     */
    static async close () {
      await this.defaultBrowser.close()
      this.defaultBrowser = null
    }
  }

  BrowsersJar.defaultBrowser = null
  BrowsersJar.launchOptions = launchOptions

  return BrowsersJar
}
