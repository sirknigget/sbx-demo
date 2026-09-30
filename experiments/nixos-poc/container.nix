{ pkgs, modulesPath, ... }:
{
  imports = [ "${modulesPath}/virtualisation/docker-image.nix" ];
  system.stateVersion = "26.05";
  networking.hostName = "nixos-sandbox-poc";
  documentation.enable = false;
  documentation.nixos.enable = false;
  documentation.man.enable = false;
  services.journald.console = "/dev/console";
  users.users.agent = {
    isNormalUser = true;
    uid = 1000;
    group = "agent";
    extraGroups = [ "wheel" ];
    home = "/home/agent";
    createHome = true;
    shell = pkgs.bashInteractive;
  };
  users.groups.agent.gid = 1000;
  security.sudo.wheelNeedsPassword = false;
  security.sudo.extraConfig = ''
    Defaults env_keep += "HTTP_PROXY HTTPS_PROXY NO_PROXY http_proxy https_proxy no_proxy"
  '';
  environment.systemPackages = with pkgs; [ bashInteractive coreutils curl git jq ripgrep procps sudo iproute2 cacert ];
  environment.etc."nixos-poc.json".text = builtins.toJSON {
    configuration = "NixOS Docker image POC";
    managedSystem = true;
  };
  systemd.services.nixos-poc-http = {
    description = "Declarative NixOS POC web service";
    wantedBy = [ "multi-user.target" ];
    serviceConfig = {
      User = "agent";
      ExecStart = "${pkgs.python3}/bin/python3 -m http.server 8080 --bind 0.0.0.0 --directory ${pkgs.writeTextDir "index.html" "NixOS declarative service is running\n"}";
      Restart = "on-failure";
    };
  };
  nix.settings.experimental-features = [ "nix-command" "flakes" ];
}
