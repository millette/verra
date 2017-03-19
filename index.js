/*
File.army client.

Copyright 2017
Robin Millette <mailto:robin@millette.info>
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

// self
const pkg = require('./package.json')

// core
const url = require('url')
const fs = require('fs')
const path = require('path')

// npm
const got = require('got')
const cookie = require('cookie')
const FormData = require('form-data')

if (process.env.CATEGORY) {
  console.log('Warning: CATEGORY env var is deprecated. Please use FILEARMY_CATEGORY instead. CATEGORY will be removed in an upcoming release.')
  process.env.FILEARMY_CATEGORY = process.env.CATEGORY
}

const yikes = (str) => Promise.reject(new Error(str))

const re1 = /PF\.obj\.config\.auth_token(.+);/
const re2 = /PF\.obj\.config\.json_api(.+);/
const re3 = /\bmax_filesize(.+),/
const re4 = /CHV\.obj\.logged_user(.+);/
const re5 = /\bimage_types(.+)\}/
const re6 = /<li data-content="category" data-category-id="(\d+)"><a data-content="category-name" data-link="category-url" href="https:\/\/file\.army\/category\/(.+)">(.+)<\/a><\/li>/g
const chop5 = (c, ar) => ar[1].split(c).slice(1).join(c)
const chop0 = (ar) => chop5('=', ar)
const chop1 = (str) => str.trim().slice(1, -1)
const chop = (ar) => chop1(chop0(ar))
const chop2 = (ar) => chop1(chop5(':', ar))
const chop9 = (ar) => chop2(ar).split(',').map((x) => x.trim().slice(1, -1))
const getUser = (str) => {
  try {
    const a = str.match(re4)
    return a ? JSON.parse(chop0(a)) : false
  } catch (e) { return false }
}

const textSortCats = (a, b) => {
  if (a.text > b.text) { return 1 }
  if (a.text < b.text) { return -1 }
  return 0
}

const getCats = (str) => {
  const ret = []
  let x
  while ((x = re6.exec(str))) { ret.push({ id: parseInt(x[1], 10), path: x[2], text: x[3] }) }
  return ret.sort(textSortCats)
}

const parse = (res) => {
  const body = res.body
  const headers = res.headers
  const token = chop(body.match(re1))
  const root = chop(body.match(re2))
  const maxFilesize = chop2(body.match(re3))
  const imageTypes = chop9(body.match(re5))
  const user = getUser(body)
  const categories = getCats(body)
  return { headers, token, root, maxFilesize, imageTypes, user, categories }
}

const formSetup = (type, category, token, source) => {
  const body = new FormData()
  body.append('action', 'upload')
  body.append('privacy', 'public')
  body.append('timestamp', Date.now())
  body.append('auth_token', token)
  body.append('nsfw', '0')
  if (category) { body.append('category_id', String(category)) }
  body.append('type', type)
  if (type === 'url') { body.append('source', source) }
  if (type === 'file') { body.append('source', fs.createReadStream(source)) }
  return body
}

const fileFormSetup = formSetup.bind(null, 'file')
const urlFormSetup = formSetup.bind(null, 'url')

module.exports = class {
  constructor (options) {
    if (typeof options === 'string') { options = { sessionCookie: options } }
    if (!options) { options = {} }
    this.sessionCookie = options.sessionCookie || process.env.FILEARMY_TOKEN
    this.token = ''
    this.root = 'https://file.army'
    this.createdAt = this.updatedAt = Date.now()
    this.headers = {}
    this.maxFilesize = ''
    this.imageTypes = []
    this.user = false
    this.categories = []
    this.defaultCategory = false
    this.error = false

    if (options.incognito) {
      this.agent = options.incognito === true ? 'Mozilla/5.0 (X11; Linux x86_64; rv:45.0) Gecko/20100101 Firefox/45.0' : options.incognito
    } else {
      this.agent = this.version
    }
  }

  get version () { return `${pkg.name} ${pkg.version} ${pkg.repository.url || ('https://github.com/' + pkg.repository)}` }
  get elapsed () { return Date.now() - this.updatedAt }
  get connected () { return Boolean(this.user) }

  validCategory (category) {
    let found = false
    if (typeof category === 'string') { found = this.categories.find((x) => category === x.path) }
    if (typeof category === 'number') { found = this.categories.find((x) => category === x.id) }
    return (found && found.id) || false
  }

  newImageUrl (options) {
    options.body = urlFormSetup(options.category, this.token, options.url)
    return options
  }

  newImageFile (options) {
    if (this.watchType === 'categories') {
      options.category = this.validCategory(path.dirname(options.source).split('/').slice(-1)[0])
    }
    options.body = fileFormSetup(options.category, this.token, options.source)
    return options
  }

  doit (options) {
    const u = url.parse(this.root)
    u.headers = {
      'user-agent': this.agent,
      accept: 'application/json',
      cookie: cookie.serialize('PHPSESSID', this.sessionCookie)
    }

    return new Promise((resolve, reject) => options.body.submit(u, (e, res) => {
      if (e) { return reject(e) }
      let body = ''
      res.on('data', (g) => { body += g })
      res.on('end', () => {
        try {
          body = JSON.parse(body)
          resolve({ body, headers: res.headers })
        } catch (e) { reject(e) }
      })
      res.on('error', (e) => reject(e))
    }))
  }

  category (id) {
    if (!id || id === true) {
      this.defaultCategory = false
      return this
    }
    const cat = this.validCategory(id)
    if (cat) { this.defaultCategory = cat }
    return this
  }

  init (sessionCookie) {
    if (!sessionCookie && this.token) { return this }
    if (!sessionCookie && !this.sessionCookie) { return this }
    if (sessionCookie) { this.sessionCookie = sessionCookie }
    const u = url.parse(this.root)

    // almost any page would do, but this is a short one
    u.path = '/page/contact'
    return got(u, {
      headers: {
        'user-agent': this.agent,
        cookie: cookie.serialize('PHPSESSID', this.sessionCookie)
      }
    })
      .then(parse)
      .then((x) => {
        Object.assign(this, x)
        if (process.env.FILEARMY_CATEGORY) {
          const catId = parseInt(process.env.FILEARMY_CATEGORY, 10)
          this.category(catId == process.env.FILEARMY_CATEGORY ? catId : process.env.FILEARMY_CATEGORY) // eslint-disable-line eqeqeq
        }
        this.error = false
        if (this.connected) {
          this.updatedAt = Date.now()
          return this
        }
        this.sessionCookie = false
        return this
      })
      .catch((e) => {
        this.error = e
        return this
      })
  }

  byUrl (options) {
    if (!this.connected) { return yikes('Not connected.') }
    const to = typeof options
    if (to !== 'string' && to !== 'object') { return yikes('Argument should be a string or an object.') }
    if (to === 'string') { options = { url: options } }
    if (!options.url) { return yikes('Missing url.') }
    options.category = options.category ? this.validCategory(options.category) : this.defaultCategory
    if (options.sessionCookie) { this.sessionCookie = options.sessionCookie }
    this.newImageUrl(options)
    return this.doit(options)
  }

  byFile (options) {
    if (!this.connected) { return yikes('Not connected.') }
    const to = typeof options
    if (to !== 'string' && to !== 'object') { return yikes('Argument should be a string or an object.') }
    if (to === 'string') { options = { source: options } }
    if (!options.source) { return yikes('Missing source file name.') }
    options.category = options.category ? this.validCategory(options.category) : this.defaultCategory
    if (options.sessionCookie) { this.sessionCookie = options.sessionCookie }
    this.newImageFile(options)
    return this.doit(options)
  }

  edit (options) {
    if (!this.connected) { return yikes('Not connected.') }
    return yikes('Not implemented yet.')
  }
}
