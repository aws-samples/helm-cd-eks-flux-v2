#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { EksClusterV1Stack } from '../lib/eks-cluster-v1-stack';

const app = new cdk.App();

new EksClusterV1Stack(app, 'FluxCDClusterStack1', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
    }})

