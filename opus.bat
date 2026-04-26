@echo off
setlocal EnableExtensions

if "%AGENTROUTER_TOKEN%"=="" set "AGENTROUTER_TOKEN=sk-00BkNnTdIE6rzv5TgZgHM3H0gC28Pkcr58kjqiYhESEA8E94"

set "MODEL=%~1"
if "%MODEL%"=="" set "MODEL=claude-opus-4-6"
if not "%~1"=="" shift
set "PROMPT=%*"

set "ANTHROPIC_BASE_URL=https://agentrouter.org/"
set "ANTHROPIC_AUTH_TOKEN="
set "ANTHROPIC_API_KEY=%AGENTROUTER_TOKEN%"
set "ANTHROPIC_MODEL=%MODEL%"
set "ANTHROPIC_SMALL_FAST_MODEL=claude-sonnet-4-6"
set "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1"

if "%PROMPT%"=="" (
  echo Launching Claude Code interactive mode on model: %MODEL%
  claude --model "%MODEL%" --dangerously-skip-permissions
) else (
  claude -p --model "%MODEL%" "%PROMPT%"
)

endlocal