#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { EksjamEksClusterV1Stack } from '../lib/eksjam-eks-cluster-v1-stack';

const app = new cdk.App();
new EksjamEksClusterV1Stack(app, 'HelmCDFluxClusterV1Stack', {});

