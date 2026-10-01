import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Settings,
  Phone,
  Video,
  Send,
  Paperclip,
  Mic,
  Square,
  Smile,
  Reply,
  MoreVertical,
  Bot,
  Sparkles,
  Globe,
  Check,
  Languages,
  Search,
  X,
  HardDrive,
  BarChart2,
  ArrowLeft,
} from 'lucide-react';
import { Group, GroupMessage, NexxoUser, MessageAttachment, ReplyReference, UserMediaItem } from '../../types';
import {
  subscribeToGroupMessages,
  sendGroupMessage,
  setGroupTypingStatus,
  toggleGroupMessageReaction,
  editGroupMessage,
  deleteGroupMessageForEveryone,
  sendGroupPoll,
  voteGroupPoll,
  closeGroupPoll,
} from '../../lib/groupService';
import { uploadChatAttachment } from '../../lib/storageService';
import { saveUserMediaItem } from '../../lib/mediaLibraryService';
import { GroupSettingsModal } from './GroupSettingsModal';
import { translateMessage, getSmartReplies, summarizeContent } from '../../lib/aiService';
import { UserMediaLibraryModal } from '../media/UserMediaLibraryModal';
import { PollCard } from '../chat/PollCard';
import { CreatePollModal } from '../chat/CreatePollModal';
import { VerifiedBadge } from '../common/VerifiedBadge';

interface GroupChatViewProps {
  group: Group;
  currentUser: NexxoUser;
  connections: NexxoUser[];
  onStartCall?: (type: 'voice' | 'video') => void;
  onLeftGroup?: () => void;
  onOpenAiAssistant?: () => void;
  onBack?: () => void;
}

