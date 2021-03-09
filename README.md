[![Build Status](https://travis-ci.org/NetsBlox/Snap2Js.svg?branch=master)](https://travis-ci.org/NetsBlox/Snap2Js)
[![Test Coverage](https://api.codeclimate.com/v1/badges/10eb358dc112069c5263/test_coverage)](https://codeclimate.com/github/NetsBlox/Snap2Js/test_coverage)
# Snap2Js
As the name suggests, Snap2Js is a compiler from [Snap!](http://snap.berkeley.edu) to JavaScript.

## Quick Start
Snap2Js requires [NodeJS](https://nodejs.org) LTS. Snap2JS can be installed using `npm` as follows:

```
npm install -g snap2js
```

Next, you can compile your favorite Snap! application by first exporting it to xml then using snap2js to compile it to a js file! A "hello world" example project is provided [here](https://github.com/NetsBlox/Snap2Js/blob/master/test/test-cases/projects/hello-world.xml).

```
snap2js hello-world.xml
node hello-world.js
```
