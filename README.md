# aws-cdk-projects
AWS Cloud Development Kit Projects

## 1. docker-lambda-cdk
Deploys two Lambda functions using a Docker image. [[source](https://www.fpgmaas.com/blog/aws-cdk-lambdas-docker)].

## 2. hello-cdk
Deploys a lambda function that performs either of three possible actions. [[source](https://www.udemy.com/course/aws-cdk-masterclass-build-aws-cloud-infrastructures/learn/lecture/33199370#overview), section 4]:
- say "Hello CDK!"
- list all buckets
- list all lambdas

## 3. cdk-quotes-api
wip

## 4. cdk-async-api
**APIGateway -> SQS -> Lambda**
- API Gateway routes requests to an SQS queue, triggering a Lambda function for processing in this serverless architecture. [[source](https://betterprogramming.pub/how-to-integrate-api-gateway-and-sqs-with-aws-cdk-14e74e7de5ba)]
- Design intent: asynchronous processing

**Instructions**
- Send a POST request to /enqueue containing a message.
- The message is enqueued in SQS.
- Enqueued message triggers a Lambda function, which logs it.

**Sample request**
```
% curl --location --request POST 'https://dhgjcp7prk.execute-api.eu-west-1.amazonaws.com/prod/enqueue' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "message": "Hello"
  }'

{"SendMessageResponse":{"ResponseMetadata":{"RequestId":"5cbe815f-8db4-5c39-a834-dcfbd53c1f5c"},"SendMessageResult":{"MD5OfMessageAttributes":null,"MD5OfMessageBody":"0046701aed8ee5c7de6c01430556b13e","MD5OfMessageSystemAttributes":null,"MessageId":"59c52602-131d-420c-8701-7d8f275f36ac","SequenceNumber":null}}}
```
## 5. cdk-queue-base-load-levelling-api
**APIGateway -> SQS -> Lambda**
- Implements a Queue-Based Load-Leveling pattern [[source](https://majestic.cloud/integrating-aws-api-gateway-with-sqs/)]. This approach prevents overwhelming downstream systems with excessive requests.
- Design intent: decoupling, fault tolerance, scaling and performance

