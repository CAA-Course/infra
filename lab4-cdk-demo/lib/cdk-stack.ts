import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import { AutoScalingGroup } from '@aws-cdk/aws-autoscaling';

export class CdkStack extends cdk.Stack {
  constructor(
    scope: cdk.Construct,
    id: string,
    props: cdk.StackProps = {
      env: { region: 'eu-west-1', account: process.env.CDK_DEFAULT_ACCOUNT },
    }
  ) {
    super(scope, id, props);

    const albSGId = cdk.Fn.importValue('CF-ALBSG');
    const appSGId = cdk.Fn.importValue('CF-AppSG');

    const rdsEndpoint = new cdk.CfnParameter(this, 'rdsEndpoint', {
      type: 'string',
      description: 'The endpoint of the RDS instance',
    });

    cdk.Tags.of(this).add('project', 'caacourse');

    const vpc = ec2.Vpc.fromLookup(this, 'VPC', { isDefault: true });

    // Create user data for the app instance
    const appUserData = ec2.UserData.forLinux({
      shebang: '#!/bin/bash -ex',
    });
    appUserData.addCommands(
      ...[
        `sudo yum -y update`,
        `sudo amazon-linux-extras enable corretto8`,
        `sudo yum install -y java-1.8.0-amazon-corretto-devel`,
        `sudo yum remove -y java-1.7.0-openjdk`,
        `cd /home/ec2-user`,
        `curl -L -O https://github.com/CAA-Course/app/releases/download/3.0/shop-1.0.jar`,
        `java -Dspring.profiles.active=with-form -DPOSTGRES_HOST=${rdsEndpoint.valueAsString} -DPOSTGRES_PORT=5432 -DPOSTGRES_USER=postgres -DPOSTGRES_PASSWORD=postgres -jar shop-1.0.jar`,
      ]
    );

    const asg = new AutoScalingGroup(this, 'ASG', {
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.genericLinux({
        'eu-west-1': 'ami-0bb3fad3c0286ebd5',
      }),
      userData: appUserData,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      securityGroup: ec2.SecurityGroup.fromSecurityGroupId(
        this,
        'App-SG',
        appSGId
      ),
    });

    const lb = new elbv2.ApplicationLoadBalancer(this, 'LB', {
      vpc,
      internetFacing: true,
      securityGroup: ec2.SecurityGroup.fromSecurityGroupId(
        this,
        'ALB-SG',
        albSGId
      ),
    });

    const listener = lb.addListener('Listener', {
      port: 80,
    });

    listener.addTargets('Target', {
      port: 8080,
      targets: [asg],
    });

    listener.connections.allowDefaultPortFromAnyIpv4('Open to the world');
  }
}
