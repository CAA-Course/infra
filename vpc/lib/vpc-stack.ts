import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class VpcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC', {
      vpcName: 'caa-vpc',
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      natGateways: 0,
      restrictDefaultSecurityGroup: true,
      maxAzs: 3,
    });

    // Configure security groups
    const albSG = new ec2.SecurityGroup(this, 'ALB-SG', {
      vpc,
      securityGroupName: 'alb-sg',
      description: 'Application Load Balancer security group',
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
      securityGroupName: 'app-sg',
      description: 'Application security group',
    });
    appSg.addIngressRule(
      albSG,
      ec2.Port.tcp(80),
      'allow http traffic from ALB'
    );
    appSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'allow SSH traffic'
    );

    const dbSG = new ec2.SecurityGroup(this, 'DB-SG', {
      vpc,
      securityGroupName: 'db-sg',
      description: 'Database security group',
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
