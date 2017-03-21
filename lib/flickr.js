'use strict'

// core
const url = require('url')

// npm
const got = require('got')

const fetchBatch = () => {
  const u = url.parse('https://api.flickr.com/services/rest')
  u.query = {
    // text: '',
    sort: 'interestingness-desc', // relevance
    parse_tags: 1,
    per_page: 200,
    page: 1,
    // license: '7', // // by, by-sa
    license: '7,9,10', // whatever
    media: 'photos',
    dimension_search_mode: 'min',
    // styles: 'depthoffield,pattern,minimalism,blackandwhite',
    min_taken_date: (Date.now() / 1000) - (86400 * 180),
    // max_taken_date: 1489982399,
    height: 640,
    width: 640,
    method: 'flickr.photos.search',
    format: 'json',
    api_key: process.env.FLICKR_TOKEN,
    nojsoncallback: 1
  }

  return got(u, { json: true })
    .then((x) => x.body.photos.photo)
}

const imageInfo = (id) => got(`https://api.flickr.com/services/rest/?method=flickr.photos.getInfo&api_key=${process.env.FLICKR_TOKEN}&photo_id=${id}&format=json&nojsoncallback=1`, { json: true })
  .then((x) => x.body)

module.exports = { fetchBatch, imageInfo }

/*

// core
const url = require('url')

// npm
const got = require('got')
const pThrottle = require('p-throttle')

const q = {
  // text: '',
  sort: 'interestingness-desc', // relevance
  parse_tags: 1,
  per_page: 100,
  page: 1,
  // license: '7', // // by, by-sa
  license: '7,9,10', // whatever
  media: 'photos',
  dimension_search_mode: 'min',
  // styles: 'depthoffield,pattern,minimalism,blackandwhite',
  min_taken_date: (Date.now() / 1000) - (86400 * 21),
  // max_taken_date: 1489982399,
  height: 640,
  width: 640,
  method: 'flickr.photos.search',
  format: 'json',
  api_key: API_KEY,
  nojsoncallback: 1
}

const myGot = (x) => got(x, { json: true })
  .then((y) => {
    // console.error(new Date(), y.url)
    return y.body
  })
  .catch((e) => {
    console.error(e)
    return {
      url: y.url,
      error: e.toString()
    }
  })

const trot = pThrottle(myGot, 1, 2000)
const u = url.parse('https://api.flickr.com/services/rest')
u.query = q

got(u, { json: true })
  .then((x) => {
    console.log('BOD', x.body)
    return x
  })
  .then((x) => x.body.photos.photo)
  .then((photos) => {
    return Promise.all(
      photos
        .slice(0, 4)
        // .map((x) => `https://www.flickr.com/services/oembed?url=https://www.flickr.com/photos/${x.owner}/${x.id}&format=json`)
        .map((x) => `https://api.flickr.com/services/rest/?method=flickr.photos.getInfo&api_key=API_KEY&photo_id=${x.id}&format=json&nojsoncallback=1`)
        // https://www.flickr.com/services/oembed?url=https://www.flickr.com/photos/${x.owner}/${x.id}&format=json`)
        .map(trot)
    )
  })
  .then((x) => JSON.stringify(x, null, '  '))
  .then(console.log)
  .catch(console.error)
//  https://api.flickr.com/services/rest/?method=flickr.photos.getInfo&api_key=API_KEY&photo_id=32921548351&format=json&nojsoncallback=1

*/
