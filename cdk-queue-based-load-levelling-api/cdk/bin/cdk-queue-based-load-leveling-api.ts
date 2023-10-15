#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CdkQueueBasedLoadLevelingApiStack } from "../lib/cdk-queue-based-load-leveling-api-stack";

const app = new cdk.App();
new CdkQueueBasedLoadLevelingApiStack(app, "CdkQueueBasedLoadLevelingApiStack", {});
