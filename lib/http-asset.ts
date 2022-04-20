import * as fs from "fs";
import * as path from "path";
import { AssetOptions, Construct, FileAssetPackaging, IAsset, Stack } from "@aws-cdk/core";

export interface HttpAssetProps extends AssetOptions {
  readonly artifactUrl: string;
  readonly assetHash: string;
}

export class HttpAsset extends Construct implements IAsset {
  assetUrl: URL;
  assetHash: string;
  stagingDir = path.resolve(__dirname, path.join(process.cwd(), "./.cdk.staging"));
  constructor(scope: Construct, id: string, props: HttpAssetProps) {
    super(scope, id);
    this.assetUrl = new URL(props.artifactUrl);

    const paths = this.assetUrl.pathname.split("/");
    const fileName = paths[paths.length - 1];

    console.log(this.stagingDir);
    if (!fs.existsSync(this.stagingDir)) {
      fs.mkdirSync(this.stagingDir);
    }

    const stack = Stack.of(this);

    this.assetHash = props.assetHash;

    const location = stack.synthesizer.addFileAsset({
      sourceHash: this.assetHash,
      executable: ["sh", "-c", `curl -L ${props.artifactUrl} -o ${fileName}`]
    });
  }

  get assetLocation(): string {
    const paths = this.assetUrl.pathname.split("/");
    const fileName = paths[paths.length - 1];
    return `${this.stagingDir}/${fileName}`;
  }
}
