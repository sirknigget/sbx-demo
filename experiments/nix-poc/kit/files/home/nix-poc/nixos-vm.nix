{ pkgs, ... }:
{
  # Example only: deployment must supply real disk and bootloader settings.
  system.stateVersion = "26.05";
  networking.hostName = "nix-dev-vm";
  networking.useDHCP = true;
  time.timeZone = "UTC";
  boot.loader.grub.enable = false;
  fileSystems."/" = { device = "/dev/disk/by-label/nixos"; fsType = "ext4"; };
  environment.systemPackages = with pkgs; [ git jq ripgrep python3 ];
  environment.etc."nix-poc.json".text = builtins.toJSON {
    declarativeSystem = true;
  };
  users.users.agent = {
    isNormalUser = true;
    uid = 1000;
    extraGroups = [ "wheel" ];
  };
  services.openssh.enable = true;
  services.openssh.settings.PasswordAuthentication = false;
  services.openssh.settings.PermitRootLogin = "no";
  # No password or authorized key: add identity at deployment, not in a public lock.
  nix.settings.experimental-features = [ "nix-command" "flakes" ];
}
