# Shared by Bash startup and the sandbox's persistent environment.
case ":${PATH:-}:" in
    *":$HOME/.local/bin:"*) ;;
    *) export PATH="$HOME/.local/bin:${PATH:-}" ;;
esac
case ":$PATH:" in
    *:/usr/local/share/npm-global/bin:*) ;;
    *) export PATH="/usr/local/share/npm-global/bin:$PATH" ;;
esac
