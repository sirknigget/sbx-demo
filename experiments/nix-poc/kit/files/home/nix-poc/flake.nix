{
  description = "Docker Sandbox Nix and Home Manager proof of concept";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    home-manager.url = "github:nix-community/home-manager/release-26.05";
    home-manager.inputs.nixpkgs.follows = "nixpkgs";
  };
  outputs = { nixpkgs, home-manager, ... }:
    let
      systems = [ "aarch64-linux" "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
      mkHome = system: variant: home-manager.lib.homeManagerConfiguration {
        pkgs = nixpkgs.legacyPackages.${system};
        extraSpecialArgs = { inherit variant; };
        modules = [ ./home.nix ];
      };
    in {
      packages = forAllSystems (system: {
        buildIsolationProbe = nixpkgs.legacyPackages.${system}.runCommand "nix-build-isolation-poc" { } ''
          if test -e /tmp/nix-poc-outside-builder; then
            echo "Build can see outer sandbox tmp file" >&2
            exit 1
          fi
          echo isolated > "$out"
        '';
      });
      # Evaluation-only example for a separately booted NixOS VM. This is
      # NOT an activation target for the Ubuntu Docker Sandbox.
      nixosConfigurations.poc = nixpkgs.lib.nixosSystem {
        system = "aarch64-linux";
        modules = [ ./nixos-vm.nix ];
      };
      homeConfigurations = builtins.listToAttrs (builtins.concatMap
        (system: map (variant: {
          name = "agent-${system}-${variant}";
          value = mkHome system variant;
        }) [ "v1" "v2" ]) systems);
      devShells = forAllSystems (system: {
        default = nixpkgs.legacyPackages.${system}.mkShell {
          packages = with nixpkgs.legacyPackages.${system}; [ python3 jq ripgrep ];
          NIX_POC_PROJECT = "locked-development-shell";
        };
      });
    };
}
