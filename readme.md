# verra
[![Build Status](https://travis-ci.org/millette/verra.svg?branch=master)](https://travis-ci.org/millette/verra)
[![Coverage Status](https://coveralls.io/repos/github/millette/verra/badge.svg?branch=master)](https://coveralls.io/github/millette/verra?branch=master)
[![Dependency Status](https://gemnasium.com/badges/github.com/millette/verra.svg)](https://gemnasium.com/github.com/millette/verra)
> File.army client.

## Install
```
$ npm install --save verra
```

## Now with update-notifier
The cli now uses [update-notifier][] to let the user know about updates to this program.

Users have the ability to opt-out of the update notifier by changing
the optOut property to true in ~/.config/configstore/update-notifier-rollodeqc-gh-user-streak.json.
The path is available in notifier.config.path.

Users can also opt-out by setting the environment variable NO_UPDATE_NOTIFIER
with any value or by using the --no-update-notifier flag on a per run basis.

## Login
You must login manually thru the website.

### Bookmarklet
```
javascript:void(function(){$('a').each((x,y)=>{if(y.href.indexOf('logout')!==-1){alert(`auth_token:%20${y.search.split('=').slice(1).join('=')}\nPHPSESSID:%20${document.cookie.split(';').filter((z)=>z.split('=')[0]==='PHPSESSID').map((z)=>z.split('=').slice(1).join('='))[0]}`)}})}())
```

```
javascript:void(function(){alert(document.cookie.split(';').filter((z)=>z.split('=')[0]==='PHPSESSID').map((z)=>z.split('=').slice(1).join('='))[0])}())
```

Once logged in, run the bookmarklet to obtain your credentials.

## Usage
```js
const verra = require('verra')

verra('unicorns')
//=> 'unicorns & rainbows'
```

## API
### verra(input, [options])
#### input
Type: `string`

Lorem ipsum.

#### options
##### foo
Type: `boolean`<br>
Default: `false`

Lorem ipsum.

## CLI
```
$ npm install --global verra
```

```
$ verra --help

  Usage
    verra [input]

  Options
    --foo  Lorem ipsum. [Default: false]

  Examples
    $ verra
    unicorns & rainbows
    $ verra ponies
    ponies & rainbows
```


## License
AGPL-v3 © [Robin Millette](http://robin.millette.info)

[update-notifier]: <https://github.com/yeoman/update-notifier>
