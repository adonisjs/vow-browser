

```
test('', ({ browser }) => {

  const page = await browser.visit('url')
  
  const page = await browser.visit('url', function (request) {
    request.cookie('')
    request.session('')
    request.loginAs('')
    request.header('')
  })

})
```


[![Greenkeeper badge](https://badges.greenkeeper.io/adonisjs/vow-browser.svg)](https://greenkeeper.io/)