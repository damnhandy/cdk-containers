with (import <nixpkgs> {});
mkShell {
  buildInputs = [
    nodejs-16_x
    awscli2
    git
  ];
  shellHook = ''
      mkdir -p ./.nix-node/lib
      export NODE_PATH="''${PWD}/.nix-node"
      npm config set prefix="''${PWD}/.nix-node" --userconfig .npmrc
      export PATH="''${NODE_PATH}/bin:''${PATH}"
      npm install npm -g 
      npm install aws-cdk@1.149.0 -g
      
  '';
}