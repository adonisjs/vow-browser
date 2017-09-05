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
  constructor (page, res, assert) {
    super(assert, res.headers)
    this._page = page
    this._currentResponse = res
  }

  updateResponse (res) {
    this._currentResponse = res
  }
}

test.group('Request', (group) => {
  group.beforeEach(() => {
    BaseRequest.hydrate()
    BaseRequest.macro('cookie', function (key, value) {
      this.cookies.push({ key, value })
    })
  })

  test('visit page', async (assert) => {
    const server = http.createServer((req, res) => {
      res.end('done')
    }).listen(PORT)

    const browser = await puppeteer.launch()

    const Request = RequestManager(BaseRequest, Response)
    const request = new Request(browser, BASE_URL)

    const res = await request.end()

    assert.instanceOf(res, Response)
    assert.equal(res._currentResponse.status, 200)

    server.close()
  })

  test('set request header', async (assert) => {
    const server = http.createServer((req, res) => {
      res.end(req.headers['content-type'])
    }).listen(PORT)

    const browser = await puppeteer.launch()

    const Request = RequestManager(BaseRequest, Response)
    const request = new Request(browser, BASE_URL)
    request.header('content-type', 'application/json')

    const res = await request.end()
    assert.instanceOf(res, Response)

    const text = await res._currentResponse.text()
    assert.equal(text, 'application/json')

    server.close()
  })

  test('set request cookies', async (assert) => {
    const server = http.createServer((req, res) => {
      res.end(req.headers.cookie)
    }).listen(PORT)

    const browser = await puppeteer.launch()

    const Request = RequestManager(BaseRequest, Response)
    const request = new Request(browser, BASE_URL)
    request.cookie('name', 'virk')

    const res = await request.end()
    assert.instanceOf(res, Response)

    const text = await res._currentResponse.text()
    assert.equal(text, 'name=virk')

    server.close()
  })
})
