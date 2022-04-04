import * as cdk from "@aws-cdk/core";
import { RemoteImageAsset } from "./remote-image-asset";
import { SkopeoImageAsset } from "./skopeo-image-asset";
export class CdkContainersStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // new RemoteImageAsset(this, "NodeImage", {
    //   sourceImageUri: "docker.io/node",
    //   tag: "16"
    // });

    new SkopeoImageAsset(this, "TestImage", {
      sourceImageUri: "registry.access.redhat.com/ubi8/ubi-minimal",
      tag: "8.5"
    });
  }
}
