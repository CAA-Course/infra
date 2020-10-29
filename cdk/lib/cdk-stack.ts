import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import { AutoScalingGroup } from '@aws-cdk/aws-autoscaling';

export class CdkStack extends cdk.Stack {
  constructor(
    scope: cdk.Construct,
    id: string,
    props: cdk.StackProps = { env: { region: 'eu-west-1' } }
  ) {
    super(scope, id, props);

    cdk.Tags.of(this).add('project', 'caacourse');

    const vpc = new ec2.Vpc(this, 'VPC');

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
    albSG.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'allow http access to the world'
    );

    const apSG = new ec2.SecurityGroup(this, 'App-SG', {
      vpc,
      description: 'Application security group',
      allowAllOutbound: true,
    });
    apSG.addIngressRule(
      albSG,
      ec2.Port.tcp(8080),
      'allow http traffic from ALB'
    );

    const dbSG = new ec2.SecurityGroup(this, 'DB-SG', {
      vpc,
      description: 'Database security group',
      allowAllOutbound: true,
    });
    dbSG.addIngressRule(
      apSG,
      ec2.Port.tcp(5432),
      'allow postgress traffic from the app'
    );

    // Create the database EC2 instance
    const dbUserData = ec2.UserData.forLinux({
      shebang: '#!/bin/bash -ex',
    });
    dbUserData.addCommands(
      ...[
        `sudo yum -y update`,
        `sudo -i -u postgres psql -c "ALTER USER postgres WITH PASSWORD postgres;"`,
      ]
    );
    const dbInstance = new ec2.Instance(this, 'db-instance', {
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.genericLinux({
        'eu-west-1': 'ami-0f312703e35557754',
      }),
      vpc,
      securityGroup: dbSG,
      vpcSubnets: {
        subnets: vpc.privateSubnets,
      },
      userData: dbUserData,
    });

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
        `java -Dspring.profiles.active=with-form -DPOSTGRES_HOST=${dbInstance.instancePrivateIp} -DPOSTGRES_PORT=5432 -DPOSTGRES_USER=postgres -DPOSTGRES_PASSWORD=postgres -jar shop-1.0.jar`,
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
      securityGroup: apSG,
    });

    const lb = new elbv2.ApplicationLoadBalancer(this, 'LB', {
      vpc,
      internetFacing: true,
      securityGroup: albSG,
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
