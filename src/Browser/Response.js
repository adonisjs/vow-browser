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
const { URL } = require('url')
const debug = require('debug')('adonis:vow:browser')

const proxyHandler = {
  get (target, name) {
    /**
     * if node is inspecting then stick to target properties
     */
    if (typeof (name) === 'symbol' || name === 'inspect') {
      return target[name]
    }

    /**
     * Since this class is returned as part of await, recursively
     * `then` is executed, so we need to return undefined to
     * end the recursive chain.
     */
    if (name === 'then') {
      return undefined
    }

    /**
     * if value exists on target, return that
     */
    if (typeof (target[name]) !== 'undefined') {
      return target[name]
    }

    const chain = target.chain()
    if (typeof (chain[name]) === 'function') {
      return chain[name].bind(chain)
    }

    return chain[name]
  }
}

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
      this._responses = {}

      page.on('response', (res) => {
        debug('received response for %s', res.url)
        this._responses[res.url] = res
      })

      return new Proxy(this, proxyHandler)
    }

    /**
     * An array of request redirects
     *
     * @attribute redirects
     *
     * @return {Array}
     */
    get redirects () {
      return []
    }

    /**
     * Since a browser page moves between page, we keep
     * on updating the response to make sure we have
     * the latest `headers`.
     *
     * @method updateResponse
     *
     * @return {void}
     */
    updateResponse (response) {
      debug('mainframe url is %s', this._page.mainFrame().url())
      response = response || this._responses[this._page.mainFrame().url()]
      if (!response) {
        return
      }

      /**
       * Empty responses for next redirection
       */
      this._responses = {}

      this.status = response.status
      const setCookieHeader = response.headers['set-cookie']
      if (typeof (setCookieHeader) === 'string' && setCookieHeader) {
        response.headers['set-cookie'] = setCookieHeader.split('\n')
      }

      this.updateHeaders(response.headers)
    }

    /**
     * Returns the current page response text, or
     * text of a selector.
     *
     * @method getText
     * @async
     *
     * @param {Selector} [selector]
     *
     * @return {String}
     */
    getText (selector) {
      return selector ? this._page.$eval(selector, (e) => e.innerText) : this._page.evaluate(() => {
        return document.body.innerText
      })
    }

    /**
     * Returns HTML for a given selector or entire
     * body
     *
     * @method getHtml
     * @async
     *
     * @param  {Selector} [selector]
     *
     * @return {String}
     */
    getHtml (selector) {
      return selector ? this._page.$eval(selector, (e) => e.innerHTML) : this._page.content()
    }

    /**
     * Returns page title
     *
     * @method getTitle
     * @async
     *
     * @return {String}
     */
    getTitle () {
      return this._page.title()
    }

    /**
     * Returns a boolean indicating if a checkbox
     * is checked or not.
     *
     * @method isChecked
     * @async
     *
     * @param  {Selector}  selector
     *
     * @return {Boolean}
     */
    isChecked (selector) {
      return this._page.$eval(selector, (e) => e.checked)
    }

    /**
     * Returns a boolean on whether an element is visible
     * or not
     *
     * @method isVisible
     *
     * @param  {String}  selector
     *
     * @return {Boolean}
     */
    isVisible (selector) {
      return this._page.$eval(selector, (e) => {
        const styles = document.defaultView.getComputedStyle(e, null)
        return styles['opacity'] !== '0' && styles['display'] !== 'none' && styles['visibility'] !== 'hidden'
      })
    }

    /**
     * Returns value for a given selector
     *
     * @method getValue
     * @async
     *
     * @param  {Selector} selector
     *
     * @return {String}
     */
    getValue (selector) {
      return this._page.evaluate((s) => {
        const nodes = document.querySelectorAll(s)
        if (!nodes.length) {
          throw new Error('Node not found')
        }

        /**
         * Return value of the selected radio box, if
         * node is a radio button
         */
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

        /**
         * If node is an select multiple elem
         */
        if (nodes[0].type === 'select-multiple') {
          const selectedOptions = []
          for (const item of nodes[0].options) {
            if (item.selected) {
              selectedOptions.push(item.value)
            }
          }
          return selectedOptions
        }

        /**
         * Otherwise return first node value
         */
        return nodes[0].value
      }, selector)
    }

    /**
     * Returns value for a given attribute.
     *
     * @method getAttribute
     * @async
     *
     * @param  {Selector}     selector
     * @param  {String}       attribute
     *
     * @return {String}
     */
    getAttribute (selector, attribute) {
      return this._page.$eval(selector, (e, attr) => e.getAttribute(attr), attribute)
    }

    /**
     * Returns path for the current url
     *
     * @method getPath
     *
     * @return {String}
     */
    getPath () {
      return new URL(this._page.url()).pathname
    }

    /**
     * Get query string
     *
     * @method getQueryParams
     *
     * @return {String}
     */
    getQueryParams () {
      const params = new URL(this._page.url()).searchParams
      const paramsHash = {}

      for (const [name, value] of params) {
        paramsHash[name] = value
      }

      return paramsHash
    }

    /**
     * Returns value for a given key from query params
     *
     * @method getQueryParam
     *
     * @param  {String}      key
     *
     * @return {String}
     */
    getQueryParam (key) {
      return this.getQueryParams()[key]
    }

    /**
     * Returns an object of attributes
     *
     * @method getAttributes
     * @async
     *
     * @param  {Selector}      selector
     *
     * @return {Object}
     */
    getAttributes (selector) {
      return this._page.$eval(selector, (e, attr) => {
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
     * Returns a boolean indicating whether an element
     * exists or not.
     *
     * @method hasElement
     * @async
     *
     * @param  {String}   selector
     *
     * @return {Boolean}
     */
    hasElement (selector) {
      return this._page.evaluate((s) => !!document.querySelector(s), selector)
    }

    /**
     * Returns reference to an element
     *
     * @method getElement
     * @async
     *
     * @param  {Selector}   selector
     *
     * @return {Object}
     */
    getElement (selector) {
      return this._page.$(selector)
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
     * Closes the current page
     *
     * @method close
     * @async
     *
     * @return {void}
     */
    close () {
      return this._page.close()
    }

    /**
     * Overriding base response assert body, so it
     * needs to be on this class, but calls
     * the assert method on actions chain
     *
     * @method assertBody
     *
     * @return {void}
     */
    assertBody (expected) {
      return this.chain().assertBody(expected)
    }
  }

  return BrowserResponse
}
