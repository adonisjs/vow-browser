'use strict'

/*
 * vow-browser-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const test = require('japa')
const http = require('http')
const puppeteer = require('puppeteer')

const RequestManager = require('../../src/Browser/Request')
const helpers = require('../helpers')

const PORT = 3333
const BASE_URL = `http://localhost:${PORT}`

const BaseRequest = helpers.getBaseRequest()
const BaseResponse = helpers.getBaseResponse()

class Response extends BaseResponse {
  constructor (page, assert, res) {
    super(assert, {})
    this._page = page
    this._currentResponse = res
  }
}

test.group('Request', (group) => {
  group.beforeEach(async () => {
    BaseRequest.hydrate()
    BaseRequest.macro('cookie', function (key, value) {
      this.cookies.push({ key, value })
    })
    this.browser = await puppeteer.launch()
  })

  group.afterEach(async (done) => {
    await this.browser.close()
    this.server.close(done)
  })

  test('visit page', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.end('done')
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, Response)
    const request = new Request(this.browser, BASE_URL)

    const res = await request.end()

    assert.instanceOf(res, Response)
    assert.equal(res._currentResponse.status(), 200)
  })

  test('set request header', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.end(req.headers['content-type'])
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, Response)
    const request = new Request(this.browser, BASE_URL)
    request.header('content-type', 'application/json')

    const res = await request.end()
    assert.instanceOf(res, Response)

    const text = await res._currentResponse.text()
    assert.equal(text, 'application/json')
  })

  test('set request cookies', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.end(req.headers.cookie)
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, Response)
    const request = new Request(this.browser, BASE_URL)
    request.cookie('name', 'virk')

    const res = await request.end()
    assert.instanceOf(res, Response)

    const text = await res._currentResponse.text()
    assert.equal(text, 'name=virk')
  })
})
