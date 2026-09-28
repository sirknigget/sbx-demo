# Loads the tracked interactive Bash settings in a login shell.
# Keeps the demo PATH and prompt in one configuration file.

if [ -f "$HOME/.bashrc" ]; then
    . "$HOME/.bashrc"
fi
