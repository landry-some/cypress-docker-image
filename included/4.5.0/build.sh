# WARNING: this file was autogenerated by generate-included-image.js
# using
#   npm run add:included -- 4.5.0 cypress/browsers:node12.13.0-chrome80-ff74
set e+x

LOCAL_NAME=cypress/included:4.5.0
echo "Building $LOCAL_NAME"
docker build -t $LOCAL_NAME .
