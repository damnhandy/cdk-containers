import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as ecr from "@aws-cdk/aws-ecr";
import {
  AssetHashType,
  AssetStaging,
  Construct,
  DockerImage,
  IAsset,
  ISynthesisSession,
  Stack,
  Stage
} from "@aws-cdk/core";

/**
 * Options for SkopeoImageAsset
 */
export interface RemoteImageAssetProps {
  readonly sourceImageUri: string;
  readonly tag: string;
}

/**
 * An asset that represents a Docker image.
 *
 * The image will loaded from an existing tarball and uploaded to an ECR repository.
 */
export class RemoteImageAsset extends Construct implements IAsset {
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

  stagingDir = path.resolve(__dirname, path.join(process.cwd(), "./.cdk.staging"));

  constructor(scope: Construct, id: string, props: RemoteImageAssetProps) {
    super(scope, id);
    this.sourceImageUri = props.sourceImageUri;
    this.tag = props.tag;

    console.log(this.stagingDir);
    if (!fs.existsSync(this.stagingDir)) {
      fs.mkdirSync(this.stagingDir);
    }
    this.containerRuntimeExec(["pull", `${this.sourceImageUri}:${this.tag}`], {
      stdio: [
        // show Docker output
        "ignore", // ignore stdio
        process.stderr, // redirect stdout to stderr
        "inherit" // inherit stderr
      ]
    });
    this.imageId = cp
      .execSync(`docker inspect --format='{{.Id}}' ${this.sourceImageUri}:${this.tag}`, {
        encoding: "utf8"
      })
      .trim();
    if (!fs.existsSync(this.tarBallLocation)) {
      this.containerRuntimeExec(["save", this.sourceImageUri, "-o", this.tarBallLocation], {
        stdio: [
          // show Docker output
          "ignore", // ignore stdio
          process.stderr, // redirect stdout to stderr
          "inherit" // inherit stderr
        ]
      });
    }

    if (!fs.existsSync(this.tarBallLocation)) {
      throw new Error(`Cannot find file at ${this.tarBallLocation}`);
    }

    const stagedTarball = new AssetStaging(this, "Staging", {
      assetHashType: AssetHashType.CUSTOM,
      bundling: {
        image: DockerImage.fromRegistry("quay.io/skopeo/stable"),
        local: {
          tryBundle(outputDir: string) {
            try {
              cp.spawnSync("command -v skopeo");
            } catch {
              return false;
            }

            containerRuntimeExec(["save", this.sourceImageUri, "-o", this.tarBallLocation], {
              stdio: [
                // show Docker output
                "ignore", // ignore stdio
                process.stderr, // redirect stdout to stderr
                "inherit" // inherit stderr
              ]
            });
            return true;
          }
        }
      },
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
    const paths = uri.pathname.split("/");
    if (paths.length > 0) {
      return paths[paths.length - 1];
    }
    return paths[0];
  }

  get tarBallLocation(): string {
    return `${this.stagingDir}/${this.imageId.split(":")[1]}.tar`;
  }
}

/**
 *
 * @param args
 * @param options
 * @returns
 */
export function containerRuntimeExec(args: string[], options?: cp.SpawnSyncOptions) {
  const prog = process.env.CDK_DOCKER ?? "docker";
  const proc = cp.spawnSync(
    prog,
    args,
    options ?? {
      stdio: [
        // show Docker output
        "ignore", // ignore stdio
        process.stderr, // redirect stdout to stderr
        "inherit" // inherit stderr
      ]
    }
  );

  if (proc.error) {
    throw proc.error;
  }

  if (proc.status !== 0) {
    if (proc.stdout || proc.stderr) {
      throw new Error(
        `[Status ${proc.status}] stdout: ${proc.stdout
          ?.toString()
          .trim()}\n\n\nstderr: ${proc.stderr?.toString().trim()}`
      );
    }
    throw new Error(`${prog} exited with status ${proc.status}`);
  }

  return proc;
}
