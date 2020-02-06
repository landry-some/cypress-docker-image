// @ts-check
// this script generates CircleCI config file by looking at the "base/*" folders
// for each subfolder it creates a separate job
const globby = require('globby');
const fs = require('fs')
const path = require('path')
const os = require('os')

const preamble = `
# WARNING: this file is automatically generated by ${path.basename(__filename)}
# info on building Docker images on Circle
# https://circleci.com/docs/2.0/building-docker-images/
version: 2.1

commands:
  halt-on-branch:
    description: Halt current CircleCI job if not on master branch
    steps:
      - run:
          name: Halting job if not on master branch
          command: |
            if [[ "$CIRCLE_BRANCH" != "master" ]]; then
              echo "Not master branch, will skip the rest of commands"
              circleci-agent step halt
            else
              echo "On master branch, can continue"
            fi

  halt-if-docker-image-exists:
    description: Halt current CircleCI job if Docker image exists already
    parameters:
      imageName:
        type: string
        description: Docker image name to test
    steps:
      - run:
          name: Check if image << parameters.imageName >> exists
          # using https://github.com/mishguruorg/docker-image-exists
          # to check if Docker hub has the image already
          command: |
            if npx docker-image-exists --quiet --repo << parameters.imageName >>; then
              echo Found image << parameters.imageName >>
              circleci-agent step halt
            else
              echo Did not find Docker image << parameters.imageName >>
            fi

  test-base-image:
    description: Build a test image from base image and test it
    parameters:
      imageName:
        type: string
        description: Cypress base docker image to test
    steps:
      - run:
          name: test image << parameters.imageName >>
          command: |
            docker build -t cypress/test -\\<<EOF
            FROM << parameters.imageName >>
            RUN echo "current user: $(whoami)"
            ENV CI=1
            RUN npm init --yes
            RUN npm install --save-dev cypress
            RUN ./node_modules/.bin/cypress verify
            RUN npx @bahmutov/cly init
            RUN ./node_modules/.bin/cypress run
            EOF

  test-browser-image:
    description: Build a test image from browser image and test it
    parameters:
      imageName:
        type: string
        description: Cypress browser docker image to test
    steps:
      - run:
          name: test image << parameters.imageName >>
          # for now assuming Chrome, in the future can pass browser name as a parameter
          command: |
            docker build -t cypress/test -\\<<EOF
            FROM << parameters.imageName >>
            RUN echo "current user: $(whoami)"
            ENV CI=1
            RUN npm init --yes
            RUN npm install --save-dev cypress
            RUN ./node_modules/.bin/cypress verify
            RUN npx @bahmutov/cly init
            RUN ./node_modules/.bin/cypress run --browser chrome
            EOF

  test-included-image:
    description: Testing Docker image with Cypress pre-installed
    parameters:
      cypressVersion:
        type: string
        description: Cypress version to test
      imageName:
        type: string
        description: Cypress included docker image to test
    steps:
      - run:
          name: New test project and testing
          command: |
            mkdir test
            cd test
            npm init --yes
            # installing Cypress because @bahmutov/cly scaffolding requires it
            # https://github.com/bahmutov/cly/issues/3
            # so we will install it, scaffold the test project and immediately remove node_modules
            npm i -D cypress@<< parameters.cypressVersion >>
            npx @bahmutov/cly init
            rm -rf package-lock.json package.json node_modules

            echo "Testing Electron browser"
            docker run -it -v $PWD:/e2e -w /e2e cypress/included:<< parameters.cypressVersion >>

            echo "Testing Chrome browser"
            docker run -it -v $PWD:/e2e -w /e2e cypress/included:<< parameters.cypressVersion >> --browser chrome
          working_directory: /tmp

  docker-push:
    description: Log in and push a given image to Docker hub
    parameters:
      imageName:
        type: string
        description: Docker image name to push
    steps:
      - run:
          name: Pushing image << parameters.imageName >> to Docker Hub
          command: |
            echo "$DOCKERHUB_PASS" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin
            docker push << parameters.imageName >>

jobs:
  build-base-image:
    machine: true
    parameters:
      dockerName:
        type: string
        description: Image name to build
        default: cypress/base
      dockerTag:
        type: string
        description: Image tag to build like "12.14.0"
    steps:
      - checkout
      - halt-if-docker-image-exists:
          imageName: << parameters.dockerName >>:<< parameters.dockerTag >>
      - run:
          name: building Docker image << parameters.dockerName >>:<< parameters.dockerTag >>
          command: |
            docker build -t << parameters.dockerName >>:<< parameters.dockerTag >> .
          working_directory: base/<< parameters.dockerTag >>

      - test-base-image:
          imageName: << parameters.dockerName >>:<< parameters.dockerTag >>
      - halt-on-branch
      - run: |
          echo 🛑 automatic pushing to Docker hub disabled
          echo until we can verify that we do not overwrite browser images
      # - docker-push:
      #    imageName: << parameters.dockerName >>:<< parameters.dockerTag >>

  build-browser-image:
    machine: true
    parameters:
      dockerName:
        type: string
        description: Image name to build
        default: cypress/browsers
      dockerTag:
        type: string
        description: Image tag to build like "node12.4.0-chrome76"
    steps:
      - checkout
      - halt-if-docker-image-exists:
          imageName: << parameters.dockerName >>:<< parameters.dockerTag >>
      - run:
          name: building Docker image << parameters.dockerName >>:<< parameters.dockerTag >>
          command: |
            docker build -t << parameters.dockerName >>:<< parameters.dockerTag >> .
          working_directory: browsers/<< parameters.dockerTag >>

      - test-browser-image:
          imageName: << parameters.dockerName >>:<< parameters.dockerTag >>
      - halt-on-branch
      - run: |
          echo 🛑 automatic pushing to Docker hub disabled
          echo until we can verify that we do not overwrite browser images
      # - docker-push:
      #    imageName: << parameters.dockerName >>:<< parameters.dockerTag >>

  build-included-image:
    machine: true
    parameters:
      dockerName:
        type: string
        description: Image name to build
        default: cypress/included
      dockerTag:
        type: string
        description: Image tag to build, should match Cypress version, like "3.8.1"
    steps:
      - checkout
      - halt-if-docker-image-exists:
          imageName: << parameters.dockerName >>:<< parameters.dockerTag >>
      - run:
          name: building Docker image << parameters.dockerName >>:<< parameters.dockerTag >>
          command: |
            docker build -t << parameters.dockerName >>:<< parameters.dockerTag >> .
          working_directory: included/<< parameters.dockerTag >>

      - test-included-image:
          cypressVersion: << parameters.dockerTag >>
          imageName: << parameters.dockerName >>:<< parameters.dockerTag >>
      - halt-on-branch
      - run: |
          echo 🛑 automatic pushing to Docker hub disabled
          echo until we can verify that we do not overwrite browser images
      # - docker-push:
      #    imageName: << parameters.dockerName >>:<< parameters.dockerTag >>

workflows:
  version: 2
`

