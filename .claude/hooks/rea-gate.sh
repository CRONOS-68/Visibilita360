#!/usr/bin/env bash
# Gate per REA (Reverse Engineer Anything): skill, MCP e CLI si possono usare
# solo se l'ULTIMO messaggio dell'utente li richiama espressamente, es.
# "usa rea per capire come funziona questo sito".
#
#   rea-gate.sh prompt  -> evento UserPromptSubmit: registra se REA e' stato richiamato
#   rea-gate.sh guard   -> evento PreToolUse: blocca le chiamate a REA se non richiamato
set -u

mode="${1:-}"
input="$(cat)"
dir="${CLAUDE_PROJECT_DIR:-.}/.claude/.rea-gate"
sid="$(jq -r '.session_id // "default"' <<<"$input" | tr -c 'A-Za-z0-9_-' '_')"
flag="$dir/$sid"

case "$mode" in
  prompt)
    prompt="$(jq -r '.prompt // ""' <<<"$input")"
    mkdir -p "$dir"
    if grep -Eiq '(^|[^[:alnum:]_-])(usa|usare|utilizza|utilizzare|use|using)[[:space:]]+rea([^[:alnum:]_-]|$)' <<<"$prompt"; then
      echo 1 >"$flag"
      msg="L'utente ha richiamato espressamente REA: per questa richiesta puoi usare la skill reverse-engineer-anything e gli strumenti MCP mcp__rea__*."
    else
      echo 0 >"$flag"
      msg="REA non e' stato richiamato espressamente: non usare la skill reverse-engineer-anything, gli strumenti mcp__rea__* ne' la CLI rea per questa richiesta."
    fi
    jq -n --arg m "$msg" '{hookSpecificOutput:{hookEventName:"UserPromptSubmit",additionalContext:$m}}'
    ;;
  guard)
    tool="$(jq -r '.tool_name // ""' <<<"$input")"
    if [ "$tool" = "Bash" ]; then
      # Il filtro "if" del hook non sa valutare i comandi composti: filtriamo qui.
      # Si blocca solo se REA e' in posizione di comando (rea, npx rea-agents, ...).
      cmd="$(jq -r '.tool_input.command // ""' <<<"$input")"
      re='(^|[;&|(`]|npx|bunx|dlx|exec)([[:space:]]+-[[:alnum:]-]+)*[[:space:]]*rea(-agents)?(@[^[:space:]]*)?([[:space:]]|$)'
      grep -Eq "$re" <<<"$cmd" || exit 0
    fi
    if [ "$tool" = "Skill" ]; then
      skill="$(jq -r '.tool_input.skill // ""' <<<"$input")"
      case "$skill" in
        reverse-engineer-anything | *:reverse-engineer-anything | rea) ;;
        *) exit 0 ;;
      esac
    fi
    [ "$(cat "$flag" 2>/dev/null)" = "1" ] && exit 0
    jq -n '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:"REA e'"'"' bloccato: si usa solo se richiamato espressamente nel messaggio dell'"'"'utente. Chiedi all'"'"'utente di scrivere, ad esempio: \"usa rea per capire come funziona questo sito\"."}}'
    ;;
esac
exit 0
