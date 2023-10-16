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
    const queue = new sqs.Queue(this, "message-queue", {
      encryption: sqs.QueueEncryption.KMS_MANAGED,
    });

    // Define an integration role
    const integrationRole = new iam.Role(this, "integration-role", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
    });

    // Grant sqs:SendMessage* to integration role

    //Option 1 (Unresolved Error: AccessDenied)
    queue.grantSendMessages(integrationRole);

    //Option 2 (Unresolved Error: AccessDenied)
    // const policy = new iam.PolicyStatement({
    //   actions: ["sqs:SendMessage"],
    //   effect: iam.Effect.ALLOW,
    //   resources: [queue.queueArn],
    // });
    //integrationRole.addToPolicy(policy);

    // Define the integration request VTL mapping template
    const integrationRequestTemplate = `
    {
      "httpMethod": "$context.httpMethod",
      "resourcePath": "$context.resourcePath",
      "body" : $input.json('$'),
      "queryStringParameters" : {
        #foreach($param in $input.params().querystring.keySet())
          "$param" : "$util.escapeJavaScript($input.params().querystring.get($param))"
          #if($foreach.hasNext),#end
        #end
      },
      "pathParameters" : {
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
    const userPath = api.root.resourceForPath("user/{userId}");
    const orgPath = api.root.resourceForPath("org/{orgId}");

    // Add methods to the new resources

    //POST.../user/{userId}
    userPath.addMethod("POST", sqsIntegration, {
      requestParameters: {
        "method.request.path.userId": true,
        "method.request.querystring.param1": true,
        "method.request.querystring.param2": true,
      },
      methodResponses: [
        {
          statusCode: "200",
          responseModels: {
            "application/json": new ApiGW.Model(this, "PostUserResponseModel", {
              restApi: api,
              contentType: "application/json",
              modelName: "PostUserResponseModel",
              schema: {
                schema: ApiGW.JsonSchemaVersion.DRAFT4,
                title: "PostUserResponseModel",
                type: ApiGW.JsonSchemaType.OBJECT,
              },
            }),
          },
        },
      ],
    });

    //DELETE.../user/{userId}
    userPath.addMethod("DELETE", sqsIntegration, {
      requestParameters: {
        "method.request.path.userId": true,
        "method.request.querystring.param1": true,
        "method.request.querystring.param2": true,
      },
      methodResponses: [
        {
          statusCode: "200",
          responseModels: {
            "application/json": new ApiGW.Model(
              this,
              "DeleteUserResponseModel",
              {
                restApi: api,
                contentType: "application/json",
                modelName: "DeleteUserResponseModel",
                schema: {
                  schema: ApiGW.JsonSchemaVersion.DRAFT4,
                  title: "DeleteUserResponseModel",
                  type: ApiGW.JsonSchemaType.OBJECT,
                },
              }
            ),
          },
        },
      ],
    });

    //PATCH.../org/{orgId}
    orgPath.addMethod("PATCH", sqsIntegration, {
      requestParameters: {
        "method.request.path.orgId": true,
        "method.request.querystring.param1": true,
        "method.request.querystring.param2": true,
      },
      methodResponses: [
        {
          statusCode: "200",
          responseModels: {
            "application/json": new ApiGW.Model(this, "PatchOrgResponseModel", {
              restApi: api,
              contentType: "application/json",
              modelName: "PatchOrgResponseModel",
              schema: {
                schema: ApiGW.JsonSchemaVersion.DRAFT4,
                title: "PatchOrgResponseModel",
                type: ApiGW.JsonSchemaType.OBJECT,
              },
            }),
          },
        },
      ],
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
  }
}
