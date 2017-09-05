'use strict'

/*
 * vow-browser-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Macroable = require('macroable')

const helpers = exports = module.exports = {}

helpers.getBaseRequest = () => {
  class BaseRequest extends Macroable {
    constructor () {
      super()
      this.cookies = []
    }

    exec () {}
  }

  BaseRequest._macros = {}
  BaseRequest._getters = {}

  return BaseRequest
}

helpers.getBaseResponse = () => {
  class BaseResponse extends Macroable {
    constructor (assert, headers) {
      super()
      this._assert = assert
      this.headers = headers
    }

    /**
     * Asserts the response status
     *
     * @method assertStatus
     *
     * @param  {Number}     expected
     *
     * @return {void}
     */
    assertStatus (expected) {
      this._assert.equal(this.status, expected)
    }

    /**
     * Asserts the response text
     *
     * @method assertText
     *
     * @param  {String}   expected
     *
     * @return {void}
     */
    assertText (expected) {
      this._assert.equal(this.text, expected)
    }

    /**
     * Asserts request body
     *
     * @method assertBody
     *
     * @param  {Mixed}   expected
     *
     * @return {void}
     */
    assertBody (expected) {
      try {
        this._assert.deepEqual(this.body, expected)
      } catch (error) {
        this._assert.equal(this.text, expected)
      }
    }

    /**
     * Asserts json payload against request body
     *
     * @method assertJSON
     *
     * @param  {Object}   expected
     *
     * @return {void}
     */
    assertJSON (expected) {
      this._assert.deepEqual(this.body, expected)
    }

    /**
     * Asset for error text on the body
     *
     * @method assertError
     *
     * @param  {String}    expected
     *
     * @return {void}
     */
    assertError (expected) {
      this.assertBody(expected)
    }

    /**
     * Assert header value
     *
     * @method assertHeader
     *
     * @param  {String}     key
     * @param  {Mixed}     value
     *
     * @return {void}
     */
    assertHeader (key, value) {
      this._assert.equal(this.headers[key.toLowerCase()], value)
    }

    updateHeaders (headers) {
      this.headers = headers
    }
  }

  BaseResponse._macros = {}
  BaseResponse._getters = {}

  return BaseResponse
}