export const GroupChatView: React.FC<GroupChatViewProps> = ({
  group,
  currentUser,
  connections,
  onStartCall,
  onLeftGroup,
  onOpenAiAssistant,
  onBack,
}) => {
  const draftKey = `nexxo_group_draft_${group.id}_${currentUser.id}`;
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [inputText, setInputText] = useState(() => {
    try {
      return localStorage.getItem(draftKey) || '';
    } catch {
      return '';
    }
  });

  // Keep draft persisted in localStorage
  useEffect(() => {
    try {
      if (inputText) {
        localStorage.setItem(draftKey, inputText);
      } else {
        localStorage.removeItem(draftKey);
      }
    } catch {}
  }, [inputText, draftKey]);

  // Load draft when switching groups
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey) || '';
      setInputText(saved);
    } catch {}
  }, [draftKey]);

  const [replyTo, setReplyTo] = useState<ReplyReference | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeechListening, setIsSpeechListening] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [summaryModal, setSummaryModal] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [targetLang, setTargetLang] = useState('Spanish');
  const [isTranslating, setIsTranslating] = useState(false);
  const [groupSearchOpen, setGroupSearchOpen] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [showPollModal, setShowPollModal] = useState(false);

  const handleSendPoll = async (pollInfo: { question: string; options: string[]; multipleAnswers: boolean }) => {
    try {
      await sendGroupPoll({
        groupId: group.id,
        senderId: currentUser.id,
        senderName: currentUser.displayName || currentUser.username,
        senderPhoto: currentUser.photoURL || '',
        question: pollInfo.question,
        options: pollInfo.options,
        multipleAnswers: pollInfo.multipleAnswers,
      });
      setShowPollModal(false);
    } catch (err) {
      console.error('Failed to create group poll:', err);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  // Subscribe to real-time group messages
  useEffect(() => {
    const unsub = subscribeToGroupMessages(group.id, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [group.id]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch smart replies when last message arrives from someone else
  useEffect(() => {
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.senderId !== currentUser.id && last.text) {
        getSmartReplies(
          messages.slice(-4).map((m) => ({ senderName: m.senderName, text: m.text }))
        ).then(setSmartReplies);
      }
    }
  }, [messages.length, currentUser.id]);

  // Speech-to-Text setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsSpeechListening(false);
      };
      recog.onerror = () => setIsSpeechListening(false);
      recog.onend = () => setIsSpeechListening(false);
      recognitionRef.current = recog;
    }
  }, []);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      console.warn('Speech recognition is not supported in this browser.');
      return;
    }
    if (isSpeechListening) {
      recognitionRef.current.stop();
      setIsSpeechListening(false);
    } else {
      setIsSpeechListening(true);
      recognitionRef.current.start();
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    const currentReply = replyTo;
    setReplyTo(null);

    try {
      await sendGroupMessage({
        groupId: group.id,
        senderId: currentUser.id,
        senderName: currentUser.displayName || currentUser.username,
        senderPhoto: currentUser.photoURL || '',
        text: textToSend,
        type: 'text',
        replyTo: currentReply,
      });
      setGroupTypingStatus(group.id, currentUser.id, currentUser.displayName, false);
    } catch (err) {
      console.error('Failed to send group message:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploadRes = await uploadChatAttachment(file, `groups/${group.id}`);
      const type = file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('video/')
        ? 'video'
        : 'file';

      await sendGroupMessage({
        groupId: group.id,
        senderId: currentUser.id,
        senderName: currentUser.displayName || currentUser.username,
        senderPhoto: currentUser.photoURL || '',
        text: file.name,
        type,
        attachment: uploadRes,
      });
    } catch (err) {
      console.error('Error uploading group attachment:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        if (audioBlob.size > 0) {
          setIsUploading(true);
          try {
            const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, {
              type: 'audio/webm',
            });
            const uploadRes = await uploadChatAttachment(audioFile, `groups/${group.id}`);
            await sendGroupMessage({
              groupId: group.id,
              senderId: currentUser.id,
              senderName: currentUser.displayName || currentUser.username,
              senderPhoto: currentUser.photoURL || '',
              text: 'Voice message',
              type: 'voice',
              attachment: uploadRes,
            });
          } catch (err) {
            console.error('Error uploading voice note:', err);
          } finally {
            setIsUploading(false);
          }
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone permission error:', err);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSummarize = async () => {
    if (messages.length === 0) return;
    setIsSummarizing(true);
    try {
      const summary = await summarizeContent(
        group.name,
        messages.slice(-25).map((m) => ({ senderName: m.senderName, text: m.text }))
      );
      setSummaryModal(summary);
    } catch (err: any) {
      console.warn('Failed to summarize conversation:', err);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleTranslateInput = async () => {
    if (!inputText.trim()) return;
    setIsTranslating(true);
    try {
      const translated = await translateMessage(inputText, targetLang);
      setInputText(translated);
      setShowTranslateModal(false);
    } catch (err: any) {
      console.warn('Translation failed:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  const isAdmin = group.ownerId === currentUser.id || group.admins.includes(currentUser.id);
  const canSend =
    group.settings.whoCanSendMessages === 'all' || isAdmin;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Group Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Back Button */}
          {onBack && (
            <button
              onClick={onBack}
              type="button"
              className="md:hidden p-1.5 -ml-1 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              aria-label="Back to Groups"
              title="Back to Groups"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white shadow-md shrink-0">
            {group.photoURL ? (
              <img src={group.photoURL} alt={group.name} className="h-full w-full object-cover" />
            ) : (
              <Users className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold leading-tight text-slate-900 dark:text-white flex items-center gap-2 truncate">
              <span className="truncate">{group.name}</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
              {group.memberCount} members • {group.settings.whoCanSendMessages === 'admins' ? 'Admins only' : 'All members'}
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={handleSummarize}
            disabled={isSummarizing || messages.length === 0}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition-colors cursor-pointer border border-indigo-200 dark:border-transparent"
            title="AI Group Summary"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isSummarizing ? 'Summarizing...' : 'AI Summary'}</span>
          </button>

          {onStartCall && (
            <>
              <button
                onClick={() => onStartCall('voice')}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Start Voice Call"
              >
                <Phone className="h-4 w-4" />
              </button>
              <button
                onClick={() => onStartCall('video')}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Start Video Call"
              >
                <Video className="h-4 w-4" />
              </button>
            </>
          )}

          {/* In-Group Search Toggle */}
          <button
            onClick={() => {
              setGroupSearchOpen((prev) => !prev);
              if (groupSearchOpen) setGroupSearchQuery('');
            }}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              groupSearchOpen
                ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Search messages in group"
          >
            <Search className="h-4 w-4" />
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Group Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Group In-Chat Search Bar */}
      {groupSearchOpen && (
        <div className="px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
            <input
              type="text"
              value={groupSearchQuery}
              onChange={(e) => setGroupSearchQuery(e.target.value)}
              placeholder="Search group messages..."
              autoFocus
              className="w-full bg-transparent text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => {
              setGroupSearchOpen(false);
              setGroupSearchQuery('');
            }}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Users className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="font-semibold text-slate-800 dark:text-slate-300">Welcome to {group.name}!</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Send the first message to start the conversation with group members.
            </p>
          </div>
        ) : (
          messages
            .filter((msg) => {
              if (!groupSearchOpen || !groupSearchQuery.trim()) return true;
              return msg.text?.toLowerCase().includes(groupSearchQuery.toLowerCase());
            })
            .map((msg) => {
            const isOwn = msg.senderId === currentUser.id;
            const isDeleted = msg.isDeletedForEveryone;

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 group ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                {!isOwn && (
                  <div className="h-7 w-7 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-1">
                    {msg.senderPhoto ? (
                      <img src={msg.senderPhoto} alt="" className="h-full w-full object-cover" />
                    ) : (
                      msg.senderName.charAt(0).toUpperCase()
                    )}
                  </div>
                )}

                <div
                  className={`relative max-w-[75%] rounded-2xl p-3.5 shadow-xs text-sm ${
                    isOwn
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700/50'
                  }`}
                >
                  {/* Sender Name in Group */}
                  {!isOwn && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        {msg.senderName}
                      </p>
                      {(() => {
                        const senderUser = connections.find((c) => c.id === msg.senderId);
                        return senderUser ? (
                          <VerifiedBadge
                            isVerified={senderUser.isVerified}
                            isPremium={senderUser.isPremium}
                            premiumTier={senderUser.premiumTier}
                            size="xs"
                          />
                        ) : null;
                      })()}
                    </div>
                  )}

                  {/* Reply Reference if any */}
                  {msg.replyTo && (
                    <div className="mb-2 p-2 rounded-lg bg-slate-100 dark:bg-black/20 border-l-2 border-indigo-500 dark:border-indigo-400 text-xs">
                      <p className="font-bold opacity-80 text-[10px]">{msg.replyTo.senderName}</p>
                      <p className="truncate opacity-90">{msg.replyTo.text}</p>
                    </div>
                  )}

                  {/* Message Content */}
                  {isDeleted ? (
                    <p className="italic text-xs opacity-60">This message was deleted.</p>
                  ) : (
                    <>
                      {msg.attachment && (
                        <div className="mb-2">
                          {msg.type === 'image' && (
                            <img
                              src={msg.attachment.url}
                              alt=""
                              className="rounded-lg max-h-60 w-full object-cover"
                            />
                          )}
                          {msg.type === 'voice' && (
                            <audio
                              controls
                              src={msg.attachment.url}
                              className="h-8 max-w-full my-1"
                            />
                          )}
                          {msg.type === 'file' && (
                            <a
                              href={msg.attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-black/20 hover:bg-slate-200 dark:hover:bg-black/30 text-xs underline"
                            >
                              <Paperclip className="h-4 w-4" />
                              {msg.attachment.name}
                            </a>
                          )}
                        </div>
                      )}

                      {msg.type === 'poll' && msg.poll ? (
                        <div className="my-1 text-slate-900 dark:text-white">
                          <PollCard
                            poll={msg.poll}
                            currentUserId={currentUser.id}
                            onVote={(optId) => voteGroupPoll(group.id, msg.id, optId, currentUser.id)}
                            canClose={isOwn || group.ownerId === currentUser.id || group.admins?.includes(currentUser.id)}
                            onClosePoll={() => closeGroupPoll(group.id, msg.id)}
                          />
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      )}
                    </>
                  )}

                  {/* Bottom bar with timestamp & reply button */}
                  <div className="flex items-center justify-end gap-1.5 mt-1 opacity-70 text-[10px]">
                    {msg.isEdited && <span>(edited)</span>}
                    <span>
                      {msg.createdAt?.toDate
                        ? msg.createdAt.toDate().toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </span>
                    <button
                      onClick={() =>
                        setReplyTo({
                          id: msg.id,
                          senderId: msg.senderId,
                          senderName: msg.senderName,
                          text: msg.text,
                        })
                      }
                      className="opacity-0 group-hover:opacity-100 hover:text-indigo-600 dark:hover:text-white transition-opacity ml-1 cursor-pointer"
                      title="Reply"
                    >
                      <Reply className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Smart Replies Bar */}
      {smartReplies.length > 0 && canSend && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-100/80 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
          {smartReplies.map((reply, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInputText(reply);
                setSmartReplies([]);
              }}
              className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 hover:bg-indigo-600 text-xs text-slate-700 dark:text-slate-300 hover:text-white transition-colors flex-shrink-0 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Active Reply Banner */}
      {replyTo && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Reply className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>
              Replying to <strong className="text-slate-900 dark:text-white">{replyTo.senderName}</strong>:{' '}
              <span className="text-slate-500 dark:text-slate-400 truncate max-w-xs">{replyTo.text}</span>
            </span>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Message Composer */}
      {canSend ? (
        <div className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800">
          {inputText && (
            <div className="flex items-center justify-between px-1 pb-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <span>Draft auto-saved &bull; preserved across tabs</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setInputText('');
                  try {
                    localStorage.removeItem(draftKey);
                  } catch {}
                }}
                className="text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
              >
                Discard draft
              </button>
            </div>
          )}
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Attach File"
            >
              <Paperclip className="h-5 w-5" />
            </button>

            {/* Create Poll Button */}
            <button
              type="button"
              onClick={() => setShowPollModal(true)}
              className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Create Poll"
            >
              <BarChart2 className="h-5 w-5" />
            </button>

            {/* Translate Button */}
            <button
              type="button"
              onClick={() => setShowTranslateModal(!showTranslateModal)}
              className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="AI Translate Draft"
            >
              <Globe className="h-5 w-5" />
            </button>

            {/* Speech to text */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isSpeechListening
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={isSpeechListening ? 'Listening...' : 'Voice to Text'}
            >
              <Mic className="h-5 w-5" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setGroupTypingStatus(group.id, currentUser.id, currentUser.displayName, true);
              }}
              placeholder={
                isSpeechListening ? 'Listening to speech...' : 'Type a group message...'
              }
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
            />

            {/* Voice note recorder */}
            {inputText.trim().length === 0 ? (
              <button
                type="button"
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  isRecording
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title={isRecording ? 'Stop and Send Voice Note' : 'Hold / Tap to Record Voice Note'}
              >
                {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md disabled:opacity-50 transition-colors cursor-pointer"
                title="Send Message"
              >
                <Send className="h-5 w-5" />
              </button>
            )}
          </form>

          {/* Inline Translation Tool */}
          {showTranslateModal && (
            <div className="mt-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-slate-700 dark:text-slate-300">Translate drafted text into:</span>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-900 dark:text-white text-xs"
                >
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Arabic">Arabic</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Bengali">Bengali</option>
                  <option value="Portuguese">Portuguese</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleTranslateInput}
                disabled={isTranslating || !inputText.trim()}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50 cursor-pointer"
              >
                {isTranslating ? 'Translating...' : 'Translate'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
          Only administrators can send messages in this group.
        </div>
      )}

      {/* AI Summary Modal */}
      {summaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                <Sparkles className="h-5 w-5" />
                <h3 className="text-slate-900 dark:text-white">AI Conversation Summary</h3>
              </div>
              <button
                onClick={() => setSummaryModal(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto pr-1">
              {summaryModal}
            </div>
            <button
              onClick={() => setSummaryModal(null)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Group Settings Modal */}
      {isSettingsOpen && (
        <GroupSettingsModal
          group={group}
          currentUser={currentUser}
          connections={connections}
          onClose={() => setIsSettingsOpen(false)}
          onLeftGroup={onLeftGroup}
        />
      )}

      {/* Create Group Poll Modal */}
      <CreatePollModal
        isOpen={showPollModal}
        onClose={() => setShowPollModal(false)}
        onSubmit={handleSendPoll}
      />
    </div>
  );
};
