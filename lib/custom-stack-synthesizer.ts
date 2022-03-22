import { DockerImageAssetLocation, DockerImageAssetSource } from "@aws-cdk/core";
declare module "@aws-cdk/core/lib/stack-synthesizers/default-synthesizer" {
  interface DefaultStackSynthesizer {
    addDockerImageAsset(asset: DockerImageAssetSource): DockerImageAssetLocation;
  }
}
