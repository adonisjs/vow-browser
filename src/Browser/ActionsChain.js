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
const pSeries = require('p-series')

/**
 * This class chains the action promises and
 * resolves them in series at the end.
 *
 * @class ActionsChain
 * @constructor
 */
class ActionsChain {
  constructor (browserResponse) {
    this._res = browserResponse

    /**
     * An array of actions to be executed later
     *
     * @type {Array}
     */
    this._actions = []
  }

  /**
   * Click on a element
   *
   * @method click
   *
   * @param  {Selector} selector
   * @param  {Object}   [options]
   *
   * @chainable
   */
  click (selector, options) {
    this._actions.push(() => this._res._page.click(selector, options))
    return this
  }

  /**
   * Double clicks on an element
   *
   * @method doubleClick
   *
   * @param  {Selector}    selector
   * @param  {Object}     [options = {}]
   *
   * @chainable
   */
  doubleClick (selector, options) {
    const clonedOptions = Object.assign({}, options, { clickCount: 2 })
    this._actions.push(() => this._res._page.click(selector, clonedOptions))
    return this
  }

  /**
   * Right clicks on an element
   *
   * @method doubleClick
   *
   * @param  {Selector}    selector
   * @param  {Object}     [options = {}]
   *
   * @chainable
   */
  rightClick (selector, options) {
    const clonedOptions = Object.assign({}, options, { button: 'right' })
    this._actions.push(() => this._res._page.click(selector, clonedOptions))
    return this
  }

  /**
   * Type inside an input box or textarea
   *
   * @method type
   *
   * @param  {String} selector
   * @param  {String} text
   * @param  {Object} [options = {}]
   *
   * @chainable
   */
  type (selector, text, options = {}) {
    this._actions.push(() => {
      return this._res._page.type(selector, String(text), options)
    })
    return this
  }

  /**
   * Selects an option from the dropdown list
   *
   * @method select
   *
   * @param  {String} selector
   * @param  {String|Array} values
   *
   * @chainable
   */
  select (selector, values) {
    values = values instanceof Array === true ? values : [values]
    this._actions.push(() => {
      return this._res._page.$eval(selector, (element, v) => {
        for (const option of element.options) {
          if (v.indexOf(option.value) > -1) {
            option.selected = true
          }
        }
      }, values)
    })
    return this
  }

  /**
   * Checks a given checkbox
   *
   * @method check
   *
   * @param  {String} selector
   *
   * @chainable
   */
  check (selector) {
    this._actions.push(() => {
      return this._res._page.$eval(selector, (e) => (e.checked = true))
    })
    return this
  }

  /**
   * Un Check a given checkbox
   *
   * @method uncheck
   *
   * @param  {String} selector
   *
   * @chainable
   */
  uncheck (selector) {
    this._actions.push(() => {
      return this._res._page.$eval(selector, (e) => (e.checked = false))
    })
    return this
  }

  /**
   * Select a radio button based off it's value
   *
   * @method radio
   *
   * @param  {String} selector
   * @param  {String} value
   *
   * @chainable
   */
  radio (selector, value) {
    this._actions.push(() => {
      return this._res._page.$eval(`${selector}[value^="${value}"]`, (e) => (e.checked = true))
    })
    return this
  }

  /**
   * Submits a form
   *
   * @method submitForm
   *
   * @param  {Selector}   selector
   *
   * @chainable
   */
  submitForm (selector) {
    this._actions.push(() => {
      return this._res._page.$eval(selector, (e) => e.submit())
    })
    return this
  }

  /**
   * Evaluate js on the page
   *
   * @method evaluate
   *
   * @param  {Function} fn
   *
   * @chainable
   */
  evaluate (fn) {
    this._actions.push(() => this._res._page.evaluate(fn))
    return this
  }

  /**
   * Evaluate js on the page
   *
   * @method $eval
   *
   * @param  {Function} fn
   *
   * @chainable
   */
  $eval (fn) {
    this._actions.push(() => this._res._page.$eval(fn))
    return this
  }

