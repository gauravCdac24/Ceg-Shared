import { useCallback, useEffect, useRef, useState } from 'react'

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

/**
 * Browser Speech-to-Text and Text-to-Speech helpers (Web Speech API).
 */
export function useSpeech({ onTranscript, lang = 'en-IN' } = {}) {
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState({ stt: false, tts: false })
  const recognitionRef = useRef(null)
  const utteranceRef = useRef(null)

  useEffect(() => {
    setSupported({
      stt: Boolean(getSpeechRecognition()),
      tts: typeof window !== 'undefined' && 'speechSynthesis' in window,
    })
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop?.()
    recognitionRef.current = null
    setListening(false)
  }, [])

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) return false

    stopListening()
    const recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript
      }
      if (transcript.trim()) onTranscript?.(transcript.trim())
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => {
      recognitionRef.current = null
      setListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
    return true
  }, [lang, onTranscript, stopListening])

  const toggleListening = useCallback(() => {
    if (listening) {
      stopListening()
      return
    }
    startListening()
  }, [listening, startListening, stopListening])

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    utteranceRef.current = null
    setSpeaking(false)
  }, [])

  const speak = useCallback(
    (text) => {
      const trimmed = String(text || '').trim()
      if (!trimmed || typeof window === 'undefined' || !window.speechSynthesis) return false

      stopSpeaking()
      const utterance = new SpeechSynthesisUtterance(trimmed)
      utterance.lang = lang
      utterance.onend = () => {
        utteranceRef.current = null
        setSpeaking(false)
      }
      utterance.onerror = () => {
        utteranceRef.current = null
        setSpeaking(false)
      }
      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
      setSpeaking(true)
      return true
    },
    [lang, stopSpeaking],
  )

  useEffect(() => {
    return () => {
      stopListening()
      stopSpeaking()
    }
  }, [stopListening, stopSpeaking])

  return {
    supported,
    listening,
    speaking,
    toggleListening,
    stopListening,
    speak,
    stopSpeaking,
  }
}
