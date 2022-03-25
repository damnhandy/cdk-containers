import * as fs from "fs";
import * as path from "path";
import * as ecr from "@aws-cdk/aws-ecr";
import { IRepository } from "@aws-cdk/aws-ecr";
import { AssetStaging, IAsset, ISynthesisSession, Stack, Stage } from "@aws-cdk/core";

// keep this import separate from other imports to reduce chance for merge conflicts with v2-main
// eslint-disable-next-line no-duplicate-imports, import/order
import { Construct as CoreConstruct } from "@aws-cdk/core";

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
export class SkopeoImageAsset extends CoreConstruct implements IAsset {
  public sourceImageUri: string;

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

  constructor(scope: CoreConstruct, id: string, props: SkopeoImageAssetProps) {
    super(scope, id);
    this.sourceImageUri = props.sourceImageUri;
    if (!fs.existsSync(this.tarBallLocation)) {
      console.log("");
    }

    if (!fs.existsSync(this.tarBallLocation)) {
      throw new Error(`Cannot find file at ${this.tarBallLocation}`);
    }

    const stagedTarball = new AssetStaging(this, "Staging", {
      sourcePath: this.tarBallLocation
    });

    this.assetHash = stagedTarball.assetHash;

    const stage = Stage.of(this);
    const relativePathInOutDir = stage
      ? path.relative(stage.assetOutdir, stagedTarball.absoluteStagedPath)
      : stagedTarball.absoluteStagedPath;

    const stack = Stack.of(this);
    const synthesizer = stack.synthesizer;
    const location = synthesizer.addDockerImageAsset({
      sourceHash: stagedTarball.assetHash,
      executable: ["sh", "-c", `docker load -i ${relativePathInOutDir} | sed "s/Loaded image: //g"`]
    });
    this.imageUri = location.imageUri;
  }

  protected onSynthesize(session: ISynthesisSession) {
    super.onSynthesize(session);
    console.log("docker pull the_image");
  }

  get sourceImageName(): string {
    const uri = new URL(`docker://${this.sourceImageUri}`);
    return uri.pathname;
  }

  get tarBallLocation(): string {
    return `./.cdk.staging/${this.sourceImageName}.tar`;
  }
}
