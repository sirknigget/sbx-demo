# Load Docker's runtime environment, then restore command paths in Bash.
if [ -f /etc/sandbox-persistent.sh ]; then
    . /etc/sandbox-persistent.sh
fi
. "$HOME/.config/sbx-demo/shell-path.sh"
export BASH_ENV="$HOME/.config/sbx-demo/shell-env.sh"
if [ "${SBX_CRED_OPENAI_MODE:-none}" = oauth ]; then
    export OPENAI_CODEX_OAUTH_TOKEN=oai-oat01-proxy-managed
fi
case "${SBX_CRED_ANTHROPIC_MODE:-none}" in
    oauth) export ANTHROPIC_OAUTH_TOKEN=sk-ant-oat01-proxy-managed ;;
    apikey) export ANTHROPIC_API_KEY=proxy-managed ;;
esac
