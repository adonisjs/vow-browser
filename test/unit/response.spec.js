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
const ResponseManager = require('../../src/Browser/Response')
const helpers = require('../helpers')

const PORT = 3333
const BASE_URL = `http://localhost:${PORT}`

const BaseRequest = helpers.getBaseRequest()
const BaseResponse = helpers.getBaseResponse()

test.group('Response', (group) => {
  group.beforeEach(async () => {
    this.browser = await puppeteer.launch({ headless: true })
  })

  group.afterEach(async () => {
    await this.browser.close()
  })

  group.beforeEach(() => {
    BaseRequest.hydrate()
    BaseResponse.hydrate()
    BaseRequest.macro('cookie', function (key, value) {
      this.cookies.push({ key, value })
    })
  })

  test('set response status', async (assert) => {
    const server = http.createServer((req, res) => {
      res.end('done')
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)

    const res = await request.end()
    assert.equal(res.status, 200)
    server.close()
  })

  test('set response headers', async (assert) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.end('done')
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)

    const res = await request.end()
    assert.property(res.headers, 'content-type')
    assert.equal(res.headers['content-type'], 'text/plain')

    server.close()
  })

  test('get response body', async (assert) => {
    const server = http.createServer((req, res) => {
      res.end('done')
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)

    const res = await request.end()
    assert.equal(res.body, 'done')

    server.close()
  })

  test('get response headers on redirect', async (assert) => {
    const server = http.createServer((req, res) => {
      if (req.url === '/there') {
        res.writeHead(200, { 'content-type': 'text/plain' })
        res.end('reached there')
      } else {
        res.writeHead(301, { 'Location': '/there' })
        res.end()
      }
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)

    const res = await request.end()
    assert.property(res.headers, 'content-type')
    assert.equal(res.headers['content-type'], 'text/plain')
    server.close()
  })

  test('get response body on redirect', async (assert) => {
    const server = http.createServer((req, res) => {
      if (req.url === '/there') {
        res.writeHead(200, { 'content-type': 'text/plain' })
        res.end('reached there')
      } else {
        res.writeHead(301, { 'Location': '/there' })
        res.end()
      }
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)

    const res = await request.end()
    assert.equal(res.body, 'reached there')
    server.close()
  })
})

test.group('Page interactions', (group) => {
  group.beforeEach(async () => {
    this.browser = await puppeteer.launch({ headless: true })
  })

  group.afterEach(async () => {
    await this.browser.close()
  })

  group.beforeEach(() => {
    BaseRequest.hydrate()
    BaseResponse.hydrate()
    BaseRequest.macro('cookie', function (key, value) {
      this.cookies.push({ key, value })
    })
  })

  test('interact with page', async (assert) => {
    const server = http.createServer((req, res) => {
      if (req.url === '/there') {
        res.writeHead(200, { 'content-type': 'text/plain' })
        res.end('reached there')
      } else {
        res.writeHead(200, { 'content-type': 'text/html' })
        res.end(`
          <a href="/there"> Redirect </a>
        `)
      }
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)

    const res = await request.end()
    const text = await res.chain().click('a').waitForNavigation().getText()
    assert.equal(text, 'reached there')
    server.close()
  })

  test('get new headers on page redirect', async (assert) => {
    const server = http.createServer((req, res) => {
      if (req.url === '/there') {
        res.writeHead(200, { 'content-type': 'text/plain' })
        res.end('reached there')
      } else {
        res.writeHead(200, { 'content-type': 'text/html' })
        res.end(`
          <a href="/there"> Redirect </a>
        `)
      }
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)

    const res = await request.end()
    await res.chain().click('a').waitForNavigation()
    assert.property(res.headers, 'content-type')
    assert.equal(res.headers['content-type'], 'text/plain')
    server.close()
  })

  test('submit a form', async (assert) => {
    const server = http.createServer((req, res) => {
      if (req.url.startsWith('/submit')) {
        res.writeHead(200, { 'content-type': 'text/plain' })
        res.end(req.url)
      } else {
        res.writeHead(200, { 'content-type': 'text/html' })
        res.end(`
          <form action="/submit" method="GET">
            <input type="text" name="name" />
            <input type="text" name="age" />
            <button> Submit </button>
          </form>
        `)
      }
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)
    const res = await request.end()
    const text = await res
      .chain()
      .type('[name="name"]', 'virk')
      .type('[name="age"]', 22)
      .click('button')
      .waitForNavigation()
      .getText()

    assert.equal(text, '/submit?name=virk&age=22')
    server.close()
  })

  test('submit a form by calling submit on form', async (assert) => {
    const server = http.createServer((req, res) => {
      if (req.url.startsWith('/submit')) {
        res.writeHead(200, { 'content-type': 'text/plain' })
        res.end(req.url)
      } else {
        res.writeHead(200, { 'content-type': 'text/html' })
        res.end(`
          <form action="/submit" method="GET">
            <input type="text" name="name" />
            <input type="text" name="age" />
            <button> Submit </button>
          </form>
        `)
      }
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)
    const res = await request.end()
    const text = await res
      .chain()
      .type('[name="name"]', 'virk')
      .type('[name="age"]', 22)
      .submitForm('form')
      .waitForNavigation()
      .getText()

    assert.equal(text, '/submit?name=virk&age=22')
    server.close()
  })

  test('submit form via ajax', async (assert) => {
    const server = http.createServer((req, res) => {
      if (req.url.startsWith('/submit')) {
        res.writeHead(200, { 'content-type': 'text/plain' })
        res.end(req.url)
      } else {
        res.writeHead(200, { 'content-type': 'text/html' })
        res.end(`
          <form action="/submit" method="GET">
            <input type="text" name="name" />
            <input type="text" name="age" />
            <button> Submit </button>
          </form>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
          <script>
            $(function () {
              $('form').on('submit', function (e) {
                e.preventDefault()
                $.ajax({
                  url: $('form').attr('action'),
                  data: $('form').serialize(),
                  type: 'GET',
                  success: function (response) {
                    $('body').append('<div id="response">' + response + '</div>')
                  },
                  error: function (error) {
                    $('body').append('<div id="response">' + error + '</div>')
                  }
                })
              })
            })
          </script>
        `)
      }
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)
    const res = await request.end()
    const text = await res
      .chain()
      .type('[name="name"]', 'virk')
      .type('[name="age"]', 22)
      .click('button')
      .waitFor('#response').getText('#response')

    assert.equal(text, '/submit?name=virk&age=22')
    server.close()
  })

  test('get input value', async (assert) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(`
        <form action="/submit" method="GET">
          <input type="text" name="name" value="virk" />
          <button> Submit </button>
        </form>
      `)
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)
    const res = await request.end()

    const text = await res.getValue('[name="name"]')
    assert.equal(text, 'virk')
    server.close()
  })

  test('clear input value', async (assert) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(`
        <form action="/submit" method="GET">
          <input type="text" name="name" value="virk" />
          <button> Submit </button>
        </form>
      `)
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)
    const res = await request.end()
    const text = await res
      .chain()
      .clear('[name="name"]')
      .getValue('[name="name"]')

    assert.equal(text, '')
    server.close()
  })

  test('get select box selected value', async (assert) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(`
        <select name="gender">
          <option value="female">Female</option>
          <option value="male" selected>Male</option>
        </select>
      `)
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)
    const res = await request.end()
    const text = await res
      .chain()
      .getValue('[name="gender"]')

    assert.equal(text, 'male')
    server.close()
  })

  test('select value from checkbox', async (assert) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(`
        <select name="gender">
          <option value="female">Female</option>
          <option value="male" selected>Male</option>
        </select>
      `)
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)
    const res = await request.end()
    const text = await res
      .chain()
      .select('[name="gender"]', 'female')
      .getValue('[name="gender"]')

    assert.equal(text, 'female')
    server.close()
  })

  test('get checkbox value', async (assert) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(`
        <input type="checkbox" name="javascript" />
        <input type="checkbox" name="css" />
      `)
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)
    const res = await request.end()
    const checked = await res.isChecked('[name="javascript"]')
    assert.isFalse(checked)
    server.close()
  })

  test('tick checkbox', async (assert) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(`
        <input type="checkbox" name="javascript" />
        <input type="checkbox" name="css" />
      `)
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)
    const res = await request.end()
    const checked = await res
      .chain()
      .check('[name="javascript"]')
      .isChecked('[name="javascript"]')

    assert.isTrue(checked)
    server.close()
  })

  test('untick checkbox', async (assert) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(`
        <input type="checkbox" name="javascript" checked=true/>
        <input type="checkbox" name="css" />
      `)
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)
    const res = await request.end()
    const checked = await res.chain().isChecked('[name="javascript"]')
    assert.isTrue(checked)

    const reChecked = await res.chain().uncheck('[name="javascript"]').isChecked('[name="javascript"]')
    assert.isFalse(reChecked)
    server.close()
  })

  test('get value of a radio button', async (assert) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(`
        <input type="radio" name="gender" value="male" />
        <input type="radio" name="gender" checked=true value="female"/>
      `)
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)
    const res = await request.end()

    const value = await res.chain().getValue('[name="gender"]')
    assert.equal(value, 'female')
    server.close()
  })

  test('check radio box', async (assert) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(`
        <input type="radio" name="gender" value="male" />
        <input type="radio" name="gender" checked=true value="female"/>
      `)
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)
    const res = await request.end()

    const value = await res.chain().radio('[name="gender"]', 'male').getValue('[name="gender"]')
    assert.equal(value, 'male')
    server.close()
  })

  test('get element attribute', async (assert) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(`
        <div data-tip="some tip"></div>
      `)
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)
    const res = await request.end()

    const value = await res.chain().getAttribute('div', 'data-tip')
    assert.equal(value, 'some tip')
    server.close()
  })

  test('get element attributes', async (assert) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(`
        <div data-tip="some tip"></div>
      `)
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)
    const res = await request.end()

    const value = await res.chain().getAttributes('div')
    assert.deepEqual(value, { 'data-tip': 'some tip' })
    server.close()
  })
})

