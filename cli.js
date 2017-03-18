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
require('dotenv-safe').load({ sample: [__dirname, '.env.required'].join('/') })
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
  * Init watch directory: init <dir>
  * Upload new image by URL: url <url>
  * Upload new image by filename: file <filename>
  * Watch a directory for new images to upload: watch <dir>

Possible flags:
  * --category=<category|INTEGER|STRING>
  * --category (disables default category found in .env)
  * --wait=<seconds|INTEGER> (waits between [seconds] and 1.5 * [seconds])
  * --type=<type|STRING> (directory init: "categories" or "albums")
  * --incognito (hide user-agent and stuff)
  * --incognito=<user-agent|STRING>
  * --incognito=<false|no|0|STRING> to disable if it's set in the environment
`
  },
  {
    alias: {
      category: 'c',
      wait: 'w',
      type: 't'
    },
    boolean: true,
    default: {
      wait: parseInt(process.env.VERRA_WAIT, 10) || (5 * 60)
    }
  }
)

updateNotifier(cli).notify()

const rename = pify(fs.rename)
const mkdir = pify(mkdirp)

const incognito = (() => {
  let incognitoA = false
  const truthy = ['true', 'yes', '1', 1]
  const falsy = ['false', 'no', '0', 0]
  if (process.env.VERRA_INCOGNITO) {
    incognitoA = process.env.VERRA_INCOGNITO === true || truthy.indexOf(process.env.VERRA_INCOGNITO.toLowerCase()) !== -1
      ? true
      : process.env.VERRA_INCOGNITO
  }
  if (cli.flags.incognito === undefined) { return incognitoA }
  if (cli.flags.incognito === true || truthy.indexOf(cli.flags.incognito.toLowerCase()) !== -1) { return true }
  if (!cli.flags.incognito || falsy.indexOf(cli.flags.incognito.toLowerCase()) !== -1) { return false }
  return cli.flags.incognito
})()

const verra = new Verra({ incognito })

const categoriesCommand = (x) => {
  const ar = ['Categories']
  ar.push(`${x.categories.length} categories:`)
  x.categories.forEach((y) => {
    ar.push(`${y.text}${x.defaultCategory === y.id ? ' * ' : ' '}(${y.id}) at https://file.army/category/${y.path}`)
  })
  return ar.join('\n')
}

const initCommand = (x) => {
  if (!cli.input[1]) { return Promise.reject(new Error(`Missing directory argument.`)) }
  if (!fs.existsSync(cli.input[1])) {
    return Promise.reject(new Error(`Directory ${cli.input[1]} doesn't exist.`))
  }

  if (cli.flags.type !== 'categories' && cli.flags.type !== 'albums') {
    return Promise.reject(new Error(`Flag --type should be either "categories" or "albums".`))
  }

  if (cli.flags.type === 'albums') {
    return Promise.reject(new Error(`Flag --type=albums isn't supported yet.`))
  }

  return Promise.all(x.categories.map((y) => mkdirp(path.resolve(cli.input[1], y.path))))
    .then((c) => `Created ${c.length} category directories in ${cli.input[1]}.`)
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

const moveFile = (x, p) => {
  const newPath = path.resolve(x.doneDir, path.relative(x.watchDir, p))
  return mkdir(path.parse(newPath).dir)
    .then(() => rename(p, newPath))
    .then(() => `Moved ${p} to ${newPath}...`)
}

const processImp = (x, p) => delay(Math.random() * cli.flags.wait / 2 * 1000)
  .then(() => x.byFile(p))
  .then((y) => Promise.all([y, moveFile(x, p)]))
  .then((y) => {
    return {
      upload: y[0],
      move: y[1]
    }
  })

const processing = pThrottle(processImp, 1, cli.flags.wait * 1000)

const watchCommand = (x) => {
  if (!cli.input[1]) { return Promise.reject(new Error(`Missing directory argument.`)) }
  const dir = path.resolve(cli.input[1])
  if (!fs.existsSync(dir)) {
    return Promise.reject(new Error(`Directory ${dir} doesn't exist.`))
  }
  x.watchDir = dir
  x.doneDir = path.resolve(x.watchDir, '.done')
  if (!fs.existsSync(x.doneDir)) { mkdirp.sync(x.doneDir) }
  if (cli.flags.type && cli.flags.type !== 'categories' && cli.flags.type !== 'albums') {
    return Promise.reject(new Error(`Flag --type should be either "categories" or "albums".`))
  }
  if (cli.flags.type === 'albums') {
    return Promise.reject(new Error(`Flag --type=albums isn't supported yet.`))
  }
  if (cli.flags.type === 'categories') { x.watchType = cli.flags.type }

  x.watcher = chokidar.watch(dir, { ignored: x.doneDir })
  x.watcher.on('all', (ev, p) => {
    if (ev !== 'change' && ev !== 'add') { return }
    processing(x, p)
      .then((aa) => { console.log('processed', JSON.stringify(aa, null, '  ')) })
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
Update .env file; set FILEARMY_TOKEN to your connected PHPSESSID cookie or give it another try.`)
    }
    if (x.defaultCategory) { console.log(`Default category id: ${x.defaultCategory}`) }

    switch (cli.input[0]) {
      case 'categories': return categoriesCommand(x)
      case 'url': return urlCommand(x)
      case 'file': return fileCommand(x)
      case 'watch': return watchCommand(x)
      case 'init': return initCommand(x)
      case 'version': return x.version
      default: cli.showHelp()
    }
  })
  .then(console.log)
  .catch(console.error)
