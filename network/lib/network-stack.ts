import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';

export class NetworkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'VPC', { isDefault: true });
    const cidrBlocks = cdk.Fn.cidr(
      vpc.vpcCidrBlock,
      vpc.availabilityZones.length,
      '5'
    );
    for (const [i, az] of vpc.availabilityZones.entries()) {
      new ec2.PrivateSubnet(this, `Private-Subnet-${az}`, {
        availabilityZone: vpc.availabilityZones[0],
        vpcId: vpc.vpcId,
        cidrBlock: cidrBlocks[i],
      });
    }

    // Configure security groups
    const albSG = new ec2.SecurityGroup(this, 'ALB-SG', {
      vpc,
      description: 'Application Load Balancer security group',
      allowAllOutbound: false,
    });
    albSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'allow http access from the world'
    );
    albSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'allow https access from the world'
    );

    const appSg = new ec2.SecurityGroup(this, 'App-SG', {
      vpc,
      description: 'Application security group',
      allowAllOutbound: true,
    });
    appSg.addIngressRule(
      albSG,
      ec2.Port.tcp(8080),
      'allow http traffic from ALB'
    );
    appSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'allow SSH traffic'
    );

    const dbSG = new ec2.SecurityGroup(this, 'DB-SG', {
      vpc,
      description: 'Database security group',
      allowAllOutbound: true,
    });
    dbSG.addIngressRule(
      appSg,
      ec2.Port.tcp(5432),
      'allow postgress traffic from the app'
    );

    new cdk.CfnOutput(this, 'VPCOutput', {
      value: vpc.vpcId,
      description: 'The ID of the newly create VPC',
      exportName: 'CF-VPC',
    });

    new cdk.CfnOutput(this, 'ALBSGOutput', {
      value: appSg.securityGroupId,
      description: 'The ID of the load balancer security group',
      exportName: 'CF-ALBSG',
    });

    new cdk.CfnOutput(this, 'AppSGOutput', {
      value: appSg.securityGroupId,
      description: 'The ID of the app security group',
      exportName: 'CF-AppSG',
    });

    new cdk.CfnOutput(this, 'DBSGOutput', {
      value: appSg.securityGroupId,
      description: 'The ID of the DB security group',
      exportName: 'CF-DBSG',
    });
  }
}
