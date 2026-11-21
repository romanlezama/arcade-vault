#!/usr/bin/env bash
# PostToolUse hook (Write|Edit): formatea con Prettier y pasa ESLint --fix
# sobre el archivo que Claude acaba de crear o editar en Arcade Vault.
# Exit 2 + stderr => Claude recibe los errores de ESLint que quedan.

set -uo pipefail

project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"
file="$(jq -r '.tool_input.file_path // empty')"

[[ -z "$file" || ! -f "$file" ]] && exit 0

# Solo archivos dentro del proyecto
case "$file" in
  "$project_dir"/*) ;;
  *) exit 0 ;;
esac

rel="${file#"$project_dir"/}"
case "$rel" in
  node_modules/* | .next/* | .git/*) exit 0 ;;
esac

cd "$project_dir" || exit 0

# Prettier: respeta .prettierignore e ignora tipos que no conoce
if ! prettier_out="$(npx --no-install prettier --write --ignore-unknown --log-level warn "$rel" 2>&1)"; then
  echo "Prettier falló en $rel:" >&2
  echo "$prettier_out" >&2
  exit 2
fi

# ESLint solo para JS/TS. La regla extra quita todas las líneas en blanco
# (respeta template literals, porque ESLint trabaja sobre el AST).
case "$rel" in
  *.js | *.jsx | *.ts | *.tsx | *.mjs | *.cjs)
    if ! eslint_out="$(npx --no-install eslint --fix --no-warn-ignored \
      --rule 'no-multiple-empty-lines: [error, {max: 0, maxBOF: 0, maxEOF: 0}]' \
      "$rel" 2>&1)"; then
      echo "ESLint encontró problemas en $rel que no pudo arreglar automáticamente:" >&2
      echo "$eslint_out" >&2
      exit 2
    fi
    ;;
esac

exit 0
