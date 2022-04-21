import * as core from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import ec2 = require('@aws-cdk/aws-ec2');


export class EksClusterV1Stack extends core.Stack {
    constructor(scope: core.Construct, id: string, props?: core.StackProps) {
        super(scope, id, props);
        //const myVpc = ec2.Vpc.fromLookup(this, 'ImportVPC', {isDefault: false, vpcId: 'vpc-0e7fc4992a33f36e5'});
        const vpc = new ec2.Vpc(this, 'fluxcluster1');

        const cluster = new eks.Cluster(this, 'Flux-Cluster-1', {
            version: eks.KubernetesVersion.V1_21,
            defaultCapacity: 0,
            vpc: vpc,
            vpcSubnets: [{subnetType: ec2.SubnetType.PRIVATE}]
        });

        cluster.addNodegroupCapacity('Flux-Cluster-1-node-group', {
            instanceTypes: [new ec2.InstanceType('m5.2xlarge')],
            minSize: 1,
            diskSize: 100,
            amiType: eks.NodegroupAmiType.AL2_X86_64,
            maxSize: 1
        });

    }
}
