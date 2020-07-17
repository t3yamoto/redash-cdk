#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { RedashCdkStack } from "../lib/redash-cdk-stack";

const app = new cdk.App();
new RedashCdkStack(app, "RedashCdkStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
