import * as cdk from "@aws-cdk/core";
import { SkopeoImageAsset } from "./skopeo-image-asset";
export class CdkContainersStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new SkopeoImageAsset(this, "NodeImage", {
      sourceImageUri: "docker.io/node",
      tag: "16"
    });

    new SkopeoImageAsset(this, "CentosImage", {
      sourceImageUri: "docker.io/centos",
      tag: "7"
    });
  }
}
