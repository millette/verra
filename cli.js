#!/usr/bin/env node

/*
File.army client.

Copyright 2016
Robin Millette <robin@millette.info>
<http://robin.millette.info>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the
[GNU Affero General Public License](LICENSE.md)
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict'

// npm
require('dotenv-safe').load()
const meow = require('meow')
const updateNotifier = require('update-notifier')

// self
const Verra = require('./')
const pkg = require('./package.json')

updateNotifier({ pkg }).notify()

const cli = meow([
  'Usage',
  '  $ verra [input]',
  '',
  'Options',
  '  --foo  Lorem ipsum. [Default: false]',
  '',
  'Examples',
  '  $ verra',
  '  unicorns & rainbows',
  '  $ verra ponies',
  '  ponies & rainbows'
])

const verra = new Verra()

const showCategories = (x) => {
  console.log('Categories')
  console.log(`${x.categories.length} categories:`)
  x.categories.forEach((y) => {
    console.log(`${y.text}${x.defaultCategory === y.id ? ' * ' : ' '}(${y.id}) at https://file.army/category/${y.path}`)
  })
}

verra.init()
  .then((x) => {
    if (x.connected) {
      console.log('Connected as', x.user)
    } else {
      console.log(`Not connected, verify token (${process.env.FILEARMY_TOKEN}).
Update .env file; set FILEARMY_TOKEN to your connected PHPSESSID cookie.`)
    }
    switch (cli.input[0]) {
      case 'categories':
        showCategories(x)
        break

      default:
        console.log('Have a nice day.')
    }
  })
  .catch(console.error)

/*

const verra = new Verra()
verra.init()
  // .then((x) => x.category('33').byUrl('https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Euthalia_aconthea-Kadavoor-2016-06-25-003.jpg/1280px-Euthalia_aconthea-Kadavoor-2016-06-25-003.jpg'))
  // .then((x) => x.byUrl('https://pbs.twimg.com/media/C6ord3qWgAEF9pX.jpg'))
  .then((x) => x.byFile('/home/millette/booya.jpg'))
  .then(console.log)
  .catch(console.error)
*/
