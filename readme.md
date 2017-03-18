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

Don't worry if you see these warnings:
```
npm WARN optional SKIPPING OPTIONAL DEPENDENCY: fsevents@^1.0.0 (node_modules/verra/node_modules/chokidar/node_modules/fsevents):
npm WARN notsup SKIPPING OPTIONAL DEPENDENCY: Unsupported platform for fsevents@1.1.1: wanted {"os":"darwin","arch":"any"} (current: {"os":"linux","arch":"x64"})
```

## Upgrade
```
$ npm update --global  verra
```

## Help
Before you can use verra, you need to configure your FILEARMY_TOKEN
as specified in the [login section](#login) below.

Alternately, you can also specify the FILEARMY_TOKEN when launching verra:

```
$ FILEARMY_TOKEN=[YOUR-PHPSESSID-HERE] verra
```

Replace [YOUR-PHPSESSID-HERE] with your alphanum key.

```
$ verra

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
    * --type=<type|STRING> (directory init: "categories" or "albums")
    * --incognito (user-agent imposter and stuff)
```

## Watching a directory
One of the most interesting features of **verra** is its ability
to watch a directory for files to upload.

```
$ verra watch A-DIRECTORY-WITH-IMAGES
```

Every file from that directory and subdirectories will be uploaded
to [file.army][] using the filename as the image title,
waiting 5 to 7 minutes between uploads by default.

A default category will be used if provided, but you can also
organize your images in directories according to categories.

```
$ verra init A-DIRECTORY-WITH-IMAGES --type=categories # create subdirectories
$ verra watch A-DIRECTORY-WITH-IMAGES --type=categories # start watching
```

## Login
You must login manually thru the website.

### Bookmarklet
```
javascript:void(function(){alert('FILEARMY_TOKEN='+document.cookie.split(';').filter((z)=>z.split('=')[0].trim()==='PHPSESSID').map((z)=>z.split('=').slice(1).join('='))[0])}())
```

Once logged in, run the bookmarklet to obtain your credentials.

What's a bookmarklet you ask? It's just a browser bookmark but instead
of a link to a page, it holds a bit of javascript. So create a bookmark
(on your toolbar if you can) and simply paste the above line of code
for the bookmark location (or URL).

Basically, we alert (with that annoying infobox) the user and display
the value of the PHPSESSID cookie. In other words:
```
javascript:void(
  function () {
    alert('FILEARMY_TOKEN='+
      document.cookie
        .split(';')
        .filter((z)=>z.split('=')[0].trim()==='PHPSESSID')
        .map((z)=>z.split('=').slice(1).join('='))[0]
    )
  }()
)
```

You could also open a JavaScript console and type:
```
document.cookie
```

... and figure out the PHPSESSID value to use. It's all good.
Eventually, we hope, **verra** will support an improved login feature.

### Env file
Create a ```.env``` file with the following content:

```
FILEARMY_TOKEN=[Your current PHPSESSID]
```

You can also provide a default category if that's your thing,
as well as other settings:
```
FILEARMY_TOKEN=[Your current PHPSESSID]
FILEARMY_CATEGORY=[Default category key]
VERRA_WAIT=[Wait time in seconds]
VERRA_INCOGNITO=Yes|True|1|Anything truthy
```

The entry ```CATEGORY=[Default category key]``` is deprecated
and replaced by FILEARMY_CATEGORY.

## Now with update-notifier
The cli now uses [update-notifier][] to let the user know about updates to this program.

Users have the ability to opt-out of the update notifier by changing
the optOut property to true in ~/.config/configstore/update-notifier-verra.json.
The path is available in notifier.config.path.

Users can also opt-out by setting the environment variable NO_UPDATE_NOTIFIER
with any value or by using the --no-update-notifier flag on a per run basis.

## License
AGPL-v3 © [Robin Millette][]

[Robin Millette]: <http://robin.millette.info>
[update-notifier]: <https://github.com/yeoman/update-notifier>
[bitcoinwallet]: <https://bitcoinwallet.com/?rb=21d8e442-fe14-11e6-9d6c-1866da6cbe53>
[file.army]: <https://file.army/>
[n-install]: <https://github.com/mklement0/n-install>
