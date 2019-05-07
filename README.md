# Cypress Docker Images

These images provide all of the required dependencies for running Cypress in Docker.

We build three main images, click on the image name to see the available tags and versions.

Image | Default | Description
--- | --- | ---
[cypress/base](base) | `cypress/base:8` | All system dependencies, no browsers.
[cypress/browsers](browsers) | `cypress/browsers:chrome67` | All system dependencies and browser(s).
[cypress/included](included) | `cypress/included:3.2.0` | All system dependencies and the Cypress test runner installed globally.

Of these images, we provide multiple tags for various operating systems and specific browser versions. These allow you to target specific combinations you need.

## Best practice

It is recommended to use a specific image tag, and not rely on the `default` tag. For example, it is better to use `cypress/base:8` than `cypress/base`. Even better it is to use full version of the image, like `cypress/base:8.15.1` - we will never overwrite the existing Docker images to prevent accidental changes.

## DockerHub

All of the images and tags are [published to DockerHub here](https://hub.docker.com/r/cypress).

## Examples

These images have all dependencies necessary to install and run Cypress. Just install your NPM dependencies (including Cypress) and run the tests. We utilize many of these docker images in our own projects, with different CI providers.

[Check out our docs for examples.](https://on.cypress.io/docker)

If you want to use `cypress/included` image, read [Run Cypress with a single Docker command](https://www.cypress.io/blog/2019/05/02/run-cypress-with-a-single-docker-command/)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)
