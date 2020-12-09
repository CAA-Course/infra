import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as rds from '@aws-cdk/aws-rds';
import * as ecs from '@aws-cdk/aws-ecs';
import { Secret } from '@aws-cdk/aws-secretsmanager';
import * as ecsPatterns from '@aws-cdk/aws-ecs-patterns';

export class Lab6Stack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const oauthUrl = new cdk.CfnParameter(this, 'OAuth-URL-Param', {
      description:
        'Format https://cognito-idp.eu-west-1.amazonaws.com/<user_pool_id>',
    });

    cdk.Tags.of(this).add('project', 'caacourse');

    const vpc = new ec2.Vpc(this, 'VPC');

    const albSg = new ec2.SecurityGroup(this, 'ALB-SG', {
      vpc,
      description: 'Allow http traffic for LB',
    });
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));

    const appSg = new ec2.SecurityGroup(this, 'App-SG', {
      vpc,
      description: 'Allow app traffic',
    });
    appSg.addIngressRule(albSg, ec2.Port.tcp(8080));

    const dbSg = new ec2.SecurityGroup(this, 'DB-SG', {
      vpc,
      description: 'Allow postgres traffic',
    });
    dbSg.addIngressRule(appSg, ec2.Port.tcp(5432));

    const dbSecret = new Secret(this, 'DB-secret', {
      secretName: 'db-secret',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        excludePunctuation: true,
        generateStringKey: 'password',
      },
    });

    const db = new rds.DatabaseInstance(this, 'db', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_12_4,
      }),
      vpc,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      allocatedStorage: 30,
      backupRetention: cdk.Duration.days(0),
      databaseName: 'postgres',
      deleteAutomatedBackups: true,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      securityGroups: [dbSg],
      credentials: rds.Credentials.fromSecret(dbSecret),
    });

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      capacity: {
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.T2,
          ec2.InstanceSize.MICRO
        ),
        desiredCapacity: 1,
      },
    });

    const service = new ecsPatterns.ApplicationLoadBalancedEc2Service(
      this,
      'Service',
      {
        cluster,
        memoryLimitMiB: 512,
        taskImageOptions: {
          image: ecs.ContainerImage.fromRegistry(
            'andreistefanie/caa-course-backend'
          ),
          environment: {
            POSTGRES_HOST: db.dbInstanceEndpointAddress,
            OAUTH_ISSUER_URL: oauthUrl.valueAsString,
          },
          secrets: {
            POSTGRES_PASSWORD: ecs.Secret.fromSecretsManager(
              dbSecret,
              'password'
            ),
          },
          containerPort: 8080,
        },
        desiredCount: 1,
      }
    );
    service.loadBalancer.addSecurityGroup(albSg);
    service.cluster.connections.addSecurityGroup(...[appSg]);

    db.connections.securityGroups[0].addIngressRule(
      service.cluster.connections.securityGroups[0],
      ec2.Port.tcp(5432)
    );
  }
}
