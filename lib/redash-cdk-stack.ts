import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as iam from "@aws-cdk/aws-iam";
import * as elbv2 from "@aws-cdk/aws-elasticloadbalancingv2";
import * as targets from "@aws-cdk/aws-elasticloadbalancingv2-targets";

export class RedashCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "redash-vpc", {
      cidr: "10.100.0.0/16",
      enableDnsHostnames: true,
      enableDnsSupport: true,
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: "private",
          subnetType: ec2.SubnetType.PRIVATE,
          cidrMask: 24,
        },
      ],
    });

    const role = new iam.Role(this, "redash-instance-role", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore"
        ),
      ],
    });

    const albSg = new ec2.SecurityGroup(this, "redash-alb-sg", {
      vpc: vpc,
      allowAllOutbound: true,
    });

    const instanceSg = new ec2.SecurityGroup(this, "redash-instance-sg", {
      vpc: vpc,
      allowAllOutbound: true,
    });
    instanceSg.addIngressRule(albSg, ec2.Port.tcp(80));

    const instance = new ec2.Instance(this, "redash", {
      vpc,
      instanceType: new ec2.InstanceType("t2.small"),
      machineImage: ec2.MachineImage.genericLinux({
        "us-east-1": "ami-0d915a031cabac0e0",
        "us-east-2": "ami-0b97435028ca44fcc",
        "us-west-1": "ami-068d0753a46192935",
        "us-west-2": "ami-0c457f229774da543",
        "eu-west-1": "ami-046c6a0123bf94619",
        "eu-west-2": "ami-0dbe8ba0cd21ea12b",
        "eu-west-3": "ami-041bf9180061ce7ea",
        "eu-central-1": "ami-0f8184e6f30cc0c33",
        "eu-north-1": "ami-08dd1b893371bcaac",
        "ap-south-1": "ami-0ff23052091536db2",
        "ap-southeast-1": "ami-0527e82bae7c51958",
        "ap-southeast-2": "ami-0bae8773e653a32ec",
        "ap-northeast-1": "ami-060741a96307668be",
        "ap-northeast-2": "ami-0d991ac4f545a6b34",
        "sa-east-1": "ami-076f350d5a5ec448d",
        "ca-central-1": "ami-0071deaa12b66d1bf",
      }),
      role,
      blockDevices: [
        {
          deviceName: "/dev/sda1",
          volume: ec2.BlockDeviceVolume.ebs(30),
        },
      ],
      securityGroup: instanceSg,
    });

    const alb = new elbv2.ApplicationLoadBalancer(this, "redash-alb", {
      vpc,
      internetFacing: true,
      securityGroup: albSg,
    });

    const listener = alb.addListener("redash-alb-listener", {
      port: 80,
    });

    listener.addTargets("redash-alb-target", {
      port: 80,
      targets: [new targets.InstanceTarget(instance)],
      healthCheck: {
        path: "/status.json",
      },
    });
  }
}
