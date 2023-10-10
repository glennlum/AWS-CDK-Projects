import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { aws_lambda as lambda } from "aws-cdk-lib";
import * as path from "path";
import { Architecture } from "aws-cdk-lib/aws-lambda";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { TableViewer } from "cdk-dynamo-table-viewer";

export class CdkQuotesApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new Table(this, "quotes-tbl", {
      partitionKey: { name: "id", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const handlerFunction = new lambda.DockerImageFunction(
      this,
      "quotesHandler",
      {
        code: lambda.DockerImageCode.fromImageAsset(
          path.join(__dirname, "../../python"),
          {
            cmd: ["lambdas.app.main"],
          }
        ),
        architecture: Architecture.ARM_64,
        memorySize: 512,
        environment: {
          MY_TABLE: table.tableName,
        },
      }
    );

    // grant permission
    table.grantReadWriteData(handlerFunction);

    const api = new RestApi(this, "quotes-api", {
      description: "Quotes API",
    });

    new TableViewer(this, "tableviewer", {
      title: "quotes Table",
      table: table,
    });

    // Integration
    const handlerIntegration = new LambdaIntegration(handlerFunction);

    //.../quotes
    const mainPath = api.root.addResource("quotes");

    // GET .../quotes
    mainPath.addMethod("GET", handlerIntegration);
    // POST .../quotes
    mainPath.addMethod("POST", handlerIntegration);

    //.../quotes/{id}
    const idPath = mainPath.addResource("{id}");

    // DELETE .../quotes/{id}
    idPath.addMethod("DELETE", handlerIntegration);
    // GET .../quotes/{id}
    idPath.addMethod("GET", handlerIntegration);
    // PUT .../quotes/{id}
    idPath.addMethod("PUT", handlerIntegration);

    new cdk.CfnOutput(this, "function-arn", {
      value: handlerFunction.functionArn,
    });
  }
}
