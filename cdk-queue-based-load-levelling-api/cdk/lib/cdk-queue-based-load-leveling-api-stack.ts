import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { aws_lambda as lambda } from "aws-cdk-lib";
import * as path from "path";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as ApiGW from "aws-cdk-lib/aws-apigateway";
import { Architecture } from "aws-cdk-lib/aws-lambda";
import { CfnOutput, Duration} from "aws-cdk-lib";
import { RestApi } from "aws-cdk-lib/aws-apigateway";

export class CdkQueueBasedLoadLevelingApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the REST API
    const api = new RestApi(this, "queue-based-load-leveling-api", {
      description: "QueueBasedLoadLevelingApi",
    });

    // Create an SQS queue
    const queue = new sqs.Queue(this, "queue", {
      encryption: sqs.QueueEncryption.KMS_MANAGED,
    });

    // Define an integration role
    const integrationRole = new iam.Role(this, "integration-role", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
    });

    // Grant sqs:SendMessage* to integration role
    queue.grantSendMessages(integrationRole);

    // Define the integration request VTL mapping template
    const integrationRequestTemplate = `
    {
      "httpMethod": "$context.httpMethod",
      "resourcePath": "$context.resourcePath",
      "body" : $input.json('$'),
      "query" : {
        #foreach($param in $input.params().querystring.keySet())
          "$param" : "$util.escapeJavaScript($input.params().querystring.get($param))"
          #if($foreach.hasNext),#end
        #end
      },
      "path" : {
        #foreach($param in $input.params().path.keySet())
          "$param" : "$util.escapeJavaScript($input.params().path.get($param))"
          #if($foreach.hasNext),#end
        #end
      }
    }`;

    // Define the integration response VTL mapping template
    const integrationResponseTemplate = `
      #set($inputRoot = $input.path('$'))
      $inputRoot.MessageId`;

    // Define the SQS integration
    const sqsIntegration = new ApiGW.AwsIntegration({
      service: "sqs",
      integrationHttpMethod: "POST",
      path: `${process.env.CDK_DEFAULT_ACCOUNT}/${queue.queueName}`,
      options: {
        credentialsRole: integrationRole,
        requestParameters: {
          "integration.request.header.Content-Type": `'application/x-www-form-urlencoded'`,
        },
        requestTemplates: {
          "application/json": integrationRequestTemplate,
        },
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": integrationResponseTemplate,
            },
          },
        ],
      },
    });

    // Create new resources
    const resource0 = api.root.resourceForPath("resource0/{param3}");
    const resource1 = api.root.resourceForPath("resource1/{param6}");
    const resource2 = api.root.resourceForPath("resource2/{param9}");

    // Add methods to the new resources
    resource0.addMethod("GET", sqsIntegration, {
      requestParameters: {
        "method.request.querystring.param1": true,
        "method.request.querystring.param2": true,
        "method.request.path.param3": true,
      },
    });

    resource1.addMethod("POST", sqsIntegration, {
      requestParameters: {
        "method.request.querystring.param4": true,
        "method.request.querystring.param5": true,
        "method.request.path.param6": true,
      },
    });

    resource2.addMethod("PATCH", sqsIntegration, {
      requestParameters: {
        "method.request.querystring.param7": true,
        "method.request.querystring.param8": true,
        "method.request.path.param9": true,
      },
    });

    // Define a lambda role
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

    // Create a lambda function
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

    // Define an event source mapping
    const eventSourceMapping = new lambda.EventSourceMapping(
      this,
      "QueueConsumerFunctionMySQSEvent",
      {
        target: lambdaFunction,
        batchSize: 1,
        eventSourceArn: queue.queueArn,
      }
    );

    // Cfn Outputs
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
