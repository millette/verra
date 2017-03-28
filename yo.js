'use strict'

require('dotenv-safe').load({ sample: [__dirname, '.env.required'].join('/') })

// core
const fs = require('fs')
const path = require('path')
const url = require('url')

// npm
const delay = require('delay')
const got = require('got')
const _ = require('lodash')
const he = require('he')
const cookie = require('cookie')

// self
const flickr = require('./lib/flickr')
const Verra = require('./')

const cats = fs.readFileSync('les-cats.txt', 'utf-8').split('\n')

const firstMatch = (tags) => {
  const m = _.intersection(tags.map((x) => x.toLowerCase()), cats)
  if (m.length) { return m[0] }
  return false
}

const command = (ver, tim) => {
  const loop = (delay) => {
    let allDones
    let did = 0
    try {
      allDones = JSON.parse(fs.readFileSync('magic-log.json', 'utf-8'))
    } catch (e) {
      console.error(e)
      allDones = []
    }

    const hi = (gg) => {
      if (allDones.indexOf(gg.id) !== -1) {
        console.log('skipping', gg.id)
        return
      }
      ++did

      flickr.imageInfo(gg.id)
        .then((x) => x.photo)
        .then((x) => {
          const obj = {
            id: x.id,
            secret: x.secret,
            server: x.server,
            farm: x.farm,
            title: x.title._content,
            description: (x.description && x.description._content) || '',
            owner: x.owner.realname || x.owner.username,
            date: x.dates ? (x.dates.taken || x.dates.posted) : new Date().toISOString(),
            location: x.location && x.location.country && x.location.country._content,
            url: x.urls.url[0]._content,
            license: x.license,
            tags: x.tags.tag.map((y) => y.raw),
            jpg: `https://c1.staticflickr.com/${x.farm}/${x.server}/${x.id}_${x.secret}_b.jpg`
          }
          if (obj.description) {
            obj.description += `\nBy ${obj.owner}${obj.location ? (' in ' + obj.location) : ''} via ${obj.url}`
          } else {
            obj.description = `By ${obj.owner}${obj.location ? (' in ' + obj.location) : ''} via ${obj.url}`
          }
          obj.description = he.decode(obj.description)

          const fm = firstMatch(obj.tags)
          if (fm) { obj.category = fm }

          console.log(new Date(), 'hi', obj.id)

          allDones.push(x.id)
          fs.writeFileSync('magic-log.json', JSON.stringify(allDones))

          const opts = {
            url: obj.jpg,
            title: obj.title,
            category: obj.category,
            description: obj.description
          }
          ver.byUrl(opts)
        })
    }

    flickr.fetchBatch()
      .then((photos) => {
        photos = _.shuffle(photos)
        const imp = () => {
          const i = photos.pop()
          if (!i) {
            console.log('all done')
            if (did) {
              return loop(delay)
            } else {
              return
            }
          }
          hi(i)
          setTimeout(imp, delay + (Math.random() * (3 * delay)))
        }
        imp()
      })
  }

  loop(tim)
}

const verra = new Verra()

const getRandomImage = () => delay(Math.random(1000 * 5) + 1000)
  .then(() => got.head('https://file.army/?random'))
  .then((x) => path.basename(x.url))

const licheuxImp = (ver) => getRandomImage()
  .then((id) => {
    // console.log('ahum', id, ver.token, ver.sessionCookie)
    const u = url.parse('https://file.army/json')
    u.query = {
      auth_token: ver.token,
      action: 'like',
      'like[object]': 'image',
      'like[id]': id,
      '_': Date.now()
    }

    return got(u, {
      headers: {
        accept: 'application/json',
        cookie: cookie.serialize('PHPSESSID', ver.sessionCookie),
        'user-agent': ver.agent
      }
    })
  })
  .then((res) => {
    return {
      // headers: res.headers,
      body: res.body
    }
  })
  .then(console.log)
  .catch(console.error)

const licheux = (ver) => setInterval(licheuxImp, 1000 * 60 * 7, ver)

verra.init()
  .then((x) => {
    licheux(x)
    return command(x, process.env.VERRA_WAIT ? (process.env.VERRA_WAIT * 1000) : 600000)
  })
  .catch(console.error)
