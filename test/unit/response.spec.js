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
const fs = require('fs-extra')
const http = require('http')
const path = require('path')
const nodeCookie = require('node-cookie')
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
    this.server = null
  })

  group.afterEach(async () => {
    await this.browser.close()
    this.server.close()
  })

  group.beforeEach(() => {
    BaseRequest.hydrate()
    BaseResponse.hydrate()
    BaseRequest.macro('cookie', function (key, value) {
      this.cookies.push({ key, value })
    })
  })

  test('set response status', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.end('done')
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)

    const res = await request.end()

    assert.equal(res.status, 200)
  })

  test('get cookies as an array', async (assert) => {
    this.server = http.createServer((req, res) => {
      nodeCookie.create(res, 'username', 'virk', { sameSite: true })
      nodeCookie.create(res, 'age', '22', { sameSite: true })
      res.end('done')
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)

    const res = await request.end()

    assert.deepEqual(res.headers['set-cookie'], ['username=virk; SameSite=Strict', 'age=22; SameSite=Strict'])
  })

  test('set response headers', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.end('done')
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)

    const res = await request.end()

    assert.property(res.headers, 'content-type')
    assert.equal(res.headers['content-type'], 'text/plain')
  })

  test('get response body', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.end('done')
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)

    const res = await request.end()

    assert.equal(await res.getText(), 'done')
  })

  test('get response headers on redirect', async (assert) => {
    this.server = http.createServer((req, res) => {
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
  })

  test('get response body on redirect', async (assert) => {
    this.server = http.createServer((req, res) => {
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

    assert.equal(await res.getText(), 'reached there')
  })
})

test.group('Page interactions', (group) => {
  group.beforeEach(async () => {
    this.browser = await puppeteer.launch()
    this.server = null
  })

  group.afterEach(async () => {
    await this.browser.close()
    this.server.close()
  })

  group.beforeEach(() => {
    BaseRequest.hydrate()
    BaseResponse.hydrate()
    BaseRequest.macro('cookie', function (key, value) {
      this.cookies.push({ key, value })
    })
  })

  test('interact with page', async (assert) => {
    this.server = http.createServer((req, res) => {
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
    const text = await res.click('a').waitForNavigation().getText()

    assert.equal(text, 'reached there')
  })

  test('get new headers on page redirect', async (assert) => {
    this.server = http.createServer((req, res) => {
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
    await res.click('a').waitForNavigation()

    assert.property(res.headers, 'content-type')
    assert.equal(res.headers['content-type'], 'text/plain')
  })

  test('submit a form', async (assert) => {
    this.server = http.createServer((req, res) => {
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
      .type('[name="name"]', 'virk')
      .type('[name="age"]', 22)
      .click('button')
      .waitForNavigation()
      .getText()

    assert.equal(text, '/submit?name=virk&age=22')
  })

  test('submit a form by calling submit on form', async (assert) => {
    this.server = http.createServer((req, res) => {
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
      .type('[name="name"]', 'virk')
      .type('[name="age"]', 22)
      .submitForm('form')
      .waitForNavigation()
      .getText()

    assert.equal(text, '/submit?name=virk&age=22')
  })

  test('submit form via ajax', async (assert) => {
    this.server = http.createServer((req, res) => {
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
      .type('[name="name"]', 'virk')
      .type('[name="age"]', 22)
      .click('button')
      .waitFor('#response').getText('#response')

    assert.equal(text, '/submit?name=virk&age=22')
  }).timeout(0)

  test('get input value', async (assert) => {
    this.server = http.createServer((req, res) => {
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
  })

  test('clear input value', async (assert) => {
    this.server = http.createServer((req, res) => {
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
      .clear('[name="name"]')
      .getValue('[name="name"]')

    assert.equal(text, '')
  })

  test('get select box selected value', async (assert) => {
    this.server = http.createServer((req, res) => {
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

    const text = await res.getValue('[name="gender"]')
    assert.equal(text, 'male')
  })

  test('select value from checkbox', async (assert) => {
    this.server = http.createServer((req, res) => {
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

    const text = await res.select('[name="gender"]', 'female').getValue('[name="gender"]')
    assert.equal(text, 'female')
  })

  test('get checkbox value', async (assert) => {
    this.server = http.createServer((req, res) => {
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
  })

  test('tick checkbox', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(`
        <input type="checkbox" name="javascript" />
        <input type="checkbox" name="css" />
      `)
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)
    const res = await request.end()

    const checked = await res.check('[name="javascript"]').isChecked('[name="javascript"]')
    assert.isTrue(checked)
  })

  test('untick checkbox', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(`
        <input type="checkbox" name="javascript" checked=true/>
        <input type="checkbox" name="css" />
      `)
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)
    const res = await request.end()

    const checked = await res.isChecked('[name="javascript"]')
    assert.isTrue(checked)

    const reChecked = await res.uncheck('[name="javascript"]').isChecked('[name="javascript"]')
    assert.isFalse(reChecked)
  })

  test('get value of a radio button', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(`
        <input type="radio" name="gender" value="male" />
        <input type="radio" name="gender" checked=true value="female"/>
      `)
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)
    const res = await request.end()

    const value = await res.getValue('[name="gender"]')
    assert.equal(value, 'female')
  })

  test('check radio box', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(`
        <input type="radio" name="gender" value="male" />
        <input type="radio" name="gender" checked=true value="female"/>
      `)
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)
    const res = await request.end()

    const value = await res.radio('[name="gender"]', 'male').getValue('[name="gender"]')
    assert.equal(value, 'male')
  })

  test('get element attribute', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(`
        <div data-tip="some tip"></div>
      `)
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)
    const res = await request.end()

    const value = await res.getAttribute('div', 'data-tip')
    assert.equal(value, 'some tip')
  })

  test('get element attributes', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(`
        <div data-tip="some tip"></div>
      `)
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)
    const res = await request.end()

    const value = await res.getAttributes('div')
    assert.deepEqual(value, { 'data-tip': 'some tip' })
  })

  test('find if element is visible or not', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(`
        <div id="display-el" style="display: none"></div>
        <div id="opacity-el" style="opacity: 0"></div>
        <div id="visibility-el" style="visibility: hidden"></div>
        <div id="el"></div>
      `)
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL)
    const res = await request.end()

    const displayEl = await res.isVisible('#display-el')
    const opacityEl = await res.isVisible('#opacity-el')
    const visibilityEl = await res.isVisible('#visibility-el')
    const el = await res.isVisible('#el')

    assert.isFalse(displayEl)
    assert.isFalse(opacityEl)
    assert.isFalse(visibilityEl)
    assert.isTrue(el)
  })

  test('double click on an element', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write(`
        <span class="click-count">0</span>
        <button> Click me </button>
        <script>
          let clickCount = 0
          document.querySelector('button').addEventListener('dblclick', () => {
            clickCount = clickCount + 2
            document.querySelector('.click-count').innerText = clickCount
          })
        </script>
      `)
      res.end()
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)
    const res = await request.end()
    await res.doubleClick('button').assertHasIn('.click-count', '2')
  })

  test('right click on an element', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write(`
        <style>
          .box {
            width: 200px;
            height: 200px;
            background: red;
          }
        </style>
        <span class="click-type"></span>
        <div class="box"></div>
        <script>
          document.querySelector('.box').addEventListener('mousedown', (e) => {
            if (e.which === 3) {
              document.querySelector('.click-type').innerText = 'right click'
            }
          })
        </script>
      `)
      res.end()
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)
    const res = await request.end()
    await res.rightClick('.box').assertHasIn('.click-type', 'right click')
  })

  test('find if an element exists', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write(`
        <span class="click-type"></span>
      `)
      res.end()
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)
    const res = await request.end()
    const hasElement = await res.hasElement('.click-type')
    assert.isTrue(hasElement)
  })

  test('wait until an element goes missing', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write(`
        <span class="click-type"></span>
        <script>
          setTimeout(() => {
            document.querySelector('.click-type').remove()
          }, 1200)
        </script>
      `)
      res.end()
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)
    const res = await request.end()
    const start = new Date().getTime()
    await res.waitUntilMissing('.click-type').assertNotExists('.click-type')
    const end = new Date().getTime()
    assert.isAbove(end - start, 1000)
  })

  test('attach a file', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write(`
        <span class="file-name"></span>
        <input type="file" name="pic">
        <script>
          document.querySelector('[name="pic"]').addEventListener('change', (e) => {
            const fileNames = []
            for(const file of e.target.files) {
              fileNames.push(file.name)
            }
            document.querySelector('.file-name').innerText = fileNames.join(',')
          })
        </script>
      `)
      res.end()
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)
    const res = await request.end()

    await res
      .attach('[name="pic"]', [path.join(__dirname, './request.spec.js')])
      .assertHasIn('.file-name', 'request.spec.js')
  })

  test('attach multiple files', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write(`
        <span class="file-name"></span>
        <input type="file" name="pic" multiple>
        <script>
          document.querySelector('[name="pic"]').addEventListener('change', (e) => {
            const fileNames = []
            for(const file of e.target.files) {
              fileNames.push(file.name)
            }
            document.querySelector('.file-name').innerText = fileNames.join(',')
          })
        </script>
      `)
      res.end()
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)
    const res = await request.end()

    await res
      .attach('[name="pic"]', [path.join(__dirname, './request.spec.js'), path.join(__dirname, './response.spec.js')])
      .assertHasIn('.file-name', 'request.spec.js,response.spec.js')
  })

  test('take interim screenshots', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write(`
        <select name="gender">
          <option value="male"> Male </option>
          <option value="female"> Female </option>
        </select>

        <input type="text" name="gender-value">
        <button> Select </button>

        <script>
           document.querySelector('button').addEventListener('click', function () {
             const val = document.querySelector('[name="gender-value"]').value
             const option = document.querySelector(\`[name="gender"] [value^="$\{val}"]\`)

             if (option) {
               option.selected = true
             }
           })
        </script>
      `)
      res.end()
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)
    const res = await request.end()

    await res
      .type('[name="gender-value"]', 'female')
      .screenshot('type.png')
      .click('button')
      .screenshot('select.png')
      .assertValue('[name="gender"]', 'female')

    assert.isTrue(await fs.exists(path.join(process.cwd(), 'select.png')))
    assert.isTrue(await fs.exists(path.join(process.cwd(), 'type.png')))

    await fs.remove(path.join(process.cwd(), 'select.png'))
    await fs.remove(path.join(process.cwd(), 'type.png'))
  })
})

