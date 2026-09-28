# Sets a small interactive shell environment for the demo sandbox.
# Uses the sandbox environment when it is available.

# Restore the sandbox environment for interactive and child Bash shells.
if [ -f /etc/sandbox-persistent.sh ]; then
    . /etc/sandbox-persistent.sh
    export BASH_ENV=/etc/sandbox-persistent.sh
fi

# Docker substitutes this placeholder with the host's stored ChatGPT login.
if [ "${SBX_CRED_OPENAI_MODE:-}" = oauth ]; then
    export OPENAI_CODEX_OAUTH_TOKEN=oai-oat01-proxy-managed
fi

case ":$PATH:" in
    *":$HOME/.local/bin:"*) ;;
    *) export PATH="$HOME/.local/bin:$PATH" ;;
esac
case ":$PATH:" in
    *:/usr/local/share/npm-global/bin:*) ;;
    *) export PATH="/usr/local/share/npm-global/bin:$PATH" ;;
esac

PS1='\u@\h:\W\$ '
HISTTIMEFORMAT='%Y-%m-%d %H:%M:%S '
export HISTTIMEFORMAT
