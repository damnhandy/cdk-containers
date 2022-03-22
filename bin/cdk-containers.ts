#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { CdkContainersStack } from "../lib/cdk-containers-stack";

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
};

const app = new cdk.App();
new CdkContainersStack(app, "CdkContainersStack", {
  env: env
});