test.group('Assertions', (group) => {
  group.beforeEach(async () => {
    this.browser = await puppeteer.launch()
    this.server = null
  })

  group.afterEach(async () => {
    await this.browser.close()
    this.server.close()
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
    this.server = http.createServer((req, res) => {
      res.end('loaded')
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)

    const page = await request.end()

    await page.assertHas('loaded')
  }).timeout(0)

  test('assert response header', async (assert) => {
    assert.plan(1)
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end('loaded')
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)

    const page = await request.end()

    page.assertHeader('content-type', 'text/html')
  })

  test('assert body after redirect', async (assert) => {
    assert.plan(2)

    this.server = http.createServer((req, res) => {
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
      .click('a')
      .waitForNavigation()
      .assertHeader('content-type', 'text/plain')
      .assertHas('reached there')
  })

  test('throw exception if assertion fails', async (assert) => {
    assert.plan(3)

    this.server = http.createServer((req, res) => {
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
        .click('a')
        .waitForNavigation()
        .assertHeader('content-type', 'text/plain')
        .assertHas('reached nowhere')
    } catch ({ message }) {
      assert.equal(message, `expected 'reached there' to include 'reached nowhere'`)
    }
  })

  test('assert element content', async (assert) => {
    assert.plan(1)

    this.server = http.createServer((req, res) => {
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
    await page.assertHasIn('a', 'Redirect')
  })

  test('assert element attribute', async (assert) => {
    assert.plan(1)

    this.server = http.createServer((req, res) => {
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
    await page.assertAttribute('a', 'href', '/there')
  })

  test('assert input value', async (assert) => {
    assert.plan(1)

    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write('<input type="text" name="username" value="virk" />')
      res.end()
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)

    const page = await request.end()
    await page.assertValue('[name="username"]', 'virk')
  })

  test('assert radio button value', async (assert) => {
    assert.plan(1)

    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write(`
        <input type="radio" name="gender" value="male" />
        <input type="radio" name="gender" value="female" checked=true />
      `)
      res.end()
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)

    const page = await request.end()
    await page.assertValue('[name="gender"]', 'female')
  })

  test('assert checkbox is checked', async (assert) => {
    assert.plan(1)

    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write(`
        <input type="checkbox" name="terms" />
      `)
      res.end()
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)

    const page = await request.end()
    await page.check('[name="terms"]').assertIsChecked('[name="terms"]')
  })

  test('assert checkbox is not checked', async (assert) => {
    assert.plan(1)

    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write(`
        <input type="checkbox" name="terms" />
      `)
      res.end()
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)

    const page = await request.end()
    await page.assertIsNotChecked('[name="terms"]')
  })

  test('assert element is visible', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(`
        <div id="el"></div>
      `)
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)
    const res = await request.end()

    await res.assertIsVisible('#el')
  })

  test('assert element is not visible', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(`
        <div id="el" style="display: none"></div>
      `)
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)
    const res = await request.end()

    await res.assertIsNotVisible('#el')
  })

  test('assert path on redirect', async (assert) => {
    this.server = http.createServer((req, res) => {
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
    const res = await request.end()

    await res.click('a').waitForNavigation().assertPath('/there')
  })

  test('assert query params', async (assert) => {
    this.server = http.createServer((req, res) => {
      if (req.url === '/there') {
        res.writeHead(200, { 'content-type': 'text/plain' })
        res.end('reached there')
      } else {
        res.writeHead(200, { 'content-type': 'text/html' })
        res.write('<a href="/there?age=22"> Redirect </a>')
        res.end()
      }
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)
    const res = await request.end()

    await res.click('a').waitForNavigation().assertQueryParams({ age: '22' })
  })

  test('assert a single query param', async (assert) => {
    this.server = http.createServer((req, res) => {
      if (req.url === '/there') {
        res.writeHead(200, { 'content-type': 'text/plain' })
        res.end('reached there')
      } else {
        res.writeHead(200, { 'content-type': 'text/html' })
        res.write('<a href="/there?age=22"> Redirect </a>')
        res.end()
      }
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)
    const res = await request.end()

    await res.click('a').waitForNavigation().assertQueryParam('age', '22')
  })

  test('assert element exists', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write(`
        <span class="click-type"></span>
      `)
      res.end()
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)
    const res = await request.end()
    await res.assertExists('.click-type')
  })

  test('assert element doesn\'t exists', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write('')
      res.end()
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)
    const res = await request.end()
    await res.assertNotExists('.click-type')
  })

  test('assert selected value', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write(`
        <select name="gender">
          <option value="male"> Male </option>
          <option value="female"> Female </option>
        </select>

        <input type="text" name="gender-value">
        <button> Select </button>

        <script>
           document.querySelector('button').addEventListener('click', function () {
             const val = document.querySelector('[name="gender-value"]').value
             const option = document.querySelector(\`[name="gender"] [value^="$\{val}"]\`)

             if (option) {
               option.selected = true
             }
           })
        </script>
      `)
      res.end()
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)
    const res = await request.end()

    await res
      .type('[name="gender-value"]', 'female')
      .click('button')
      .assertValue('[name="gender"]', 'female')
  })

  test('assert page title', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write(`<html><head>
          <title> Home page </title>
        </head></html>`)
      res.end()
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)
    const res = await request.end()

    await res
      .assertTitle('Home page')
  })

  test('assert page body', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write('Hello dude')
      res.end()
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)
    const res = await request.end()

    await res
      .assertBody('Hello dude')
  })

  test('assert a custom evaluation', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write('Hello dude')
      res.end()
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)
    const res = await request.end()

    await res.assertEval('body', (e) => { return e.innerText }, 'Hello dude')
  })

  test('pass args to evaluation', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write('<input type="text" name="gender-value" value="virk">')
      res.end()
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)
    const res = await request.end()

    await res.assertEval('[name="gender-value"]', (e, prop) => {
      return e[prop]
    }, ['value'], 'virk')
  })

  test('cast args to array before passing to evaluation', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write('<input type="text" name="gender-value" value="virk">')
      res.end()
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)
    const res = await request.end()

    await res.assertEval('[name="gender-value"]', (e, prop) => {
      return e[prop]
    }, 'value', 'virk')
  })

  test('assert fn in browser context', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write('<input type="text" name="gender-value" value="virk">')
      res.end()
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)
    const res = await request.end()

    await res.assertFn(() => {
      return window.location.pathname
    }, '/')
  })

  test('assert count of elements', async (assert) => {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write(`
        <ul>
          <li></li>
          <li></li>
          <li></li>
        </ul>
      `)
      res.end()
    }).listen(PORT)

    const Request = RequestManager(BaseRequest, ResponseManager(BaseResponse))
    const request = new Request(this.browser, BASE_URL, assert)
    const res = await request.end()
    await res.assertCount('ul li', 3)
  })
})
