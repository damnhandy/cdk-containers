import * as path from "path";
import { DockerImageAsset } from "@aws-cdk/aws-ecr-assets";
import * as cdk from "@aws-cdk/core";
import { HttpAsset } from "./http-asset";
import { SkopeoImageAsset } from "./skopeo-image-asset";
export class CdkContainersStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // new RemoteImageAsset(this, "NodeImage", {
    //   sourceImageUri: "docker.io/node",
    //   tag: "16"
    // });

    new DockerImageAsset(this, "DockerImage", {
      directory: path.resolve(__dirname, path.join(process.cwd(), "./container"))
    });

    new SkopeoImageAsset(this, "TestImage", {
      sourceImageUri: "registry.access.redhat.com/ubi8/ubi-minimal",
      tag: "8.5"
    });

    new HttpAsset(this, "Packer", {
      artifactUrl: "https://releases.hashicorp.com/packer/1.8.0/packer_1.8.0_darwin_amd64.zip",
      assetHash: "2c0ec4e75f54600e3796feb8f3411f7f576af005fecbd2e3d2c530d1316a4ca6"
    });
  }
}