  /**
   * Wait for a given selector to be ready
   *
   * @method waitFor
   *
   * @param  {String} selectorOrFunctionOrTimeout
   * @param  {Object} [options = {}]
   *
   * @chainable
   */
  waitFor (selectorOrFunctionOrTimeout, options) {
    this._actions.push(() => this._res._page.waitFor(selectorOrFunctionOrTimeout, options))
    return this
  }

  /**
   * Wait for a element to be appear.
   *
   * @method waitForElement
   *
   * @param  {Selector}       selector
   * @param  {Number}         [timeout = 15000] In milliseconds
   *
   * @chainable
   */
  waitForElement (selector, timeout) {
    return this.waitFor(selector, { timeout: timeout || 15 * 1000 })
  }

  /**
   * Pause for a while
   *
   * @method pause
   *
   * @param  {String} [timeout = 15000]
   *
   * @chainable
   */
  pause (timeout) {
    return this.waitFor(timeout || 15 * 1000)
  }

  /**
   * Wait until a selector disappears from DOM
   *
   * @method waitUntilMissing
   *
   * @param  {Selector}         selector
   * @param  {Selector}         options
   *
   * @chainable
   */
  waitUntilMissing (selector, options) {
    this._actions.push(() => {
      return this._res._page.waitForFunction((s) => {
        return !document.querySelector(s)
      }, options, selector)
    })
    return this
  }

  /**
   * Waits for navigation to end
   *
   * @method waitForNavigation
   *
   * @chainable
   */
  waitForNavigation () {
    this._actions.push(async () => {
      const response = await this._res._page.waitForNavigation()
      this._res.updateResponse(response)
    })
    return this
  }

  /**
   * @see BrowserResponse.getText
   */
  getText (selector) {
    this._actions.push(() => this._res.getText(selector))
    return this
  }

  /**
   * @see BrowserResponse.isVisible
   */
  isVisible (selector) {
    this._actions.push(() => this._res.isVisible(selector))
    return this
  }

  /**
   * @see BrowserResponse.getPath
   */
  getPath () {
    this._actions.push(() => this._res.getPath())
    return this
  }

  /**
   * @see BrowserResponse.getQueryParams
   */
  getQueryParams () {
    this._actions.push(() => this._res.getQueryParams())
    return this
  }

  /**
   * @see BrowserResponse.getQueryParam
   */
  getQueryParam (key) {
    this._actions.push(() => this._res.getQueryParam(key))
    return this
  }

  /**
   * @see BrowserResponse.getElement
   */
  getElement (selector) {
    this._actions.push(() => this._res.getElement(selector))
    return this
  }

  /**
   * @see BrowserResponse.getHtml
   */
  getHtml (selector) {
    this._actions.push(() => this._res.getHtml(selector))
    return this
  }

  /**
   * @see BrowserResponse.hasElement
   */
  hasElement (selector) {
    this._actions.push(() => this._res.hasElement(selector))
    return this
  }

  /**
   * @see BrowserResponse.isChecked
   */
  isChecked (selector) {
    this._actions.push(() => this._res.isChecked(selector))
    return this
  }

  /**
   * @see BrowserResponse.getAttribute
   */
  getAttribute (selector, attribute) {
    this._actions.push(() => this._res.getAttribute(selector, attribute))
    return this
  }

  /**
   * @see BrowserResponse.getAttributes
   */
  getAttributes (selector) {
    this._actions.push(() => this._res.getAttributes(selector))
    return this
  }

  /**
   * Clear the input.
   *
   * @method clear
   *
   * @param  {String} selector
   *
   * @chainable
   */
  clear (selector) {
    this._actions.push(() => this._res._page.$eval(selector, (e) => (e.value = '')))
    return this
  }

  /**
   * @see BrowserResponse.getValue
   */
  getValue (selector) {
    this._actions.push(() => this._res.getValue(selector))
    return this
  }

  /**
   * Attach one or more files
   *
   * @method attach
   *
   * @param  {Selector} selector
   * @param  {Array} files
   *
   * @chainable
   */
  attach (selector, files) {
    this._actions.push(async () => {
      const element = await this._res.getElement(selector)
      return element.uploadFile(...files)
    })
    return this
  }

