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
const metascraper = require('metascraper')
const got = require('got')
const cookie = require('cookie')
const jsome = require('jsome')
const inquirer = require('inquirer')
const _ = require('lodash')

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
  * Fetch image info: image-json <url or id>
  * Edit image info: image-edit <url or id>
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
  * --title=<title|STRING>
  * --description=<title|STRING>
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

const yikes = (str) => Promise.reject(new Error(str))
const re1 = /CHV\.obj\.resource\.user = (\{[^]+\});/
const re2 = /id: "(.+)",/

const scraperRules = Object.assign({}, metascraper.RULES, {
  description: ($) => $('.description-text[data-text=image-description]').text(),
  albumHref: ($) => $('.description-meta a').not('[rel=tag]').attr('href'),
  albumText: ($) => $('.description-meta a').not('[rel=tag]').text(),
  categoryHref: ($) => $('.description-meta a[rel=tag]').attr('href'),
  categoryText: ($) => $('.description-meta a[rel=tag]').text(),
  views: ($) => parseInt($('.number-figures').eq(2).text(), 10),
  likes: ($) => parseInt($('.number-figures [data-text=likes-count]').text(), 10),
  width: ($) => parseInt($('meta[property="og:image:width"]').attr('content'), 10),
  height: ($) => parseInt($('meta[property="og:image:height"]').attr('content'), 10),
  authorLink: ($) => $('.user-link[rel=author]').attr('href'),
  authorId: ($) => $('script').eq(17).text().match(re1)[1].match(re2)[1],
  imageId: ($) => $('#modal-share-url').attr('value').split('/').slice(-1)[0],
  albumId: ($) => {
    const ret = $('.description-meta a').not('[rel=tag]').attr('href')
    if (ret) { return ret.split('/').slice(-1)[0] }
  },
  categoryId: ($) => {
    const ret = $('.description-meta a[rel=tag]').attr('href')
    if (ret) { return ret.split('/').slice(-1)[0] }
  },
  date: ($) => $('.description-meta span').attr('title')
})

const imageData = (x, u) => got(u, { headers: { 'user-agent': x.agent } })
  .then((res) => metascraper.scrapeHtml(res.body, scraperRules))
  .then((x) => _.omitBy(x, (y) => _.isNull(y)))

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
  if (!cli.input[1]) { return yikes('Missing directory argument.') }
  if (!fs.existsSync(cli.input[1])) {
    return yikes(`Directory ${cli.input[1]} doesn't exist.`)
  }

  if (cli.flags.type !== 'categories' && cli.flags.type !== 'albums') {
    return yikes('Flag --type should be either "categories" or "albums".')
  }

  if (cli.flags.type === 'albums') {
    return yikes('Flag --type=albums isn\'t supported yet.')
  }

  return Promise.all(x.categories.map((y) => mkdirp(path.resolve(cli.input[1], y.path))))
    .then((c) => `Created ${c.length} category directories in ${cli.input[1]}.`)
}

const fileCommand = (x) => {
  if (!cli.input[1]) { return yikes('Missing file argument.') }
  if (!fs.existsSync(cli.input[1])) {
    return yikes(`File ${cli.input[1]} doesn't exist.`)
  }
  return x.byFile(cli.input[1])
}

const urlCommand = (x) => {
  if (!cli.input[1]) { return yikes('Missing url argument.') }
  const u = url.parse(cli.input[1])
  if (!u || (u.protocol !== 'http:' && u.protocol !== 'https:')) {
    return yikes(`${cli.input[1]} doesn't look like a url.`)
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

const imageJsonCommand = (x) => {
  if (!cli.input[1]) { return yikes('Missing url argument.') }
  const u = url.parse(cli.input[1])
  if (!u || (u.protocol !== 'http:' && u.protocol !== 'https:')) {
    cli.input[1] = ['https://file.army/i', cli.input[1]].join('/')
  }
  return imageData(x, cli.input[1])
    .then((y) => jsome.getColoredString(y))
}

const imageEditCommand = (x) => {
  if (!cli.input[1]) { return yikes('Missing url argument.') }
  const u = url.parse(cli.input[1])
  if (!u || (u.protocol !== 'http:' && u.protocol !== 'https:')) {
    cli.input[1] = ['https://file.army/i', cli.input[1]].join('/')
  }

  return imageData(x, cli.input[1])
    .then((y) => {
      if (y.authorId !== x.user.id) { return yikes('You don\'t own this image. Edit not allowed.') }
      jsome(y)
      const cats = [{
        name: 'None',
        value: false,
        short: 'none'
      }]
        .concat(x.categories.map((z) => {
          return {
            name: z.text,
            value: z.id,
            short: z.path
          }
        }))

      return Promise.all([y, inquirer.prompt([
        {
          type: 'input',
          name: 'title',
          default: y.title,
          message: 'Title'
        },
        {
          type: 'input',
          name: 'description',
          default: y.description,
          message: 'Description'
        },
/*
        {
          type: 'input',
          name: 'albumId',
          default: y.albumId,
          message: 'Album'
        },
*/
        {
          type: 'list',
          name: 'categoryId',
          choices: cats,
          default: cats.findIndex((x) => y.categoryId === x.short),
          message: 'Category'
        }
      ])])
    })
    .then((y) => {
      console.log('answers', y)
      const a = {
        auth_token: x.token,
        action: 'edit',
        edit: 'image',
        'editing[id]': y[0].imageId,
        'editing[title]': y[1].title,
        'editing[nsfw]': 0
        // 'editing[new_album]': true
        // 'editing[album_privacy]': 'public
        // 'editing[album_name]'
        // 'editing[album_description]
      }

      if (y[1].categoryId !== false) { a['editing[category_id]'] = y[1].categoryId }

      if (y[1].description && y[1].description.trim()) {
        a['editing[description]'] = y[1].description.trim()
      }

/*
      if (y[1].albumId && y[1].albumId.trim()) {
        a['editing[new_album]'] = false
        a['editing[album_id]'] = y[1].albumId.trim()
      }
*/

      // FIXME Dealing with album IDs and new albums is tricky...
      // For now, just keep the album_id as is.
      if (y[0].albumId && y[0].albumId.trim()) {
        a['editing[new_album]'] = false
        a['editing[album_id]'] = y[0].albumId.trim()
      }

      return got(x.root, {
        json: true,
        headers: {
          'user-agent': x.agent,
          cookie: cookie.serialize('PHPSESSID', x.sessionCookie)
        },
        body: a
      })
    })
    .then((res) => _.pick(res, ['body', 'headers', 'statusCode', 'statusMessage']))
}

const watchCommand = (x) => {
  if (!cli.input[1]) { return yikes('Missing directory argument.') }
  const dir = path.resolve(cli.input[1])
  if (!fs.existsSync(dir)) {
    return yikes(`Directory ${dir} doesn't exist.`)
  }
  x.watchDir = dir
  x.doneDir = path.resolve(x.watchDir, '.done')
  if (!fs.existsSync(x.doneDir)) { mkdirp.sync(x.doneDir) }
  if (cli.flags.type && cli.flags.type !== 'categories' && cli.flags.type !== 'albums') {
    return yikes('Flag --type should be either "categories" or "albums".')
  }
  if (cli.flags.type === 'albums') {
    return yikes('Flag --type=albums isn\'t supported yet.')
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
      case 'image-json': return imageJsonCommand(x)
      case 'image-edit': return imageEditCommand(x)
      case 'init': return initCommand(x)
      case 'version': return x.version
      default: cli.showHelp()
    }
  })
  .then(console.log)
  .catch(console.error)
