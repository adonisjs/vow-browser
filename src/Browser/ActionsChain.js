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
   * Pushes the click action to the stack
   *
   * @method click
   *
   * @param  {...Spread} args
   *
   * @chainable
   */
  click (...args) {
    this._actions.push(() => this._res._page.click(...args))
    return this
  }

  /**
   * Type by selecting an element
   *
   * @method type
   *
   * @param  {String} selector
   * @param  {String} text
   *
   * @chainable
   */
  type (selector, text) {
    this._actions.push(() => {
      return this._res._page.focus(selector).then(() => {
        return this._res._page.type(String(text))
      })
    })
    return this
  }

  /**
   * Selects an option from the dropdown list
   *
   * @method select
   *
   * @param  {String} selector
   * @param  {String} value
   *
   * @chainable
   */
  select (selector, value) {
    this._actions.push(() => {
      return this._res._page.$eval(`${selector} [value^="${value}"]`, (e) => (e.selected = true))
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
   * Submits the form
   *
   * @method submitForm
   *
   * @param  {String}   selector
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
    this._actions.push(() => this._res.evaluate(fn))
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
    this._actions.push(() => this._res.$eval(fn))
    return this
  }

  /**
   * Wait for a given selector to be ready
   *
   * @method waitFor
   *
   * @param  {String} selector
   *
   * @chainable
   */
  waitFor (selector) {
    this._actions.push(() => this._res._page.waitFor(selector))
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
    this._actions.push(() => {
      return this._res._page.waitForNavigation().then((response) => {
        return this._res.updateResponse(response)
      })
    })
    return this
  }

  /**
   * Returns current page text
   *
   * @method getText
   *
   * @chainable
   */
  getText (selector) {
    this._actions.push(() => this._res.getText(selector))
    return this
  }

  /**
   * Return html for a given element
   *
   * @method html
   *
   * @chainable
   */
  getHtml (selector) {
    this._actions.push(() => this._res.getHtml(selector))
    return this
  }

  /**
   * Return html for a given element
   *
   * @method html
   *
   * @chainable
   */
  isChecked (selector) {
    this._actions.push(() => this._res.isChecked(selector))
    return this
  }

  /**
   * Return getAttribute for a given element
   *
   * @method getAttribute
   *
   * @chainable
   */
  getAttribute (selector, attribute) {
    this._actions.push(() => this._res.getAttribute(selector, attribute))
    return this
  }

  /**
   * Return getAttributes for a given element
   *
   * @method getAttribute
   *
   * @chainable
   */
  getAttributes (selector) {
    this._actions.push(() => this._res.getAttributes(selector))
    return this
  }

  /**
   * Clear the input
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
   * Returns value for a selector
   *
   * @method getValue
   *
   * @param  {String} selector
   *
   * @chainable
   */
  getValue (selector) {
    this._actions.push(() => this._res.getValue(selector))
    return this
  }

  /**
   * Assert body has
   *
   * @method assertHas
   *
   * @param  {...Spread} args
   *
   * @chainable
   */
  assertHas (...args) {
    this._actions.push(() => {
      return this._res.assertHas(...args)
    })
    return this
  }

  /**
   * Assert text has in
   *
   * @method assertHasIn
   *
   * @param  {...Spread} args
   *
   * @chainable
   */
  assertHasIn (...args) {
    this._actions.push(() => {
      return this._res.assertHasIn(...args)
    })
    return this
  }

  /**
   * Assert response header
   *
   * @method assertHeader
   *
   * @param  {...Spread}  args
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
   * Assert attribute
   *
   * @method assertAttribute
   *
   * @param  {...Spread}     args
   *
   * @chainable
   */
  assertAttribute (...args) {
    this._actions.push(() => {
      return this._res.assertAttribute(...args)
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
