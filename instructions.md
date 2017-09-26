## Registering provider

The only step required to use the browser inside your tests is to register the provider inside `aceProviders` array.

#### start/app.js
```js
const aceProviders = [
  '@adonisjs/vow-browser/providers/VowBrowserProvider'
]
```

That's all! Now you are ready to launch **Chrome** and run tests.

```js
const { test, trait } = use('Test/Suite')('Example')

trait('Test/Browser')

test('visit home page', async ({ browser }) => {
  const page = await browser.visit('/')
  await page.assertHas('Adonis')
})
```
