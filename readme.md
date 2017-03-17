# verra
[![Build Status](https://travis-ci.org/millette/verra.svg?branch=master)](https://travis-ci.org/millette/verra)
[![Coverage Status](https://coveralls.io/repos/github/millette/verra/badge.svg?branch=master)](https://coveralls.io/github/millette/verra?branch=master)
[![Dependency Status](https://gemnasium.com/badges/github.com/millette/verra.svg)](https://gemnasium.com/github.com/millette/verra)
> File.army client.

## Requirements
You need three things:

* node 6 or above
* a [bitcoinwallet][] account
* a [file.army][] account

### Node 6
I recommend [n-install][] to install and manage current node versions.

```
curl -L https://git.io/n-install | bash
```

This will also install ```npm```, the default node package manager.

### file.army
[file.army][] is of course the site that pays you (in bitcoins) to share interesting images.

You will find the author's account at <https://file.army/robinmillette>,
you're encouraged to follow him :-)

### bitcoinwallet
[bitcoinwallet][] is required by [file.army][] to get paid (in bitcoins).
The provided link uses my account as a reference.

## Install
```
$ npm install --global verra
```

### Help
```
$ verra --help

  File.army client.

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
```

## Now with update-notifier
The cli now uses [update-notifier][] to let the user know about updates to this program.

Users have the ability to opt-out of the update notifier by changing
the optOut property to true in ~/.config/configstore/update-notifier-verra.json.
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

### Env file
Create a ```.env``` file with the following content:

```
FILEARMY_TOKEN=[Your current PHPSESSID]
```

You can also provide a default category if that's your thing:
```
FILEARMY_TOKEN=[Your current PHPSESSID]
CATEGORY=[Default category key]
```

## License
AGPL-v3 © [Robin Millette][]

[Robin Millette]: <http://robin.millette.info>
[update-notifier]: <https://github.com/yeoman/update-notifier>
[bitcoinwallet]: <https://bitcoinwallet.com/?uo=milette>
[file.army]: <https://file.army/>
[n-install]: <https://github.com/mklement0/n-install>
