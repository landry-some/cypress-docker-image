// creates new folder base/<version tag> with Dockerfile and README file
const path = require('path')
const fs = require('fs')
const shelljs = require('shelljs')
const {isStrictSemver} = require('./utils')

const versionTag = process.argv[2]

if (!versionTag || !isStrictSemver(versionTag)) {
  console.error('expected version tag argument like "13.6.0"')
  process.exit(1)
}

const outputFolder = path.join('base', versionTag)
if (shelljs.test('-d', outputFolder)) {
  console.log('removing existing folder "%s"', outputFolder)
  shelljs.rm('-rf', outputFolder)
}
console.log('creating "%s"', outputFolder)
shelljs.mkdir(outputFolder)

const Dockerfile = `
# WARNING: this file was autogenerated by ${path.basename(__filename)}
# contains all dependencies for running Cypress.io Test Runner
# https://on.cypress.io/docker and https://on.cypress.io/ci
#
# build it with command
#   docker build -t cypress/base:${versionTag} .
#
FROM node:${versionTag}-buster

RUN apt-get update && \\
  apt-get install --no-install-recommends -y \\
  libgtk2.0-0 \\
  libgtk-3-0 \\
  libnotify-dev \\
  libgconf-2-4 \\
  libgbm-dev \\
  libnss3 \\
  libxss1 \\
  libasound2 \\
  libxtst6 \\
  xauth \\
  xvfb \\
  # install emoji font
  fonts-noto-color-emoji \\
  # install Chinese fonts
  # this list was copied from https://github.com/jim3ma/docker-leanote
  fonts-arphic-bkai00mp \\
  fonts-arphic-bsmi00lp \\
  fonts-arphic-gbsn00lp \\
  fonts-arphic-gkai00mp \\
  fonts-arphic-ukai \\
  fonts-arphic-uming \\
  ttf-wqy-zenhei \\
  ttf-wqy-microhei \\
  xfonts-wqy \\
  # clean up
  && rm -rf /var/lib/apt/lists/*

RUN npm --version

RUN npm install -g yarn@latest --force
RUN yarn --version

# a few environment variables to make NPM installs easier
# good colors for most applications
ENV TERM xterm
# avoid million NPM install messages
ENV npm_config_loglevel warn
# allow installing when the main user is root
ENV npm_config_unsafe_perm true

# Node libraries
RUN node -p process.versions

# versions of local tools
RUN echo  " node version:    $(node -v) \\n" \\
  "npm version:     $(npm -v) \\n" \\
  "yarn version:    $(yarn -v) \\n" \\
  "debian version:  $(cat /etc/debian_version) \\n" \\
  "user:            $(whoami) \\n"
`
const dockerFilename = path.join(outputFolder, 'Dockerfile')
fs.writeFileSync(dockerFilename, Dockerfile.trim() + '\n', 'utf8')
console.log('Saved %s', dockerFilename)

const README = `
<!-- WARNING: this file was autogenerated by ${path.basename(__filename)} -->
# cypress/base:${versionTag}

A Docker image with all dependencies pre-installed.
Just add your NPM packages (including Cypress) and run the tests.
See [Cypress Docker docs](https://on.cypress.io/docker) and
[Cypress CI guide](https://on.cypress.io/ci).

## Example

Sample Dockerfile

\`\`\`
FROM cypress/base:${versionTag}
RUN npm install --save-dev cypress
RUN $(npm bin)/cypress verify
RUN $(npm bin)/cypress run
\`\`\`
`

const readmeFilename = path.join(outputFolder, 'README.md')
fs.writeFileSync(readmeFilename, README.trim() + '\n', 'utf8')
console.log('Saved %s', readmeFilename)

// to make building images simpler and to follow the same pattern as previous builds
const buildScript = `
# WARNING: this file was autogenerated by ${path.basename(__filename)}
set e+x

# build image with Cypress dependencies
LOCAL_NAME=cypress/base:${versionTag}

echo "Building $LOCAL_NAME"
docker build -t $LOCAL_NAME .
`

const buildFilename = path.join(outputFolder, 'build.sh')
fs.writeFileSync(buildFilename, buildScript.trim() + '\n', 'utf8')
shelljs.chmod('a+x', buildFilename)
console.log('Saved %s', buildFilename)

console.log(`
Please add the newly generated folder ${outputFolder} to Git and update CircleCI file with

    npm run build

Build the Docker container locally to make sure it is correct and update "base/README.md" list
of images with the new image information.
`)
