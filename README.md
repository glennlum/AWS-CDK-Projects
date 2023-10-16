# aws-cdk-projects
AWS Cloud Development Kit Projects

## 1. docker-lambda-cdk
Deploys two Lambda functions using a Docker image. [[source](https://www.fpgmaas.com/blog/aws-cdk-lambdas-docker)].

## 2. hello-cdk
Deploys a lambda function that performs either of three possible actions. [[source](https://www.udemy.com/course/aws-cdk-masterclass-build-aws-cloud-infrastructures/learn/lecture/33199370#overview), section 4]:
- say "Hello CDK!"
- list all buckets
- list all lambdas

## 3. cdk-quotes-api (wip)
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
## 5. cdk-queue-based-load-levelling-api (wip)
**APIGateway -> SQS -> Lambda**
- Implements a Queue-Based Load-Leveling pattern [[source](https://majestic.cloud/integrating-aws-api-gateway-with-sqs/)]. This approach prevents overwhelming downstream systems with excessive requests.
- Design intent: decoupling, fault tolerance, scaling and performance

**Instructions**
- Send requests to the following endpoints with two query string parameters and a message body of your choosing
  - POST /user/{userId}
  - DELETE /user/{userId}
  - PATCH /org/{orgId}
- The request is converted (by VTL template) into a JSON message and enqueued.
- The enqueued message triggers a Lambda function, which logs it.

**Sample request**
```
POST /user/123?param1=value1&param2=value2

{"hello":"world"}
```

**Message enqueued**
```
{
  "httpMethod": "POST",
  "resourcePath": "/user/{userId}",
  "body": {
    "hello": "world"
  },
  "queryStringParameters": {
    "param1": "value1",
    "param2": "value2"
  },
  "pathParameters": {
    "userId": "123"
  }
}
```

**Unresolved Issues**
- It seems that there's an issue with the permissions that prevent the API Gateway from sending messages to the specified SQS queue.
```
Mon Oct 16 16:30:12 UTC 2023 : Endpoint response body before transformations: {"Error":{"Code":"AccessDenied","Message":"Access to the resource https://sqs.eu-west-1.amazonaws.com/318261711672/CdkQueueBasedLoadLevelingApiStack-messagequeue0F03073E-LVJ2DvW9jNHO is denied.","Type":"Sender"},"RequestId":"8323777d-09ff-5d33-9534-2ada6eab6c10"}
```
**TODOs**
- The code snippet defines the request parameters and the successful response model, but doesn't provide explicit error handling or define error responses. For more precise control over error responses, you might consider defining additional methodResponses entries for various 4xx and 5xx status codes, and mapping them to appropriate error response models and integration response templates.