'use strict'

/*
 * vow-browser-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const debug = require('debug')('adonis:vow:browser')
const puppeteer = require('puppeteer')
const path = require('path')
const os = require('os')

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

class Browser {
  constructor (BaseRequest, BaseResponse, assert, launchOptions) {
    debug('instantiating browser')

    this._assert = assert
    this._launchOptions = launchOptions

    this.Request = require('./Request')(BaseRequest, require('./Response')(BaseResponse))
    this.puppeteerBrowser = null
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

    this.puppeteerBrowser = await puppeteer.launch(clonedOptions)
  }

  /**
   * Visit a url and get back page response
   *
   * @method visit
   *
   * @param  {String}   url
   * @param  {Function} callback
   * @param  {Object}   pageOptions
   *
   * @return {BrowserResponse}
   */
  async visit (url, callback, pageOptions) {
    if (!this.puppeteerBrowser) {
      await this.launch(this._launchOptions)
    }

    /**
     * if url is absolute, then use it, otherwise prefix
     * TEST_SERVER_URL
     */
    url = /^http(s)?/.test(url) ? url : `${process.env.TEST_SERVER_URL}${url}`

    /**
     * Make a new request instance. Each request instance opens a new page
     */
    const request = new this.Request(this.puppeteerBrowser, url, this._assert)

    /**
     * Invoke callback if exists
     */
    if (typeof (callback) === 'function') {
      callback(request)
    }

    /**
     * End the request and return response to the end
     * user
     */
    return request.end(pageOptions)
  }

  /**
   * Closes the browser
   *
   * @method close
   * @async
   *
   * @return {void}
   */
  close () {
    return this.puppeteerBrowser.close()
  }
}

module.exports = Browser
