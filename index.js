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

// core
const url = require('url')

// npm
const got = require('got')
const cookie = require('cookie')
const FormData = require('form-data')

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
  const a = str.match(re4)
  return a ? JSON.parse(chop0(a)) : false
}

const getCats = (str) => {
  const ret = []
  let x
  while ((x = re6.exec(str))) { ret.push({ id: parseInt(x[1], 10), path: x[2], text: x[3] }) }
  return ret
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

/*
const newImageUrl = (options) => {
  const body = new FormData()
  body.append('source', options.url)
  body.append('type', 'url')
  body.append('action', 'upload')
  body.append('privacy', 'public')
  body.append('timestamp', Date.now())
  body.append('auth_token', options.token)
  if (options.category) { body.append('category_id', String(options.category)) }
  body.append('nsfw', '0')
  return body
}
*/

/*
const XX = (options) => new Promise((resolve, reject) => {
  const u = url.parse(options.root)
  u.headers = { accept: 'application/json', cookie: cookie.serialize('PHPSESSID', options.sessionCookie) }

  options.body.submit(u, (e, res) => {
    if (e) { return reject(e) }
    let body = ''
    res.on('data', (g) => {
      console.log('typeof g:', typeof g)
      body += g
    })
    res.on('end', () => {
      try {
        body = JSON.parse(body)
        resolve({ body, headers: res.headers })
      } catch (e) {
        reject(e)
      }
    })
    res.on('error', (e) => reject(e))
  })
})
*/

// const newImageUpload = () => {}

module.exports = class {
  constructor (sessionCookie) {
    this.sessionCookie = sessionCookie || process.env.FILEARMY_TOKEN
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
  }

  newImageUrl (options) {
    options.body = new FormData()
    options.body.append('source', options.url)
    options.body.append('type', 'url')
    options.body.append('action', 'upload')
    options.body.append('privacy', 'public')
    options.body.append('timestamp', Date.now())
    options.body.append('auth_token', this.token)
    options.body.append('nsfw', '0')
    if (options.category) { options.body.append('category_id', String(options.category)) }
    return options
  }

  XX (options) {
    const u = url.parse(this.root)
    u.headers = { accept: 'application/json', cookie: cookie.serialize('PHPSESSID', this.sessionCookie) }
/*
    const submit = pify(options.body.submit)
    return submit(u)
      .then((res) => {
        let body = ''
        res.on('data', (g) => {
          console.log('typeof g:', typeof g)
          body += g
        })
        res.on('end', () => {
          try {
            return { body: JSON.parse(body), headers: res.headers }
          } catch (e) {
            return Promise.reject(e)
          }
        })
        res.on('error', Promise.reject)
      })
*/
    return new Promise((resolve, reject) => {
      const u = url.parse(this.root)
      u.headers = { accept: 'application/json', cookie: cookie.serialize('PHPSESSID', this.sessionCookie) }

      options.body.submit(u, (e, res) => {
        if (e) { return reject(e) }
        let body = ''
        res.on('data', (g) => {
          console.log('typeof g:', typeof g)
          body += g
        })
        res.on('end', () => {
          try {
            body = JSON.parse(body)
            resolve({ body, headers: res.headers })
          } catch (e) {
            reject(e)
          }
        })
        res.on('error', (e) => reject(e))
      })
    })
  }

  validCategory (category) {
    let found = false
    if (typeof category === 'string') { found = this.categories.find((x) => category === x.path) }
    if (typeof category === 'number') { found = this.categories.find((x) => return category === x.id) }
    return (found && found.id) || false
  }

  get elapsed () { return Date.now() - this.updatedAt }

  category (id) {
    if (!id) {
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
    return got(u, { headers: { cookie: cookie.serialize('PHPSESSID', this.sessionCookie) } })
      .then(parse)
      .then((x) => {
        Object.assign(this, x)
        this.error = false
        if (this.user) {
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
    if (!this.user) { return Promise.reject(new Error('Not connected.')) }
    const to = typeof options
    if (to !== 'string' && to !== 'object') { return Promise.reject(new Error('Argument should be a string or an object.')) }
    if (to === 'string') { options = { url: options } }
    if (!options.url) { return Promise.reject(new Error('Missing url.')) }
    options.category = options.category ? this.validCategory(options.category) : this.defaultCategory
    // if (options.token) { this.token = options.token }
    if (options.sessionCookie) { this.sessionCookie = options.sessionCookie }
    this.newImageUrl(options)
    console.log('options:', options)
    return this.XX(options)
  }

  byFile (options) {
    if (!this.user) { return Promise.reject(new Error('Not connected.')) }
    return Promise.reject(new Error('Not implemented yet.'))
  }

  edit (options) {
    if (!this.user) { return Promise.reject(new Error('Not connected.')) }
    return Promise.reject(new Error('Not implemented yet.'))
  }
}
