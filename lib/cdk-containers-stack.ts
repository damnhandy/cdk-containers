import * as path from "path";
import { Repository, TagStatus } from "@aws-cdk/aws-ecr";
import { TarballImageAsset } from "@aws-cdk/aws-ecr-assets";
import * as cdk from "@aws-cdk/core";
import { Duration, RemovalPolicy } from "@aws-cdk/core";
import { SkopeoImageAsset } from "./skopeo-image-asset";

export class CdkContainersStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const repository = new Repository(this, "ECRRepo", {
      repositoryName: "rhel8/ubi-min",
      imageScanOnPush: true,
      removalPolicy: RemovalPolicy.DESTROY, // this is an ill-advised policy for production apps
      lifecycleRules: [
        {
          description:
            "Limits the number of days that a tagged container image can reside in the repo. " +
            "The default is 120 days",
          maxImageAge: Duration.days(120),
          rulePriority: 100,
          tagStatus: TagStatus.ANY
        },
        {
          description:
            "Limits the number of untagged images that sit in the repo. The default is 20." +
            "Typically, untagged images are not referenced.",
          maxImageCount: 20,
          rulePriority: 50,
          tagStatus: TagStatus.UNTAGGED
        }
      ]
    });

    new TarballImageAsset(this, "UbiMinImage", {
      tarballFile: path.resolve(__dirname, "../ubi-minimal.tar")
    });

    new TarballImageAsset(this, "OldNodeImage", {
      tarballFile: path.resolve(__dirname, "../node-0.10-slim.tar")
    });

    new TarballImageAsset(this, "Node16Image", {
      tarballFile: path.resolve(__dirname, "../node-16.tar")
    });
  }
}
