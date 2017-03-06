/*
File.army client.

Copyright 2016
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

// npm
const got = require('got')
const cookie = require('cookie')

const headers = { cookie: cookie.serialize('PHPSESSID', process.env.FILEARMY_TOKEN) }
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
const getUser = (str) => JSON.parse(chop0(str.match(re4)))

const getCats = (str) => {
  const ret = []
  let x
  while (x = re6.exec(str)) { ret.push({ id: parseInt(x[1], 10), path: x[2], text: x[3] }) }
  return ret
}

const parse = (res) => {
  const body = res.body
  const headers = res.headers
  const authToken = chop(body.match(re1))
  const jsonApi = chop(body.match(re2))
  const maxFilesize = chop2(body.match(re3))
  const imageTypes = chop9(body.match(re5))
  const loggedUser = getUser(body)
  const cats = getCats(body)
  return { headers, authToken, jsonApi, maxFilesize, imageTypes, loggedUser, cats }
}

const newImageUrl = (u, categoryId, token) => {
  const body = new FormData()
  //body.append('source', 'https://farm3.staticflickr.com/2142/1560733044_5aea80c08a_o_d.jpg')
  // body.append('source', 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Poussin,_Nicolas_-_The_Nurture_of_Jupiter_-_Google_Art_Project.jpg')
  body.append('source', u)
  body.append('type', 'url')
  body.append('action', 'upload')
  body.append('privacy', 'public')
  body.append('timestamp', Date.now())
  // body.append('auth_token', 'c25d20eb83c650af49c556ebf87cf5fa9df59e98')
  // body.append('auth_token', '8c554edfce55ea5a3407997bd9dcd0344f01b26c')
  body.append('auth_token', token)

  // body.append('category_id', '26')
  body.append('category_id', new String(categoryId))
  body.append('nsfw', '0')

  // optionnal?
  // body.append('video_path', 'null')
}

// const newImageUpload = () => {}

exports.getToken = () => got('https://file.army/page/contact', { headers }).then(parse)
exports.parse = parse
exports.newImageUrl = newImageUrl
// exports.newImageUpload = newImageUpload
