import { useState, useRef, useEffect, useCallback } from 'react';
import {
  FiSend,
  FiUser,
  FiMessageCircle,
  FiAlertCircle,
  FiBookOpen,
  FiCalendar,
  FiTrendingDown,
  FiX,
  FiMic,
  FiMicOff,
  FiVolume2,
  FiVolumeX,
  FiSquare,
} from 'react-icons/fi';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

// Helper to strip markdown and symbols so speech reads fluently and naturally
function cleanTextForSpeech(text) {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, ' Code snippet omitted. ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#+\s+/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[-*•]\s+/g, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Select a high quality natural English voice if available in the browser
function getBestVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  return (
    voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') ||
          v.name.includes('Google') ||
          v.name.includes('Samantha') ||
          v.name.includes('Zira') ||
          v.name.includes('Jenny') ||
          v.name.includes('Guy'))
    ) ||
    voices.find((v) => v.lang.startsWith('en') && !v.name.includes('Desktop')) ||
    voices.find((v) => v.lang.startsWith('en')) ||
    voices[0]
  );
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content:
        "Hi! I'm here if you want to talk through anything — study habits, attendance, exam stress, or just how things are going. What's on your mind?",
    },
  ]);
  const SUGGESTED_PROMPTS = [
    { label: 'Study habits', icon: FiBookOpen, prompt: 'Can you help me build a better study routine?' },
    { label: 'Attendance help', icon: FiCalendar, prompt: "I'm finding it hard to keep up with attendance lately." },
    { label: 'Exam stress', icon: FiTrendingDown, prompt: "I'm feeling stressed about upcoming exams." },
  ];
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [chatSessionId, setChatSessionId] = useState(null);
  const [escalated, setEscalated] = useState(false);
  const [showMentorPrompt, setShowMentorPrompt] = useState(false);

  // Voice States
  const [autoSpeak, setAutoSpeak] = useState(() => {
    try {
      return localStorage.getItem('chatbot_autospeak') !== 'false';
    } catch {
      return true;
    }
  });
  const [isListening, setIsListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);

  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const autoSpeakRef = useRef(autoSpeak);
  const speakingIndexRef = useRef(null);
  const wasVoiceInputRef = useRef(false);
  const transcriptRef = useRef('');
  const isErrorRef = useRef(false);
  const chatSessionIdRef = useRef(chatSessionId);
  const escalatedRef = useRef(escalated);
  const sendingRef = useRef(sending);
  const { showToast } = useToast();

  // Keep state refs in sync
  useEffect(() => {
    autoSpeakRef.current = autoSpeak;
  }, [autoSpeak]);

  useEffect(() => {
    chatSessionIdRef.current = chatSessionId;
  }, [chatSessionId]);

  useEffect(() => {
    escalatedRef.current = escalated;
  }, [escalated]);

  useEffect(() => {
    sendingRef.current = sending;
  }, [sending]);

  // Check browser speech capabilities & load voices
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasTTS = 'speechSynthesis' in window;
      setTtsSupported(hasTTS);

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      setSpeechSupported(!!SpeechRecognition);

      if (hasTTS) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }
  }, []);

  // Stop speech playback cleanly
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    speakingIndexRef.current = null;
    setSpeakingIndex(null);
  }, []);

  // Speak specific message
  const speakMessage = useCallback(
    (text, index) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;

      // If already speaking this message, clicking will stop
      if (speakingIndexRef.current === index) {
        stopSpeaking();
        return;
      }

      stopSpeaking();

      const cleaned = cleanTextForSpeech(text);
      if (!cleaned) return;

      const utterance = new SpeechSynthesisUtterance(cleaned);
      const voice = getBestVoice();
      if (voice) utterance.voice = voice;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        speakingIndexRef.current = index;
        setSpeakingIndex(index);
      };
      utterance.onend = () => {
        speakingIndexRef.current = null;
        setSpeakingIndex(null);
      };
      utterance.onerror = () => {
        speakingIndexRef.current = null;
        setSpeakingIndex(null);
      };

      window.speechSynthesis.speak(utterance);
    },
    [stopSpeaking]
  );

  // Stop Speech Recognition
  const stopListening = useCallback(({ cancel = false } = {}) => {
    if (cancel) {
      transcriptRef.current = '';
      isErrorRef.current = true;
    }
    if (recognitionRef.current) {
      try {
        if (cancel) {
          recognitionRef.current.abort();
        } else {
          recognitionRef.current.stop();
        }
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const sendMessage = useCallback(
    async (text, { isVoice = false } = {}) => {
      const trimmed = text?.trim();
      if (!trimmed || sendingRef.current) return;

      // Immediately halt any previous speech and stop listening
      stopSpeaking();
      stopListening({ cancel: true });

      setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
      setInput('');
      setSending(true);
      sendingRef.current = true;
      setShowMentorPrompt(false);

      try {
        const currentSessionId = chatSessionIdRef.current;
        const res = await api.post('/chat', { message: trimmed, chatSessionId: currentSessionId });

        const data = res.data;
        setChatSessionId(data.chatSessionId);
        chatSessionIdRef.current = data.chatSessionId;

        // Append new AI message
        setMessages((prev) => {
          const nextMsgs = [...prev, { role: 'ai', content: data.reply }];
          return nextMsgs;
        });

        // ONLY automatically speak if the message was sent via VOICE input
        // AND voice output is currently enabled in settings (autoSpeak !== false)
        if (isVoice === true && autoSpeakRef.current && typeof window !== 'undefined' && 'speechSynthesis' in window) {
          setTimeout(() => {
            setMessages((currentMsgs) => {
              const aiIdx = currentMsgs.length - 1;
              if (aiIdx >= 0 && currentMsgs[aiIdx].role === 'ai') {
                speakMessage(data.reply, aiIdx);
              }
              return currentMsgs;
            });
          }, 150);
        }

        if (data.escalated) {
          setEscalated(true);
          escalatedRef.current = true;
        } else if (data.lowConfidence) {
          setShowMentorPrompt(true);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: 'ai', content: "Sorry, I'm having trouble responding right now. Please try again." },
        ]);
      } finally {
        setSending(false);
        sendingRef.current = false;
      }
    },
    [speakMessage, stopListening, stopSpeaking]
  );

  // Start Speech Recognition (Voice Input)
  const startListening = () => {
    if (isListening) {
      stopListening({ cancel: false });
      return;
    }

    // Stop speaking cleanly so previous AI speech stops immediately
    stopSpeaking();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Voice input is not supported in this browser. Please try Chrome or Edge.', 'error');
      return;
    }

    try {
      // Reset voice tracking session
      transcriptRef.current = '';
      isErrorRef.current = false;
      wasVoiceInputRef.current = true;

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        wasVoiceInputRef.current = true;
      };

      recognition.onresult = (event) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          fullTranscript += event.results[i][0].transcript;
        }
        const clean = fullTranscript.trim();
        if (clean) {
          transcriptRef.current = clean;
          setInput(clean);
          wasVoiceInputRef.current = true;
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          isErrorRef.current = true;
          if (event.error === 'not-allowed') {
            showToast('Microphone access was denied. Please allow microphone permissions in your browser.', 'error');
          } else {
            showToast(`Voice input error: ${event.error}`, 'error');
          }
        } else {
          isErrorRef.current = true;
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;

        const textToSend = transcriptRef.current?.trim();
        const hadError = isErrorRef.current;
        transcriptRef.current = '';

        // If we captured valid non-empty speech without errors, auto-submit!
        if (textToSend && !hadError && !sendingRef.current) {
          sendMessage(textToSend, { isVoice: true });
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      showToast('Could not start voice input. Please try again.', 'error');
    }
  };

  // Toggle Auto-Speak Preference
  const toggleAutoSpeak = () => {
    setAutoSpeak((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('chatbot_autospeak', String(next));
      } catch {}
      if (!next) {
        stopSpeaking();
      }
      showToast(next ? 'Voice replies enabled' : 'Voice replies muted', 'info');
      return next;
    });
  };

  // Cleanup on close or unmount
  useEffect(() => {
    if (!isOpen) {
      stopSpeaking();
      stopListening({ cancel: true });
    }
  }, [isOpen, stopSpeaking, stopListening]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening({ cancel: true });
    };
  }, [stopSpeaking, stopListening]);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isListening]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-chat-widget', handleOpen);
    return () => window.removeEventListener('open-chat-widget', handleOpen);
  }, []);

  const requestMentor = async () => {
    if (!chatSessionId) return;
    stopSpeaking();
    stopListening({ cancel: true });
    setSending(true);
    sendingRef.current = true;
    try {
      await api.post('/chat/escalate', { chatSessionId });
      setEscalated(true);
      escalatedRef.current = true;
      const mentorMsg = "I've let your mentor know you'd like to connect. They will follow up with you soon. You can continue chatting with me here in the meantime!";
      setMessages((prev) => [...prev, { role: 'ai', content: mentorMsg }]);
      showToast('Mentor notified', 'success');
    } catch {
      showToast('Failed to connect with mentor. Please try again.', 'error');
    } finally {
      setSending(false);
      sendingRef.current = false;
      setShowMentorPrompt(false);
    }
  };

  // Keyboard typing cancels voice listening and sets voice mode to false
  const handleInputChange = (e) => {
    if (isListening) {
      stopListening({ cancel: true });
    }
    setInput(e.target.value);
    wasVoiceInputRef.current = false;
  };

  const handleKeyDown = () => {
    if (isListening) {
      stopListening({ cancel: true });
    }
    wasVoiceInputRef.current = false;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const isVoice = wasVoiceInputRef.current === true;
    wasVoiceInputRef.current = false;
    sendMessage(input, { isVoice });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all z-50 group"
        title="Open AI Mentor Chat & Voice Assistant"
      >
        <FiMessageCircle size={24} />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white ring-2 ring-emerald-500/20" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col h-[520px] max-h-[85vh] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-sm">
            <FiMessageCircle size={16} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm tracking-tight">Mentor AI</h3>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                Live
              </span>
            </div>
            <p className="text-[11px] text-indigo-200 flex items-center gap-1">
              Voice & Text Assistant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Voice Output (TTS) Toggle */}
          {ttsSupported && (
            <button
              onClick={toggleAutoSpeak}
              type="button"
              className={`p-2 rounded-lg transition-all text-xs flex items-center gap-1 ${
                autoSpeak
                  ? 'text-white bg-white/20 hover:bg-white/30 shadow-inner'
                  : 'text-indigo-200 hover:text-white hover:bg-white/10 opacity-75'
              }`}
              title={autoSpeak ? 'Voice output: ON (Click to mute)' : 'Voice output: MUTED (Click to unmute)'}
            >
              {autoSpeak ? (
                <>
                  <FiVolume2 size={16} className="text-emerald-300" />
                  <span className="text-[10px] font-medium hidden sm:inline text-emerald-200">Voice ON</span>
                </>
              ) : (
                <>
                  <FiVolumeX size={16} />
                  <span className="text-[10px] font-medium hidden sm:inline">Muted</span>
                </>
              )}
            </button>
          )}

          {/* Close Button */}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition"
            title="Close chat"
          >
            <FiX size={18} />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
        {messages.map((m, i) => {
          const isAi = m.role === 'ai';
          const isCurrentlySpeaking = speakingIndex === i;

          return (
            <div key={i} className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}>
              <div className={`flex gap-2 max-w-[88%] ${isAi ? 'flex-row' : 'flex-row-reverse'}`}>
                {/* Avatar */}
                <div
                  className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center shadow-xs mt-0.5 ${
                    isAi
                      ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {isAi ? <FiMessageCircle size={13} /> : <FiUser size={13} />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`relative rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-xs transition-all ${
                    isAi
                      ? 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-sm'
                      : 'bg-indigo-600 text-white rounded-tr-sm'
                  } ${isCurrentlySpeaking ? 'ring-2 ring-indigo-400/80 bg-indigo-50/30' : ''}`}
                >
                  <div>{m.content}</div>

                  {/* AI Message Footer: Soundwave & Speaker Action */}
                  {isAi && ttsSupported && (
                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      {isCurrentlySpeaking ? (
                        <div className="flex items-center gap-1.5 text-indigo-600 font-medium text-[11px]">
                          <span className="flex items-center gap-0.5 h-3">
                            <span className="w-1 bg-indigo-600 rounded-full animate-soundwave-1" />
                            <span className="w-1 bg-indigo-600 rounded-full animate-soundwave-2" />
                            <span className="w-1 bg-indigo-600 rounded-full animate-soundwave-3" />
                            <span className="w-1 bg-indigo-600 rounded-full animate-soundwave-4" />
                          </span>
                          <span>Speaking...</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">Mentor AI</span>
                      )}

                      <button
                        onClick={() => speakMessage(m.content, i)}
                        type="button"
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                          isCurrentlySpeaking
                            ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                            : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'
                        }`}
                        title={isCurrentlySpeaking ? 'Stop speaking' : 'Read message aloud'}
                      >
                        {isCurrentlySpeaking ? (
                          <>
                            <FiSquare size={11} className="text-rose-500 fill-rose-500" />
                            <span className="text-rose-600 font-semibold">Stop</span>
                          </>
                        ) : (
                          <>
                            <FiVolume2 size={12} />
                            <span>Listen</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Suggested Prompts on First Message */}
        {messages.length === 1 && !sending && (
          <div className="flex flex-col gap-2 pl-9 pt-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quick prompts</span>
            {SUGGESTED_PROMPTS.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.label}
                  onClick={() => {
                    wasVoiceInputRef.current = false;
                    sendMessage(p.prompt, { isVoice: false });
                  }}
                  className="flex items-center gap-2 text-xs font-medium bg-white border border-slate-200/90 text-slate-700 px-3 py-2 rounded-xl hover:border-indigo-300 hover:text-indigo-600 hover:shadow-xs transition-all text-left group"
                >
                  <Icon size={14} className="shrink-0 text-indigo-500 group-hover:scale-110 transition-transform" />
                  {p.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Typing indicator */}
        {sending && (
          <div className="flex gap-2.5 items-center">
            <div className="w-7 h-7 shrink-0 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <FiMessageCircle size={13} />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-2.5 text-xs text-slate-500 shadow-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping" />
              <span>Thinking & formulating answer...</span>
            </div>
          </div>
        )}

        {/* Mentor Escalation Prompt */}
        {showMentorPrompt && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-xs">
            <div className="flex items-start gap-2">
              <FiAlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 font-medium leading-relaxed">
                Would you prefer to connect directly with your human assigned mentor?
              </p>
            </div>
            <button
              onClick={requestMentor}
              disabled={sending}
              className="text-xs font-semibold bg-amber-600 text-white px-3.5 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition shadow-xs w-full"
            >
              Connect with Mentor
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Voice Listening Active Wave Bar Indicator */}
      {isListening && (
        <div className="bg-rose-50 border-t border-rose-200 px-3.5 py-2 flex items-center justify-between text-xs text-rose-700 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
            </span>
            <span className="font-semibold text-rose-800">Listening to your voice...</span>
          </div>
          <button
            onClick={stopListening}
            type="button"
            className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline underline-offset-2"
          >
            Done
          </button>
        </div>
      )}

      {/* Message Input Form */}
      <form onSubmit={handleSubmit} className="border-t border-slate-200 p-3 bg-white flex gap-2 items-center">
        {/* Voice Input (Microphone) Button */}
        {speechSupported && (
          <button
            type="button"
            onClick={startListening}
            disabled={sending}
            className={`p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0 ${
              isListening
                ? 'bg-rose-600 text-white shadow-md shadow-rose-300 ring-4 ring-rose-100 scale-105'
                : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title={isListening ? 'Stop listening' : 'Speak message (Voice Input)'}
          >
            {isListening ? <FiMicOff size={16} className="animate-pulse" /> : <FiMic size={16} />}
          </button>
        )}

        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening
              ? 'Listening... Speak now 🎙️'
              : speechSupported
              ? 'Type or click mic to speak...'
              : 'Type a message...'
          }
          disabled={sending}
          className={`flex-1 border rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 transition ${
            isListening ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300 bg-slate-50/40 focus:bg-white'
          }`}
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs flex items-center justify-center shrink-0"
          title="Send message"
        >
          <FiSend size={15} />
        </button>
      </form>
    </div>
  );
}
