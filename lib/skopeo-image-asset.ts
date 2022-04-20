import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as ecr from "@aws-cdk/aws-ecr";
import {
  AssetHashType,
  AssetStaging,
  Construct,
  IAsset,
  ISynthesisSession,
  Stack,
  Stage
} from "@aws-cdk/core";

/**
 * Options for SkopeoImageAsset
 */
export interface SkopeoImageAssetProps {
  readonly sourceImageUri: string;
  readonly tag: string;
}

/**
 * An asset that represents a Docker image.
 *
 * The image will loaded from an existing tarball and uploaded to an ECR repository.
 */
export class SkopeoImageAsset extends Construct implements IAsset {
  public sourceImageUri: string;

  public tag = "latest";
  /**
   * The full URI of the image (including a tag). Use this reference to pull
   * the asset.
   */
  public imageUri: string;

  /**
   * Repository where the image is stored
   */
  public repository: ecr.IRepository;

  /**
   * A hash of this asset, which is available at construction time. As this is a plain string, it
   * can be used in construct IDs in order to enforce creation of a new resource when the content
   * hash has changed.
   */
  public readonly assetHash: string;
  public readonly imageId: string;

  constructor(scope: Construct, id: string, props: SkopeoImageAssetProps) {
    super(scope, id);
    this.sourceImageUri = props.sourceImageUri;
    this.tag = props.tag;

    this.assetHash = this.imageDigest.split(":")[1];

    const location = Stack.of(this).synthesizer.addDockerImageAsset({
      sourceHash: this.assetHash,
      executable: [
        "sh",
        "-c",
        `skopeo copy docker://${this.sourceImageUri}:${this.tag} docker-daemon:${this.sourceImageUri}:${this.tag} --override-os=linux 1> /dev/null && echo "${this.sourceImageUri}:${this.tag}"`
      ]
    });
    this.imageUri = location.imageUri;
  }

  get sourceImageName(): string {
    const uri = new URL(`docker://${this.sourceImageUri}`);
    const paths = uri.pathname.split("/");
    if (paths.length > 0) {
      return paths[paths.length - 1];
    }
    return paths[0];
  }

  get imageDigest(): string {
    return cp
      .execSync(
        `skopeo inspect --format='{{.Digest}}' docker://${this.sourceImageUri}:${this.tag} --override-os=linux`,
        {
          encoding: "utf8"
        }
      )
      .trim();
  }
}
