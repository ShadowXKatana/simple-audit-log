FROM confluentinc/cp-kafka-connect:7.7.1

# Install Confluent Hub connector plugins at build time so they are baked
# into the image and don't need to be downloaded on every container start.
RUN confluent-hub install --no-prompt confluentinc/kafka-connect-elasticsearch:latest \
 && confluent-hub install --no-prompt confluentinc/kafka-connect-s3:latest
