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
const mkdirp = require('mkdirp')
const pify = require('pify')
const delay = require('delay')
const pThrottle = require('p-throttle')

// core
const url = require('url')
const fs = require('fs')
const path = require('path')

// self
const Verra = require('./')

const cli = meow(
  {
    inferType: true,
    help: `
Available commands:
  * This text: help
  * Name and version: version
  * List all categories: categories
  * Upload new image by URL: url <url>
  * Upload new image by filename: file <filename>
  * Watch a directory for new images to upload: watch <dir>

Possible flags:
  * --category=<category|INTEGER|STRING>
  * --category (disables default category found in .env)
  * --wait=<seconds|INTEGER> (waits between seconds and 1.5 * seconds)
`
  },
  {
    alias: {
      category: 'c',
      wait: 'w'
    },
    boolean: true,
    default: { wait: 5 * 60 }
  }
)

updateNotifier(cli).notify()

const verra = new Verra()

const seconds = cli.flags.wait

const categoriesCommand = (x) => {
  const ar = ['Categories']
  ar.push(`${x.categories.length} categories:`)
  x.categories.forEach((y) => {
    ar.push(`${y.text}${x.defaultCategory === y.id ? ' * ' : ' '}(${y.id}) at https://file.army/category/${y.path}`)
  })
  return ar.join('\n')
}

const fileCommand = (x) => {
  if (!cli.input[1]) { return Promise.reject(new Error(`Missing file argument.`)) }
  if (!fs.existsSync(cli.input[1])) {
    return Promise.reject(new Error(`File ${cli.input[1]} doesn't exist.`))
  }
  return x.byFile(cli.input[1])
}

const urlCommand = (x) => {
  if (!cli.input[1]) { return Promise.reject(new Error(`Missing url argument.`)) }
  const u = url.parse(cli.input[1])
  if (!u || (u.protocol !== 'http:' && u.protocol !== 'https:')) {
    return Promise.reject(new Error(`${cli.input[1]} doesn't look like a url.`))
  }
  return x.byUrl(cli.input[1])
}

const rename = pify(fs.rename)
const mkdir = pify(mkdirp)

const moveFile = (x, p) => {
  const newPath = path.resolve(x.doneDir, path.relative(x.watchDir, p))
  return mkdir(path.parse(newPath).dir)
    .then(() => rename(p, newPath))
    .then(() => `Moved ${p} to ${newPath}...`)
}

const processImp = (x, p) => delay(Math.random() * seconds / 2 * 1000)
  .then(() => x.byFile(p))
  .then((y) => Promise.all([y, moveFile(x, p)]))
  .then((y) => {
    return {
      upload: y[0],
      move: y[1]
    }
  })

const processing = pThrottle(processImp, 1, seconds * 1000)

const watchCommand = (x) => {
  if (!cli.input[1]) { return Promise.reject(new Error(`Missing directory argument.`)) }
  const dir = path.resolve(cli.input[1])
  if (!fs.existsSync(dir)) {
    return Promise.reject(new Error(`Directory ${dir} doesn't exist.`))
  }
  x.watchDir = dir
  x.doneDir = path.resolve(x.watchDir, '.done')
  if (!fs.existsSync(x.doneDir)) { mkdirp.sync(x.doneDir) }
  x.watcher = chokidar.watch(dir, { ignored: x.doneDir })
  x.watcher.on('all', (ev, p) => {
    if (ev !== 'change' && ev !== 'add') { return }
    processing(x, p)
      .then((aa) => { console.log('processed', aa) })
      .catch(console.error)
  })
  return `Watching ${dir}...`
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

    switch (cli.input[0]) {
      case 'categories': return categoriesCommand(x)
      case 'url': return urlCommand(x)
      case 'file': return fileCommand(x)
      case 'watch': return watchCommand(x)
      case 'version': return x.version
      default: cli.showHelp()
    }
  })
  .then(console.log)
  .catch(console.error)
