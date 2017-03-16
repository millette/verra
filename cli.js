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
const chokidar = require('chokidar')

// core
const url = require('url')
const fs = require('fs')

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
    if (cli.flags.category) { x.category(cli.flags.category) }
    if (x.connected) {
      console.log('Connected as', x.user.name || x.user.username)
    } else {
      console.log(`Not connected, verify token (${process.env.FILEARMY_TOKEN}).
Update .env file; set FILEARMY_TOKEN to your connected PHPSESSID cookie.`)
    }
    if (x.defaultCategory) {
      console.log(`Default category id: ${x.defaultCategory}`)
    }
    let method
    switch (cli.input[0]) {
      case 'categories':
        showCategories(x)
        break

      case 'url':
        if (!cli.input[1]) { return Promise.reject(new Error(`Missing url argument.`))}
        const u = url.parse(cli.input[1])
        if (!u || (u.protocol !== 'http:' && u.protocol !== 'https:')) {
          return Promise.reject(new Error(`${cli.input[1]} doesn't look like a url.`))
        }
        method = 'byUrl'
        break

      case 'file':
        if (!cli.input[1]) { return Promise.reject(new Error(`Missing file argument.`)) }
        if (!fs.existsSync(cli.input[1])) {
          return Promise.reject(new Error(`File ${cli.input[1]} doesn't exist.`))
        }
        method = 'byFile'
        break

      case 'watch':
        // XX
        // chokidar
        break

      case 'version':
        console.log(x.version)
        break

      case 'help':
      default:
        console.log(`
Available commands:
  * help (this text)
  * version
  * categories
  * url <url>
  * file <filename>

Possible flags:
  * --category <category|INTEGER|STRING>
`)
    }
    if (method) { return x[method](cli.input[1]) }
    return 'Have a nice day.'
  })
  .then(console.log)
  .catch(console.error)
