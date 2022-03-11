import fs = require('fs');
import * as core from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as eks from '@aws-cdk/aws-eks';
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import codebuild = require('@aws-cdk/aws-codebuild');
import codecommit = require('@aws-cdk/aws-codecommit');
import kds = require('@aws-cdk/aws-kinesis');
import lambda = require('@aws-cdk/aws-lambda');
import targets = require('@aws-cdk/aws-events-targets');
//import { OutputFirehoseStream } from './kinesis-firehose-stream';
import kdf = require('@aws-cdk/aws-kinesisfirehose');
// use npm install '@aws-cdk/aws-kinesisfirehose'
//use npm update to update packages
import * as yaml from 'js-yaml';


export class EksjamEksClusterV1Stack extends core.Stack {
    constructor(scope: core.Construct, id: string, props?: core.StackProps) {
        super(scope, id, props);
        //const myVpc = ec2.Vpc.fromLookup(this, 'ImportVPC', {isDefault: false, vpcId: 'vpc-0e7fc4992a33f36e5'});
        const vpc = new ec2.Vpc(this, 'helmcd');

        const cluster = new eks.Cluster(this, 'HelmCD-Cluster', {
            version: eks.KubernetesVersion.V1_21,
            defaultCapacity: 0,
            vpc: vpc,
            vpcSubnets: [{subnetType: ec2.SubnetType.PRIVATE}]
        });

        cluster.addNodegroupCapacity('helmcd-flux-node-group', {
            instanceTypes: [new ec2.InstanceType('m5.2xlarge')],
            minSize: 1,
            diskSize: 100,
            amiType: eks.NodegroupAmiType.AL2_X86_64,
            maxSize: 1
        });

    }
}
