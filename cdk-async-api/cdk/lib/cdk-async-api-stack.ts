import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { aws_lambda as lambda } from "aws-cdk-lib";
import * as path from "path";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as ApiGW from "aws-cdk-lib/aws-apigateway";
import { Architecture } from "aws-cdk-lib/aws-lambda";
import { CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
import { RestApi } from "aws-cdk-lib/aws-apigateway";

export class CdkAsyncApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // integration role
    const integrationRole = new iam.Role(this, "integration-role", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
    });

    // queue
    const queue = new sqs.Queue(this, "queue", {
      encryption: sqs.QueueEncryption.KMS_MANAGED,
    });

    // grant sqs:SendMessage* to api gw role
    queue.grantSendMessages(integrationRole);

    // api gw direct integration
    const sendMessageIntegration = new ApiGW.AwsIntegration({
      service: "sqs",
      path: `${process.env.CDK_DEFAULT_ACCOUNT}/${queue.queueName}`,
      integrationHttpMethod: "POST",
      options: {
        credentialsRole: integrationRole,
        requestParameters: {
          "integration.request.header.Content-Type": `'application/x-www-form-urlencoded'`,
        },
        requestTemplates: {
          "application/json": "Action=SendMessage&MessageBody=$input.body",
        },
        integrationResponses: [
          {
            statusCode: "200",
          },
          {
            statusCode: "400",
          },
          {
            statusCode: "500",
          },
        ],
      },
    });

    // rest api
    const api = new RestApi(this, "async-api", {
      description: "ASYNC API",
    });

    //.../enqueue
    const enqueuePath = api.root.addResource("enqueue");

    //POST.../enqueue
    enqueuePath.addMethod("POST", sendMessageIntegration, {
      methodResponses: [
        {
          statusCode: "400",
        },
        {
          statusCode: "200",
        },
        {
          statusCode: "500",
        },
      ],
    });

    // lambda role
    const lambdaRole = new iam.Role(this, "QueueConsumerFunctionRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaSQSQueueExecutionRole"
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    // lambda
    const lambdaFunction = new lambda.DockerImageFunction(
      this,
      "asyncHandler",
      {
        code: lambda.DockerImageCode.fromImageAsset(
          path.join(__dirname, "../../python"),
          {
            cmd: ["lambdas.app.main"],
          }
        ),
        architecture: Architecture.ARM_64,
        memorySize: 512,
        timeout: Duration.seconds(3),
        role: lambdaRole,
      }
    );

    // event source mapping
    const eventSourceMapping = new lambda.EventSourceMapping(
      this,
      "QueueConsumerFunctionMySQSEvent",
      {
        target: lambdaFunction,
        batchSize: 1,
        eventSourceArn: queue.queueArn,
      }
    );

    new CfnOutput(this, "QueueConsumerFunctionName", {
      value: lambdaFunction.functionName,
      description: "QueueConsumerFunction function name",
    });

    new CfnOutput(this, "SQSqueueName", {
      value: queue.queueName,
      description: "SQS queue name",
    });

    new CfnOutput(this, "SQSqueueARN", {
      value: queue.queueArn,
      description: "SQS queue ARN",
    });

    new CfnOutput(this, "SQSqueueURL", {
      value: queue.queueUrl,
      description: "SQS queue URL",
    });
  }
}
