# Shell script comment rules

## Comment style

Comments are mandatory for new or changed shell scripts. Do not return shell code that omits the
required file header and function or section comments.

Use this shape for new Bash files:

```bash
#!/usr/bin/env bash

# Copies selected application files to a staging directory.
# Uses the destination that the caller provides.
# Creates missing directories and does not change unrelated files.
# Stops before any file copy when validation fails.

set -euo pipefail


# Writes error messages to standard error.
# Exits with the status argument.
die() {
  local message=$1
  local status=${2:-1}

  printf '%s\n' "${message}" >&2
  exit "${status}"
}


# Copies an optional source file when it exists.
# Returns success when the source file does not exist.
copy_optional_file() {
  local source=$1
  local destination=$2

  if [[ ! -f "${source}" ]]; then
    return 0
  fi

  mkdir -p -- "$(dirname -- "${destination}")"
  cp -- "${source}" "${destination}"
}


# Validates the destination before file creation or replacement.
staging_dir=${1:-}
[[ -n "${staging_dir}" ]] || die 'usage: export-state STAGING_DIR' 2
[[ "${staging_dir}" != / ]] || die 'refusing to export into /'

# Copies only the credential file.
# Leaves caches and logs in the source location.
copy_optional_file "${HOME}/.tool/auth.json" "${staging_dir}/tool/auth.json"
```

Rules:

- Write every comment in Simplified Technical English (ASD-STE100). Use short, direct sentences with
  a clear subject and verb. Use the same word for the same meaning. Do not use jargon, idioms, or
  vague words.
- When a comment directly describes the code below it, omit the obvious subject and start with a
  present-tense verb. Use `it` in a following sentence when the reference is clear.
- New files put the shebang on line 1, followed by a blank line and 2-10 readable `#` lines; shell
  scripts have no portable block comment syntax.
- Add a separate 1-3 line `#` comment above each function and non-trivial implementation section.
  Keep simple intent to one line. Use up to three lines when the comment must explain a complex
  reason or a choice that is not clear from the code.
- File headers do not replace the first function or main-flow section comment.
- Explain behavior that the caller can observe, ownership, data changes, return values, errors,
  required conditions, limits, and choices that need an explanation.
- Do not narrate syntax or repeat names and command text.
- Shell function comments serve the role of construct documentation; verbose generated-doc formats
  are only for surrounding code that already expects them and do not replace these comments.

## Script boundaries

- Do not embed multi-command shell programs in YAML, JSON, TOML, Dockerfiles, or other configuration
  files. Put the program in a dedicated shell file and invoke that file from the configuration.
- Do not embed a program in another script through a heredoc, multiline string, encoded payload, or
  similar mechanism. For example, do not embed Python in a shell script. Put each program in a file
  for its own language and invoke it through a clear interface.
- A single direct command with arguments or a 1-3 liner is not an embedded program and can remain at
  the call site.
- Keep executable behavior in the dedicated script so local use, CI, tests, and documentation can
  call the same implementation.