test.group('Assertions', (group) => {
  group.beforeEach(async () => {
    this.browser = await puppeteer.launch({ headless: true })
  })

  group.afterEach(async () => {
    await this.browser.close()
  })

  group.beforeEach(() => {
    BaseRequest.hydrate()
    BaseResponse.hydrate()
    BaseRequest.macro('cookie', function (key, value) {
      this.cookies.push({ key, value })
    })
  })

  test('assert response body', async (assert) => {
    assert.plan(1)
    const server = http.createServer((req, res) => {
      res.end('loaded')
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)

    const page = await request.end()
    await page.assertHas('loaded')
    server.close()
  })

  test('assert response header', async (assert) => {
    assert.plan(1)
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end('loaded')
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)

    const page = await request.end()
    page.assertHeader('content-type', 'text/html')
    server.close()
  })

  test('assert body after redirect', async (assert) => {
    assert.plan(2)

    const server = http.createServer((req, res) => {
      if (req.url === '/there') {
        res.writeHead(200, { 'content-type': 'text/plain' })
        res.end('reached there')
      } else {
        res.writeHead(200, { 'content-type': 'text/html' })
        res.write('<a href="/there"> Redirect </a>')
        res.end()
      }
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)

    const page = await request.end()

    await page
      .chain()
      .click('a')
      .waitForNavigation()
      .assertHeader('content-type', 'text/plain')
      .assertHas('reached there')

    server.close()
  })

  test('throw exception if assertion fails', async (assert) => {
    assert.plan(3)

    const server = http.createServer((req, res) => {
      if (req.url === '/there') {
        res.writeHead(200, { 'content-type': 'text/plain' })
        res.end('reached there')
      } else {
        res.writeHead(200, { 'content-type': 'text/html' })
        res.write('<a href="/there"> Redirect </a>')
        res.end()
      }
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)

    const page = await request.end()

    try {
      await page
        .chain()
        .click('a')
        .waitForNavigation()
        .assertHeader('content-type', 'text/plain')
        .assertHas('reached nowhere')
    } catch ({ message }) {
      assert.equal(message, `expected 'reached there' to include 'reached nowhere'`)
    }

    server.close()
  })

  test('assert element content', async (assert) => {
    assert.plan(1)

    const server = http.createServer((req, res) => {
      if (req.url === '/there') {
        res.writeHead(200, { 'content-type': 'text/plain' })
        res.end('reached there')
      } else {
        res.writeHead(200, { 'content-type': 'text/html' })
        res.write('<a href="/there"> Redirect </a>')
        res.end()
      }
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)

    const page = await request.end()
    await page.chain().assertHasIn('a', 'Redirect')
    server.close()
  })

  test('assert element attribute', async (assert) => {
    assert.plan(1)

    const server = http.createServer((req, res) => {
      if (req.url === '/there') {
        res.writeHead(200, { 'content-type': 'text/plain' })
        res.end('reached there')
      } else {
        res.writeHead(200, { 'content-type': 'text/html' })
        res.write('<a href="/there"> Redirect </a>')
        res.end()
      }
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)

    const page = await request.end()
    await page.chain().assertAttribute('a', 'href', '/there')
    server.close()
  })
})
