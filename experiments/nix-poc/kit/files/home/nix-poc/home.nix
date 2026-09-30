{ pkgs, variant, ... }:
{
  home.username = "agent";
  home.homeDirectory = "/home/agent";
  home.stateVersion = "26.05";
  home.packages = with pkgs; [ jq ripgrep hello ];
  home.sessionVariables.NIX_POC_VARIANT = variant;
  programs.home-manager.enable = true;
  # Avoid taking over the Docker template's shell startup files.
  programs.git = {
    enable = true;
    settings = {
      init.defaultBranch = "main";
      core.editor = "vi";
      alias.poc = if variant == "v1" then "status --short" else "status --branch --short";
    };
  };
  xdg.configFile."nix-poc/settings.json".text = builtins.toJSON {
    schema = 1;
    inherit variant;
    editor = "vi";
    telemetry = false;
  };
}