const formBaseWorkflow = (baseImages) => {
  const yml = baseImages.map(imageAndTag => {
    // important to have indent
    const job = '      - build-base-image:\n' +
      `          name: "base ${imageAndTag.tag}"\n` +
      `          dockerTag: "${imageAndTag.tag}"\n`
    return job
  })

  // indent is important
  const workflowName = '  build-base-images:\n' +
    '    jobs:\n'

  const text = workflowName + yml.join('')
  return text
}

const formBrowserWorkflow = (browserImages) => {
  // not every browser image can be tested
  // some old images do not have NPX for example
  // so let them be
  const skipImages = ['chrome63-ff57']
  const isSkipped = (tag) => skipImages.includes(tag)
  const isIncluded = (imageAndTag) => !isSkipped(imageAndTag.tag)

  const yml = browserImages.filter(isIncluded).map(imageAndTag => {
    // important to have indent
    const job = '      - build-browser-image:\n' +
      `          name: "browsers ${imageAndTag.tag}"\n` +
      `          dockerTag: "${imageAndTag.tag}"\n`
    return job
  })

  // indent is important
  const workflowName = '  build-browser-images:\n' +
    '    jobs:\n'

  const text = workflowName + yml.join('')
  return text
}

const formIncludedWorkflow = (images) => {
  const yml = images.map(imageAndTag => {
    // important to have indent
    const job = '      - build-included-image:\n' +
      `          name: "included ${imageAndTag.tag}"\n` +
      `          dockerTag: "${imageAndTag.tag}"\n`
    return job
  })

  // indent is important
  const workflowName = '  build-included-images:\n' +
    '    jobs:\n'

  const text = workflowName + yml.join('')
  return text
}

const writeConfigFile = (baseImages, browserImages, includedImages) => {
  const base = formBaseWorkflow(baseImages)
  const browsers = formBrowserWorkflow(browserImages)
  const included = formIncludedWorkflow(includedImages)

  const text = preamble + base + os.EOL + browsers + os.EOL + included
  fs.writeFileSync('circle.yml', text, 'utf8')
  console.log('generated circle.yml')
}

const splitImageFolderName = (folderName) => {
  const [name, tag] = folderName.split('/')
  return {
    name,
    tag
  }
}

(async () => {
  const basePaths = await globby('base/*', {onlyDirectories: true});
  const base = basePaths.map(splitImageFolderName)
  console.log(' *** base images ***')
  console.log(base)

  const browsersPaths = await globby('browsers/*', {onlyDirectories: true});
  const browsers = browsersPaths.map(splitImageFolderName)
  console.log(' *** browser images ***')
  console.log(browsers)

  const includedPaths = await globby('included/*', {onlyDirectories: true});
  const included = includedPaths.map(splitImageFolderName)
  console.log(' *** included images ***')
  console.log(included)

  writeConfigFile(base, browsers, included)
})();