  /**
   * Take screenshot of current state
   *
   * @method screenshot
   *
   * @param  {String}   path
   * @param  {Object}   [options]
   *
   * @chainable
   */
  screenshot (path, options) {
    const clonedOptions = Object.assign({}, options, { path })
    this._actions.push(() => this._res._page.screenshot(clonedOptions))
    return this
  }

  /**
   * Assert body has the given text
   *
   * @method assertHas
   *
   * @param {String} expected
   *
   * @chainable
   */
  assertHas (expected) {
    this._actions.push(async () => {
      const actual = await this._res.getText()
      this._res._assert.include(actual, expected)
    })
    return this
  }

  /**
   * Assert selector body has text
   *
   * @method assertHasIn
   *
   * @param  {Selector}    selector
   * @param  {String}      expected
   *
   * @chainable
   */
  assertHasIn (selector, expected) {
    this._actions.push(async () => {
      const actual = await this._res.getText(selector)
      this._res._assert.include(actual, expected)
    })
    return this
  }

  /**
   * Assert response header
   *
   * @method assertHeader
   *
   * @param {String} key
   * @param {String} value
   *
   * @chainable
   */
  assertHeader (...args) {
    this._actions.push(() => {
      return this._res.assertHeader(...args)
    })
    return this
  }

  /**
   * Assert attribute value of a selector
   *
   * @method assertAttribute
   *
   * @param  {Selector}        selector
   * @param  {String}          attribute
   * @param  {String}          expected
   *
   * @chainable
   */
  assertAttribute (selector, attribute, expected) {
    this._actions.push(async () => {
      const actual = await this._res.getAttribute(selector, attribute)
      this._res._assert.deepEqual(actual, expected)
    })
    return this
  }

  /**
   * Assert input box value
   *
   * @method assertValue
   *
   * @param  {Selector}    selector
   * @param  {String}      expected
   *
   * @chainable
   */
  assertValue (selector, expected) {
    this._actions.push(async () => {
      const actual = await this._res.getValue(selector)
      this._res._assert.deepEqual(actual, expected)
    })
    return this
  }

  /**
   * Assert that checkbox is checked
   *
   * @method assertIsChecked
   *
   * @param  {Selector}        selector
   *
   * @chainable
   */
  assertIsChecked (selector) {
    this._actions.push(async () => {
      const checked = await this._res.isChecked(selector)
      this._res._assert.isTrue(checked)
    })
    return this
  }

  /**
   * Assert that checkbox is not checked
   *
   * @method assertIsNotChecked
   *
   * @param  {Selector}        selector
   *
   * @chainable
   */
  assertIsNotChecked (selector) {
    this._actions.push(async () => {
      const checked = await this._res.isChecked(selector)
      this._res._assert.isFalse(checked)
    })
    return this
  }

  /**
   * Asserts that an element is visible
   *
   * @method assertIsVisible
   *
   * @param  {Selector}        selector
   *
   * @chainable
   */
  assertIsVisible (selector) {
    this._actions.push(async () => {
      const visible = await this._res.isVisible(selector)
      this._res._assert.isTrue(visible)
    })
    return this
  }

  /**
   * Assert that an element is not visible
   *
   * @method assertIsNotVisible
   *
   * @param  {Selector}           selector
   *
   * @chainable
   */
  assertIsNotVisible (selector) {
    this._actions.push(async () => {
      const visible = await this._res.isVisible(selector)
      this._res._assert.isFalse(visible)
    })
    return this
  }

  /**
   * Asserts current url path
   *
   * @method assertPath
   *
   * @param  {String}   expected
   *
   * @chainable
   */
  assertPath (expected) {
    this._actions.push(() => {
      const actual = this._res.getPath()
      this._res._assert.deepEqual(actual, expected)
    })
    return this
  }

  /**
   * Asserts query params
   *
   * @method assertQueryParams
   *
   * @param  {String}   expected
   *
   * @chainable
   */
  assertQueryParams (expected) {
    this._actions.push(() => {
      const params = this._res.getQueryParams()
      this._res._assert.deepEqual(params, expected)
    })
    return this
  }

