set e+x

LOCAL_NAME=cypress/browsers:node8.2.1-chrome73

echo "Building $LOCAL_NAME"
docker build -t $LOCAL_NAME .
