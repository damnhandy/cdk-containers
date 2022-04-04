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

  stagingDir = path.resolve(__dirname, path.join(process.cwd(), "./.cdk.staging"));

  constructor(scope: Construct, id: string, props: SkopeoImageAssetProps) {
    super(scope, id);
    this.sourceImageUri = props.sourceImageUri;
    this.tag = props.tag;

    console.log(this.stagingDir);
    if (!fs.existsSync(this.stagingDir)) {
      fs.mkdirSync(this.stagingDir);
    }

    if (!fs.existsSync(this.tarBallLocation)) {
      fs.writeFileSync(this.tarBallLocation, this.imageDigest);
    }

    const stagedTarball = new AssetStaging(this, "Staging", {
      assetHash: this.imageDigest,
      assetHashType: AssetHashType.CUSTOM,
      sourcePath: this.tarBallLocation
    });

    this.assetHash = stagedTarball.assetHash;

    const stack = Stack.of(this);
    const synthesizer = stack.synthesizer;
    const location = synthesizer.addDockerImageAsset({
      sourceHash: stagedTarball.assetHash,
      executable: [
        "sh",
        "-c",
        `skopeo copy docker://${this.sourceImageUri}:${this.tag} docker-daemon:${this.sourceImageUri}:${this.tag} --override-os=linux 1> /dev/null && echo "${this.sourceImageUri}:${this.tag}"`
      ]
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
    return `${this.stagingDir}/${this.imageDigest.split(":")[1]}.tar`;
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

  /**
   *
   * @param args
   * @param options
   * @returns
   */
  containerRuntimeExec(args: string[], options?: cp.SpawnSyncOptions) {
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

  skopeoRuntimeExec(args: string[], options?: cp.SpawnSyncOptions) {
    const prog = "skopeo";
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
}