  /**
   * Asserts query param
   *
   * @method assertQueryParams
   *
   * @param {String} key
   * @param {String} expected
   *
   * @chainable
   */
  assertQueryParam (key, expected) {
    this._actions.push(() => {
      const actual = this._res.getQueryParam(key)
      this._res._assert.deepEqual(actual, expected)
    })
    return this
  }

  /**
   * Asserts that an element exists
   *
   * @method assertExists
   *
   * @param  {Selector}     selector
   *
   * @chainable
   */
  assertExists (selector) {
    this._actions.push(async () => {
      const exists = await this._res.hasElement(selector)
      this._res._assert.isTrue(exists)
    })
    return this
  }

  /**
   * Asserts that an element doesnt exists
   *
   * @method assertNotExists
   *
   * @param  {Selector}        selector
   *
   * @chainable
   */
  assertNotExists (selector) {
    this._actions.push(async () => {
      const exists = await this._res.hasElement(selector)
      this._res._assert.isFalse(exists)
    })
    return this
  }

  /**
   * Assert page title
   *
   * @method assertTitle
   *
   * @param  {String}    expected
   *
   * @chainable
   */
  assertTitle (expected) {
    this._actions.push(async () => {
      const title = await this._res.getTitle()
      this._res._assert.deepEqual(title, expected)
    })
    return this
  }

  /**
   * Assert web page body
   *
   * @method assertBody
   *
   * @param  {String}   expected
   *
   * @chainable
   */
  assertBody (expected) {
    this._actions.push(async () => {
      const actual = await this._res.getText()
      this._res._assert.deepEqual(actual, expected)
    })
    return this
  }

  /**
   * Evaluate an element and run assertions around
   * it
   *
   * @method assertEval
   *
   * @param  {Selector}   selector
   * @param  {Function}   fn
   * @param  {Array}      args
   * @param  {String}     expected
   *
   * @chainable
   */
  assertEval (selector, fn, args, expected) {
    /**
     * If expected string is not defined, then
     * use args as the expected string
     */
    if (!expected) {
      expected = args
      args = []
    }

    /**
     * Cast args to array when not an array
     */
    args = args instanceof Array === true ? args : [args]

    this._actions.push(async () => {
      const actual = await this._res._page.$eval(selector, fn, ...args)
      this._res._assert.deepEqual(actual, expected)
    })
    return this
  }

  /**
   * Asserts the output of a custom function by
   * executing it inside browser context.
   *
   * @method assertFn
   *
   * @param  {Function} fn
   * @param  {Array}    args
   * @param  {String}   expected
   *
   * @chainable
   */
  assertFn (fn, args, expected) {
    /**
     * If expected string is not defined, then
     * use args as the expected string
     */
    if (!expected) {
      expected = args
      args = []
    }

    /**
     * Cast args to array when not an array
     */
    args = args instanceof Array === true ? args : [args]

    this._actions.push(async () => {
      const actual = await this._res._page.evaluate(fn, ...args)
      this._res._assert.deepEqual(actual, expected)
    })
    return this
  }

  /**
   * Asser the count of elements available on the page
   *
   * @method assertCount
   *
   * @param  {Selector}    selector
   * @param  {Number}    expectedCount
   *
   * @chainable
   */
  assertCount (selector, expectedCount) {
    this._actions.push(async () => {
      const actualCount = await this._res._page.evaluate((s) => document.querySelectorAll(s).length, selector)
      this._res._assert.deepEqual(actualCount, expectedCount)
    })
    return this
  }

  /**
   * When promise is resolved
   *
   * @method then
   *
   * @param  {Function} outerResolve
   * @param  {Function} outerReject
   *
   * @return {Promise}
   */
  then (outerResolve, outerReject) {
    if (!this._p) {
      this._p = new Promise((resolve, reject) => {
        pSeries(this._actions).then((result) => {
          return resolve(_.last(result))
        }).catch(reject)
      })
    }
    return this._p.then(outerResolve).catch(outerReject)
  }

  /**
   * When promise is rejected
   *
   * @method catch
   *
   * @param  {Function} reject
   *
   * @return {Promise}
   */
  catch (reject) {
    return this.then(undefined, reject)
  }
}

module.exports = ActionsChain
