import * as cdk from "@aws-cdk/core";
import { RemoteImageAsset, SkopeoImageAsset } from "./skopeo-image-asset";
export class CdkContainersStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new RemoteImageAsset(this, "NodeImage", {
      sourceImageUri: "docker.io/node",
      tag: "16"
    });

    new SkopeoImageAsset(this, "CentosImage", {
      sourceImageUri: "docker.io/centos",
      tag: "7"
    });
  }
}
