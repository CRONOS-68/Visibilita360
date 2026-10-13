#!/usr/bin/env bash
# Test del gate REA: bash .claude/hooks/test-rea-gate.sh
set -u
cd "$(dirname "$0")/../.." || exit 1
export CLAUDE_PROJECT_DIR="$PWD"
gate=.claude/hooks/rea-gate.sh
fail=0

run() { # nome, json, atteso (allow|deny)
  local out
  out="$(printf '%s' "$2" | $gate guard | jq -r '.hookSpecificOutput.permissionDecision // "allow"')"
  out="${out:-allow}"   # nessun output = consentito
  if [ "$out" = "$3" ]; then echo "OK   $1"; else echo "FAIL $1 (atteso $3, ottenuto $out)"; fail=1; fi
}
bash_json() { jq -cn --arg c "$1" '{session_id:"t",tool_name:"Bash",tool_input:{command:$c}}'; }
prompt() { printf '%s' "{\"session_id\":\"t\",\"prompt\":\"$1\"}" | $gate prompt >/dev/null; }

prompt "analizza il mercato"   # REA non richiamato
run "MCP senza trigger"            '{"session_id":"t","tool_name":"mcp__rea__inspect_web_page"}' deny
run "Skill REA senza trigger"      '{"session_id":"t","tool_name":"Skill","tool_input":{"skill":"reverse-engineer-anything"}}' deny
run "Altra skill"                  '{"session_id":"t","tool_name":"Skill","tool_input":{"skill":"marketing:seo-audit"}}' allow
run "npx rea-agents senza trigger" "$(bash_json 'npx -y rea-agents@6.4.0 mcp')" deny
run "rea CLI senza trigger"        "$(bash_json 'rea update')" deny
run "rea dopo &&"                  "$(bash_json 'cd x && rea --help')" deny
run "comando composto estraneo"    "$(bash_json '(echo x | tail -3) && echo y; git status --short | head')" allow
run "npx tsc"                      "$(bash_json 'npx tsc --noEmit')" allow
run "commit che cita REA"          "$(bash_json "git commit -m 'usa rea nei report'")" allow

prompt "Usa REA per analizzare il sito https://esempio.it"   # REA richiamato
run "MCP con trigger"              '{"session_id":"t","tool_name":"mcp__rea__inspect_web_page"}' allow
run "npx rea-agents con trigger"   "$(bash_json 'npx -y rea-agents@6.4.0 mcp')" allow

prompt "il mercato reale e' cambiato"   # "reale" non e' "usa rea"
run "falso trigger 'reale'"        '{"session_id":"t","tool_name":"mcp__rea__inspect_web_page"}' deny

rm -rf "$CLAUDE_PROJECT_DIR/.claude/.rea-gate"
exit $fail
