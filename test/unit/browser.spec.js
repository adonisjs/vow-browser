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

const Browser = require('../../src/Browser')
const helpers = require('../helpers')

const PORT = 3333
const BASE_URL = `http://localhost:${PORT}`

const BaseRequest = helpers.getBaseRequest()
const BaseResponse = helpers.getBaseResponse()

test.group('Browser', (group) => {
  group.beforeEach(() => {
    BaseRequest.hydrate()
    BaseResponse.hydrate()
    BaseRequest.macro('cookie', function (key, value) {
      this.cookies.push({ key, value })
    })
  })

  test('visit a url', async (assert) => {
    const server = http.createServer((req, res) => {
      res.end('done')
    }).listen(PORT)

    const browser = new Browser(BaseRequest, BaseResponse, assert)
    const page = await browser.visit(BASE_URL)
    page.assertStatus(200)
    await browser.close()
    server.close()
  })

  test('calling visit twice must open 2 pages', async (assert) => {
    const server = http.createServer((req, res) => {
      res.end('done')
    }).listen(PORT)

    const browser = new Browser(BaseRequest, BaseResponse, assert)
    const page = await browser.visit(BASE_URL)
    page.assertStatus(200)

    const page1 = await browser.visit(BASE_URL)
    page1.assertStatus(200)

    await browser.close()
    server.close()
  })
})
