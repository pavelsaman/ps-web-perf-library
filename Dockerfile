FROM node:17-alpine3.12

LABEL author="Pavel Saman"
LABEL maintainer="samanpavel@gmail.com"
LABEL description="Docker image for setting up Elasticsearch and Kibana environment"
LABEL version="1.0"

WORKDIR /setup

RUN yarn global add newman

COPY elasticstack .

RUN export ELASTICURL ELASTICPORT KIBANAURL KIBANAPORT ELASTICUSER ELASTICPASSWORD KIBANAUSER KIBANAPASSWORD
RUN chmod u+x setup

CMD ./setup
