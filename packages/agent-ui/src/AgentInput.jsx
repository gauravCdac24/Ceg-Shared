import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { PromptInput, PromptInputActions, PromptInputAction } from './prompt-kit/PromptInput.jsx'

export function AgentInput({
  value,
  onChange,
  onSend,
  onStop,
  disabled = false,
  streaming = false,
  placeholder = 'Message the agent?',
  onToggleListen,
  listening = false,
  speechSupported = false,
  onSpeakLast,
  speaking = false,
  ttsSupported = false,
  inputId = 'ceg-agent-message-input',
  leadingSlot = null,
  extraActions = null,
  capabilityDropdown = null,
  modeDropdown = null,
}) {
  return (
    <footer className="ceg-agent-panel__footer notranslate" data-ceg-input-container="" data-tour="ai-agent-input">
      {leadingSlot ? <div className="ceg-agent-panel__footer-leading">{leadingSlot}</div> : null}
      <PromptInput
        value={value}
        onValueChange={(v) => onChange?.({ target: { value: v } })}
        onSubmit={() => {
          if (streaming) return
          onSend?.()
        }}
        isLoading={streaming}
        disabled={disabled}
        placeholder={placeholder}
        inputId={inputId}
        ariaLabel="Message Cleo, the AI design assistant"
        onStop={streaming ? onStop : undefined}
      >
        <PromptInputActions>
          {capabilityDropdown ? (
            <div className="ceg-agent-panel__capability-dropdown ceg-agent-panel__capability-dropdown--in-input">
              {capabilityDropdown}
            </div>
          ) : null}
          {modeDropdown ? (
            <div className="ceg-agent-panel__mode-dropdown-slot">{modeDropdown}</div>
          ) : null}
          {extraActions}
          {speechSupported ? (
            <PromptInputAction
              tooltip={listening ? 'Stop listening' : 'Voice input'}
              disabled={disabled || streaming}
              onClick={onToggleListen}
            >
              {listening ? <MicOff size={15} /> : <Mic size={15} />}
            </PromptInputAction>
          ) : null}
          {ttsSupported ? (
            <PromptInputAction
              tooltip={speaking ? 'Stop speaking' : 'Read aloud'}
              disabled={disabled || streaming || !String(value || '').trim()}
              onClick={onSpeakLast}
            >
              {speaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </PromptInputAction>
          ) : null}
        </PromptInputActions>
      </PromptInput>
    </footer>
  )
}
