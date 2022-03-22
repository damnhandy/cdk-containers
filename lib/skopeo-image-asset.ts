import * as fs from "fs";
import * as path from "path";
import * as ecr from "@aws-cdk/aws-ecr";
import { IRepository } from "@aws-cdk/aws-ecr";
import { AssetStaging, IAsset, Stack, Stage } from "@aws-cdk/core";

// keep this import separate from other imports to reduce chance for merge conflicts with v2-main
// eslint-disable-next-line no-duplicate-imports, import/order
import { Construct as CoreConstruct } from "@aws-cdk/core";

/**
 * Options for SkopeoImageAsset
 */
export interface SkopeoImageAssetProps {
  /**
   * Absolute path to the tarball.
   *
   * It is recommended to to use the script running directory (e.g. `__dirname`
   * in Node.js projects or dirname of `__file__` in Python) if your tarball
   * is located as a resource inside your project.
   */
  readonly tarballFile: string;

  readonly repository: IRepository;
}

/**
 * An asset that represents a Docker image.
 *
 * The image will loaded from an existing tarball and uploaded to an ECR repository.
 */
export class SkopeoImageAsset extends CoreConstruct implements IAsset {
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
   * A hash of the source of this asset, which is available at construction time. As this is a plain
   * string, it can be used in construct IDs in order to enforce creation of a new resource when
   * the content hash has changed.
   * @deprecated use assetHash
   */
  public readonly sourceHash: string;

  /**
   * A hash of this asset, which is available at construction time. As this is a plain string, it
   * can be used in construct IDs in order to enforce creation of a new resource when the content
   * hash has changed.
   */
  public readonly assetHash: string;

  constructor(scope: CoreConstruct, id: string, props: SkopeoImageAssetProps) {
    super(scope, id);
    this.node.addDependency(props.repository);
    if (!fs.existsSync(props.tarballFile)) {
      throw new Error(`Cannot find file at ${props.tarballFile}`);
    }

    const stagedTarball = new AssetStaging(this, "Staging", { sourcePath: props.tarballFile });

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
    this.repository = props.repository;
    this.imageUri = location.imageUri;
  }
}
