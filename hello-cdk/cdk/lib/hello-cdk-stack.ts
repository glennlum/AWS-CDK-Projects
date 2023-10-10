import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { aws_lambda as lambda } from "aws-cdk-lib";
import * as path from "path";
import { Architecture } from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";

export class HelloCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambda_function = new lambda.DockerImageFunction(
      this,
      "hello_cdk_function",
      {
        code: lambda.DockerImageCode.fromImageAsset(
          path.join(__dirname, "../../python"),
          {
            cmd: ["hello_lambda.hello.main"],
            //cmd: ["hello_lambda.list_buckets.main"],
            //cmd: ["hello_lambda.list_lambdas.main"],
          }
        ),
        architecture: Architecture.ARM_64,
        memorySize: 512,
        environment: {
          NAME: "Julia",
          AGE: "23",
        },
      }
    );

    const listBucketPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["s3:*"],
      resources: ["*"],
    });

    const listLambdasPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["lambda:*"],
      resources: ["*"],
    });

    lambda_function.role?.attachInlinePolicy(
      new iam.Policy(this, "list-resources", {
        statements: [listBucketPolicy, listLambdasPolicy],
      })
    );

    new cdk.CfnOutput(this, "function-arn", {
      value: lambda_function.functionArn,
    });
  }
}
