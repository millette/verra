'use strict'

// npm
require('dotenv-safe').load()

const Verra = require('./')

const verra = new Verra()

verra.init()
  .then((x) => x.category('33').byUrl('https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Euthalia_aconthea-Kadavoor-2016-06-25-003.jpg/1280px-Euthalia_aconthea-Kadavoor-2016-06-25-003.jpg'))
  .then(console.log)
  .catch(console.error)