'use strict'

/*
 * vow-browser-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const ActionsChain = require('./ActionsChain')

module.exports = function (BaseResponse) {
  /**
   * This class is used to interact with the page
   * opened inside chromium.
   *
   * @class BrowserResponse
   */
  class BrowserResponse extends BaseResponse {
    constructor (page, assert) {
      /**
       * The base response class needs headers to be passed
       * inside constructor.
       *
       * Since a browser page visits multiple URL's during
       * a request, there is no single copy of headers.
       *
       * Instead we pass an empty header when starting
       * and later keeping on updating headers for
       * each response.
       */
      super(assert, {})
      this._page = page
    }

    /**
     * Body is same as text
     *
     * @method body
     *
     * @return {String}
     */
    get body () {
      return this.text
    }

    /**
     * An array of request redirects
     *
     * @method redirects
     *
     * @return {Array}
     */
    get redirects () {
      return []
    }

    /**
     * Updates the response to the current response
     * object on the page.
     *
     * @method updateResponse
     * @async
     *
     * @param  {Object}       response
     *
     * @return {void}
     */
    async updateResponse (response) {
      this.status = response.status
      const setCookieHeader = response.headers['set-cookie']
      if (typeof (setCookieHeader) === 'string' && setCookieHeader) {
        response.headers['set-cookie'] = setCookieHeader.split('\n')
      }
      this.updateHeaders(response.headers)
      this.text = await this.getText()
    }

    /**
     * Evaluate a function in browser context
     *
     * @method $eval
     *
     * @param  {...spread} args
     *
     * @return {String}
     */
    $eval (...args) {
      return this._page.$eval(...args)
    }

    /**
     * Evaluate a function in browser context
     *
     * @method evaluate
     *
     * @param  {...spread} args
     *
     * @return {String}
     */
    evaluate (...args) {
      return this._page.evaluate(...args)
    }

    /**
     * Returns the current page response text
     *
     * @method getText
     * @async
     *
     * @return {String}
     */
    getText (selector) {
      if (!selector) {
        return this._page.plainText()
      }
      return this.$eval(selector, (e) => e.innerText)
    }

    /**
     * Returns HTML for a given selector or entire
     * body
     *
     * @method getHtml
     * @async
     *
     * @param  {String} [selector]
     *
     * @return {String}
     */
    getHtml (selector) {
      if (!selector) {
        return this._page.content()
      }
      return this.$eval(selector, (e) => e.innerHTML)
    }

    /**
     * Returns a boolean indicating if a checkbox
     * is checked or not
     *
     * @method isChecked
     *
     * @param  {String}  selector
     *
     * @return {Boolean}
     */
    isChecked (selector) {
      return this.$eval(selector, (e) => e.checked)
    }

    /**
     * Returns value for a given selector
     *
     * @method getValue
     * @async
     *
     * @param  {String} selector
     *
     * @return {String}
     */
    getValue (selector) {
      return this.evaluate((s) => {
        const nodes = document.querySelectorAll(s)
        if (!nodes.length) {
          throw new Error('Node not found')
        }

        if (nodes[0].type === 'radio') {
          let checkedValue = null
          for (const item of nodes) {
            if (item.checked) {
              checkedValue = item.value
              break
            }
          }
          return checkedValue
        }

        return nodes[0].value
      }, selector)
    }

    /**
     * Returns value for a given attribute
     *
     * @method getAttribute
     * @async
     *
     * @param  {String}     selector
     * @param  {String}     attribute
     *
     * @return {String}
     */
    getAttribute (selector, attribute) {
      return this.$eval(selector, (e, attr) => {
        return e.getAttribute(attr)
      }, attribute)
    }

    /**
     * Returns an object of attributes
     *
     * @method getAttributes
     * @async
     *
     * @param  {String}      selector
     *
     * @return {Object}
     */
    getAttributes (selector) {
      return this.$eval(selector, (e, attr) => {
        const attrsMap = e.attributes
        const attrs = {}
        for (let i = 0; i < attrsMap.length; i++) {
          const node = attrsMap.item(i)
          attrs[node.nodeName] = node.value
        }
        return attrs
      })
    }

    /**
     * Returns reference to the actions chain, which
     * can be used to interact with the page.
     *
     * @method chain
     *
     * @return {Object}
     */
    chain () {
      return new ActionsChain(this)
    }

    /**
     * Asserts that body has certain text available
     *
     * @method assertHas
     *
     * @param  {String}  expected
     *
     * @return {void}
     */
    async assertHas (expected) {
      const actual = await this.getText()
      this._assert.include(actual, expected)
    }

    /**
     * Assert a certain element has given text
     *
     * @method assertHasIn
     *
     * @param  {String}    selector
     * @param  {String}    expected
     *
     * @return {void}
     */
    async assertHasIn (selector, expected) {
      const actual = await this.getText(selector)
      this._assert.include(actual, expected)
    }

    /**
     * Asserts a selector attribute value
     *
     * @method assertAttribute
     *
     * @param  {String}        selector
     * @param  {String}        attribute
     * @param  {String}        expected
     *
     * @return {void}
     */
    async assertAttribute (selector, attribute, expected) {
      const actual = await this.getAttribute(selector, attribute)
      this._assert.equal(actual, expected)
    }
  }

  return BrowserResponse
}
