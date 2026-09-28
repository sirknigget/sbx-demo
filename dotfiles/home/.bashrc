# Sets a small interactive shell environment for the demo sandbox.
# Uses the sandbox environment when it is available.

# Restore the sandbox environment for interactive shells when provided by sbx.
if [ -f /etc/sandbox-persistent.sh ]; then
    . /etc/sandbox-persistent.sh
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
