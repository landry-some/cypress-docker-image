# WARNING: this file was autogenerated by generate-base-image.js
set e+x

# build image with Cypress dependencies
LOCAL_NAME=cypress/base:10.16.3

echo "Building $LOCAL_NAME"
docker build -t $LOCAL_NAME .
