'use strict'

// core
const url = require('url')

// npm
const got = require('got')

const beginDate = Math.round((Date.now() / 1000) - (86400 * 1.33 * 365))
const endDate = Math.round((Date.now() / 1000))
// const endDate = Math.round((Date.now() / 1000) - (86400 * 0.33 * 365))

const fetchBatch = () => {
  const u = url.parse('https://api.flickr.com/services/rest')
  u.query = {
    // text: '',
    sort: 'interestingness-desc', // relevance
    // sort: 'relevance',
    parse_tags: 1,
    per_page: 150, // 100 - 500
    page: 1,
    // license: '7', // // by, by-sa
    license: '7,9,10', // whatever
    media: 'photos',
    dimension_search_mode: 'min',
    // styles: 'blackandwhite',
    // styles: 'minimalism',
    // styles: 'pattern',
    // styles: 'depthoffield',
    // styles: 'depthoffield,pattern,minimalism,blackandwhite',
    min_taken_date: beginDate,
    max_taken_date: endDate,
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
