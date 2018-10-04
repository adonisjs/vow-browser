'use strict'

/*
 * vow-browser-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/
const _ = require('lodash')

module.exports = function (BaseRequest, Response) {
  /**
   * This class is used to initiate a request
   * via opening a url inside chromium
   *
   * @class BrowserRequest
   */
  class BrowserRequest extends BaseRequest {
    constructor (browser, url, assert) {
      super()
      this._browser = browser
      this._url = url
      this._headers = {}
      this._assert = assert

      /**
       * Access to the request page. Added when `end` method is called
       */
      this.page = null
    }

    /**
     * Set page headers
     *
     * @method _setHeaders
     *
     * @param  {Object}    page
     *
     * @private
     */
    _setHeaders (page) {
      if (_.size(this._headers)) {
        page.setExtraHTTPHeaders(this._headers)
      }
    }

    /**
     * Set page cookies
     *
     * @method _setCookies
     * @async
     *
     * @param  {Object}    page
     *
     * @private
     */
    async _setCookies (page) {
      if (!_.size(this.cookies)) {
        return
      }

      const domain = new (require('url')).URL(this._url).hostname

      const cookies = _.map(this.cookies, (cookie) => {
        return { name: cookie.key, value: cookie.value, domain }
      })

      await page.setCookie(...cookies)
    }

    /**
     * Set request header
     *
     * @method header
     *
     * @param  {String} key
     * @param  {String} value
     *
     * @chainable
     */
    header (key, value) {
      this._headers[key] = value
      return this
    }

    /**
     * Make request and returns @ref('BrowserResponse') instance
     *
     * @method end
     * @async
     *
     * @param {Object} options
     *
     * @return {BrowserResponse}
     */
    async end (options) {
      this.page = await this._browser.newPage()

      /**
       * Execute before hooks
       */
      await this.exec('before')

      /**
       * Set headers if any
       */
      this._setHeaders(this.page)

      /**
       * Set cookies if any
       */
      await this._setCookies(this.page)

      /**
       * Visiting the defined URL
       */
      const res = await this.page.goto(this._url, options)

      /**
       * Execute after hooks
       */
      await this.exec('after')

      /**
       * New up response
       *
       * @type {BrowserResponse}
       */
      return new Response(this.page, this._assert, res)
    }
  }
  return BrowserRequest
}
