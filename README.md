[![Build Status](https://travis-ci.org/NetsBlox/Snap2Js.svg?branch=master)](https://travis-ci.org/NetsBlox/Snap2Js)
# Snap2Js
As the name suggests, Snap2Js is a compiler from [Snap!](http://snap.berkeley.edu) to JavaScript.

## Quick Start
Snap2Js requires [NodeJS](https://nodejs.org) LTS (v6). Snap2JS can be installed using `npm` as follows:

```
npm install -g snap2js
```

Next, you can compile your favorite Snap! application by first exporting it to xml then using snap2js to compile it to a js file!

```
snap2js hello-world.xml
node hello-world.js
```
