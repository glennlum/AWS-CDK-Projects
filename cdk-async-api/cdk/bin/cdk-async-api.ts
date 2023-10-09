#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CdkAsyncApiStack } from "../lib/cdk-async-api-stack";

const app = new cdk.App();
new CdkAsyncApiStack(app, "CdkAsyncApiStack", {});
