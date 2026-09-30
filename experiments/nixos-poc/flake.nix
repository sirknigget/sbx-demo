{
  description = "NixOS root filesystem and Docker Sandbox compatibility experiment";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/7fc6f2c20af09cdcaf48b92ec3121860139ec668";
  outputs = { nixpkgs, ... }:
    let
      system = "aarch64-linux";
      container = nixpkgs.lib.nixosSystem {
        inherit system;
        modules = [ ./container.nix ];
      };
    in {
      nixosConfigurations.container = container;
      packages.${system} = {
        rootfs = container.config.system.build.tarball;
        tini = nixpkgs.legacyPackages.${system}.tini;
      };
    };
}
