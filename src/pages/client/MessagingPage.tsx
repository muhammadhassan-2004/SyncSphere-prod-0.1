import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Avatar } from '@/src/components/ui/avatar';
import { useAuth } from '@/src/context/AuthContext';
import { Conversation, Message, ChatAttachment, Project, UserProfile } from '@/src/types/firestore';
import {
  subscribeToUserConversations,
  subscribeToMessages,
  sendMessage,
  markConversationAsRead,
  setTypingStatus,
  createConversation,
} from '@/src/lib/firestore/conversations';
import { subscribeToUserProfile } from '@/src/lib/firestore/users';
import { subscribeToProjectById, getProjectsByOwner } from '@/src/lib/firestore/projects';
import { formatProjectBudget } from '@/src/lib/firestore/adminProjects';
import { uploadFileToCloudinary } from '@/src/lib/storage/cloudinary';
import { triggerFileDownload } from '@/src/lib/storage/download';
import { UserProfileModal } from '@/src/components/profile/UserProfileModal';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ActiveCallModal } from '@/src/components/chat/ActiveCallModal';
import {
  MessageSquare,
  Search,
  Paperclip,
  Send,
  MoreVertical,
  User,
  Sparkles,
  CheckCheck,
  File,
  X,
  Clock,
  ArrowLeft,
  Briefcase,
  ExternalLink,
  Video,
  Phone,
  Lock,
} from 'lucide-react';

export const MessagingPage: React.FC = () => {
  const { firebaseUser, userProfile } = useAuth();
  const clientId = firebaseUser?.uid || '';
  const clientName =
    userProfile?.companyName ||
    userProfile?.displayName ||
    (userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : 'Client');

  const navigate = useNavigate();
  const routeParams = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();

  // Route & query params
  const activeConvIdFromUrl = routeParams.conversationId || searchParams.get('convId') || '';
  const specialistParam = searchParams.get('specialist') || '';
  const projectIdParam = searchParams.get('projectId') || '';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string>(activeConvIdFromUrl);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Input & Attachments State
  const [messageText, setMessageText] = useState<string>('');
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [sending, setSending] = useState<boolean>(false);

  // Kebab Menu, Profile Modal & Toast
  const [showKebabMenu, setShowKebabMenu] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Active Video / Audio Call State (Issue #5)
  const [activeCallType, setActiveCallType] = useState<'audio' | 'video' | null>(null);

  // Participant User Profiles Map (cached/subscribed)
  const [participantProfiles, setParticipantProfiles] = useState<Record<string, UserProfile>>({});

  // Active Linked Project
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // Refs
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Initiate or Handle Specialist Parameter
  useEffect(() => {
    if (!clientId || !specialistParam) return;

    const initSpecialistConv = async () => {
      try {
        const convId = await createConversation(
          [clientId, specialistParam],
          projectIdParam || undefined,
          {
            participantNames: {
              [clientId]: clientName,
            },
          }
        );
        if (convId) {
          setSelectedConvId(convId);
        }
      } catch (err) {
        console.error('Failed to initiate conversation:', err);
      }
    };

    initSpecialistConv();
  }, [clientId, specialistParam, projectIdParam, clientName]);

  // 2. Subscribe to Real User Conversations from Firestore
  useEffect(() => {
    if (!clientId) return;
    setLoading(true);

    const unsub = subscribeToUserConversations(clientId, (convList) => {
      // Filter out legacy mock conversations
      const realConvs = (convList || []).filter((conv) => {
        if (!conv.participantIds) return false;
        const hasMockParticipant = conv.participantIds.some(
          (pId) =>
            pId === 'client-apex-corp' ||
            pId === 'symbiote-demo' ||
            pId === 'client-demo' ||
            pId.startsWith('symbiote-10')
        );
        if (hasMockParticipant || conv.projectId === 'proj-demo-1') {
          return false;
        }
        return true;
      });

      setConversations(realConvs);
      setLoading(false);

      if (!selectedConvId && realConvs.length > 0 && realConvs[0]?.id) {
        setSelectedConvId(realConvs[0].id);
      }
    });

    return () => unsub();
  }, [clientId]);

  // Handle URL changes
  useEffect(() => {
    if (activeConvIdFromUrl) {
      setSelectedConvId(activeConvIdFromUrl);
    }
  }, [activeConvIdFromUrl]);

  // Selected Conversation Object
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConvId) || conversations[0] || null;
  }, [conversations, selectedConvId]);

  // Other Participant ID
  const otherParticipantId = useMemo(() => {
    if (!activeConversation) return '';
    return activeConversation.participantIds.find((id) => id !== clientId) || '';
  }, [activeConversation, clientId]);

  // 3. Subscribe to Real User Profiles for All Participants
  useEffect(() => {
    if (conversations.length === 0) return;

    const allOtherIds = new Set<string>();
    conversations.forEach((conv) => {
      conv.participantIds.forEach((id) => {
        if (id && id !== clientId) allOtherIds.add(id);
      });
    });

    const unsubs: (() => void)[] = [];

    allOtherIds.forEach((pId) => {
      const unsub = subscribeToUserProfile(pId, (prof) => {
        if (prof) {
          setParticipantProfiles((prev) => ({ ...prev, [pId]: prof }));
        }
      });
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [conversations, clientId]);

  // Other Participant Profile details
  const otherProfile = participantProfiles[otherParticipantId] || null;

  const otherParticipantName = useMemo(() => {
    if (otherProfile) {
      return (
        otherProfile.displayName ||
        otherProfile.companyName ||
        (otherProfile.firstName ? `${otherProfile.firstName} ${otherProfile.lastName || ''}`.trim() : '') ||
        'Specialist'
      );
    }
    if (activeConversation?.participantNames?.[otherParticipantId]) {
      return activeConversation.participantNames[otherParticipantId];
    }
    return 'Specialist';
  }, [otherProfile, activeConversation, otherParticipantId]);

  const otherParticipantAvatar = useMemo(() => {
    if (otherProfile?.avatarInitials) return otherProfile.avatarInitials;
    if (otherParticipantName) return otherParticipantName.slice(0, 2).toUpperCase();
    return 'AI';
  }, [otherProfile, otherParticipantName]);

  const otherParticipantTitle = useMemo(() => {
    if (otherProfile?.title || otherProfile?.jobTitle) {
      return otherProfile.title || otherProfile.jobTitle;
    }
    if (activeConversation?.participantTitles?.[otherParticipantId]) {
      return activeConversation.participantTitles[otherParticipantId];
    }
    return 'AI Engineering Specialist';
  }, [otherProfile, activeConversation, otherParticipantId]);

  // Compute presence status from lastActiveAt
  const otherPresence = useMemo(() => {
    if (!otherProfile?.lastActiveAt) {
      return { isOnline: false, label: 'Offline' };
    }
    let date: Date | null = null;
    const val: any = otherProfile.lastActiveAt;
    if (typeof val.toDate === 'function') {
      date = val.toDate();
    } else if (val.seconds) {
      date = new Date(val.seconds * 1000);
    } else if (typeof val === 'string' || typeof val === 'number') {
      date = new Date(val);
    }

    if (!date || isNaN(date.getTime())) {
      return { isOnline: false, label: 'Offline' };
    }

    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 3) {
      return { isOnline: true, label: 'Active now' };
    } else if (diffMins < 60) {
      return { isOnline: false, label: `Last seen ${diffMins}m ago` };
    } else {
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) {
        return { isOnline: false, label: `Last seen ${diffHours}h ago` };
      } else {
        const diffDays = Math.floor(diffHours / 24);
        return { isOnline: false, label: `Last seen ${diffDays}d ago` };
      }
    }
  }, [otherProfile]);

  // 4. Subscribe to Real Project Object
  const activeProjectId = activeConversation?.projectId || projectIdParam;

  useEffect(() => {
    if (activeProjectId) {
      const unsub = subscribeToProjectById(activeProjectId, (proj) => {
        if (proj) {
          setActiveProject(proj);
        } else {
          setActiveProject(null);
        }
      });
      return () => unsub();
    } else if (clientId && otherParticipantId) {
      // Look up any active project shared between this client and symbiote
      getProjectsByOwner(clientId).then((projs) => {
        const shared = projs.find(
          (p) =>
            p.assignedSymbioteId === otherParticipantId ||
            (p.teamMembers && p.teamMembers.includes(otherParticipantId))
        );
        if (shared) {
          setActiveProject(shared);
        } else {
          setActiveProject(null);
        }
      });
    } else {
      setActiveProject(null);
    }
  }, [activeProjectId, clientId, otherParticipantId]);

  // 5. Subscribe to Messages in Active Thread
  useEffect(() => {
    if (!selectedConvId || !clientId) {
      setMessages([]);
      return;
    }

    markConversationAsRead(selectedConvId, clientId);

    const unsub = subscribeToMessages(selectedConvId, (msgList) => {
      setMessages(msgList);
      markConversationAsRead(selectedConvId, clientId);
    });

    return () => unsub();
  }, [selectedConvId, clientId]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typing Indicator Detection
  const isOtherTyping = useMemo(() => {
    if (!activeConversation || !otherParticipantId) return false;
    const typingTime = activeConversation.typing?.[otherParticipantId];
    if (!typingTime) return false;
    return Date.now() - typingTime < 4000;
  }, [activeConversation, otherParticipantId]);

  // Handle Keystrokes & Typing Indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);

    if (!selectedConvId || !clientId) return;

    setTypingStatus(selectedConvId, clientId, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (selectedConvId) {
        setTypingStatus(selectedConvId, clientId, false);
      }
    }, 3000);
  };

  // Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!messageText.trim() && pendingAttachments.length === 0) || !selectedConvId || sending) {
      return;
    }

    setSending(true);
    const textToSend = messageText.trim();
    const attachmentsToSend = [...pendingAttachments];

    setMessageText('');
    setPendingAttachments([]);

    try {
      await sendMessage(selectedConvId, clientId, textToSend, attachmentsToSend, clientName);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      await setTypingStatus(selectedConvId, clientId, false);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  // Handle File Upload Attachment with Cloudinary persistence
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingAttachment(true);
    try {
      const uploadedList: ChatAttachment[] = [];
      const fileList = Array.from(files) as File[];
      for (const file of fileList) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        const formattedSize = file.size > 1024 * 1024 ? `${sizeMB} MB` : `${Math.round(file.size / 1024)} KB`;

        try {
          const res = await uploadFileToCloudinary(file, {
            folder: `syncsphere/chat/${selectedConvId || 'general'}`,
            fileName: file.name,
          });
          uploadedList.push({
            name: file.name,
            url: res.url,
            size: formattedSize,
            type: file.type,
          });
        } catch (uploadErr) {
          console.warn('Direct upload fallback:', uploadErr);
          uploadedList.push({
            name: file.name,
            url: URL.createObjectURL(file),
            size: formattedSize,
            type: file.type,
          });
        }
      }
      setPendingAttachments((prev) => [...prev, ...uploadedList]);
    } finally {
      setUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Filter Conversations List
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const pIds = conv.participantIds || [];
      const oId = pIds.find((id) => id !== clientId) || '';
      const prof = participantProfiles[oId];
      const name = prof?.displayName || prof?.companyName || conv.participantNames?.[oId] || '';
      const title = prof?.title || prof?.jobTitle || conv.participantTitles?.[oId] || '';
      const lastMsg = conv.lastMessage || '';

      return (
        name.toLowerCase().includes(q) ||
        title.toLowerCase().includes(q) ||
        lastMsg.toLowerCase().includes(q)
      );
    });
  }, [conversations, searchQuery, clientId, participantProfiles]);

  // Group Messages By Date
  const groupedMessages = useMemo(() => {
    const groups: { dateLabel: string; msgs: Message[] }[] = [];

    messages.forEach((msg) => {
      const msgDate = new Date(msg.sentAt);
      const now = new Date();
      let dateLabel = msgDate.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });

      if (msgDate.toDateString() === now.toDateString()) {
        dateLabel = 'Today';
      } else {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (msgDate.toDateString() === yesterday.toDateString()) {
          dateLabel = 'Yesterday';
        }
      }

      const existingGroup = groups.find((g) => g.dateLabel === dateLabel);
      if (existingGroup) {
        existingGroup.msgs.push(msg);
      } else {
        groups.push({ dateLabel, msgs: [msg] });
      }
    });

    return groups;
  }, [messages]);

  return (
    <div className="w-full max-w-7xl mx-auto h-full flex flex-col min-h-0 space-y-3">
      {/* PAGE TITLE BAR */}
      <div className="shrink-0 flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-[10px] bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)]">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">
              Real-Time Messaging Center
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] font-mono">
              Direct, secure communication with your AI specialists and team.
            </p>
          </div>
        </div>

        {toastNotification && (
          <div className="px-3 py-1.5 rounded-full bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/40 text-[var(--color-accent-cyan)] text-xs font-mono animate-fadeIn flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{toastNotification}</span>
          </div>
        )}
      </div>

      {/* TWO-PANE CHAT CONTAINER */}
      <Card className="flex-1 min-h-0 bg-[var(--color-surface)] border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-12 h-full">
        {/* LEFT PANE: CONVERSATION LIST (4 COLS) */}
        <div
          className={`md:col-span-4 border-r border-[var(--color-border)] flex flex-col h-full min-h-0 bg-[var(--color-surface)] ${
            selectedConvId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* SEARCH INPUT AT TOP */}
          <div className="shrink-0 p-3.5 border-b border-[var(--color-border)] bg-[var(--color-background)]/50">
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] transition-colors"
              />
            </div>
          </div>

          {/* CONVERSATION ITEMS SCROLL LIST */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-[var(--color-border)]">
            {loading ? (
              <div className="p-8 text-center text-xs font-mono text-[var(--color-text-secondary)] space-y-2">
                <Sparkles className="w-5 h-5 text-[var(--color-accent-cyan)] animate-spin mx-auto" />
                <p>Loading conversations...</p>
              </div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedConvId;
                const pIds = conv.participantIds || [];
                const oId = pIds.find((id) => id !== clientId) || '';
                const prof = participantProfiles[oId];

                const name =
                  prof?.displayName ||
                  prof?.companyName ||
                  conv.participantNames?.[oId] ||
                  'Specialist';

                const avatar =
                  prof?.avatarInitials ||
                  (name ? name.slice(0, 2).toUpperCase() : 'AI');

                const unread = conv.id === selectedConvId ? 0 : (Number(conv.unreadCount?.[clientId]) || 0);

                // Presence status for list item
                let dateVal: any = prof?.lastActiveAt;
                let isOnline = false;
                if (dateVal) {
                  let d: Date | null = null;
                  if (typeof dateVal.toDate === 'function') d = dateVal.toDate();
                  else if (dateVal.seconds) d = new Date(dateVal.seconds * 1000);
                  else if (typeof dateVal === 'string' || typeof dateVal === 'number') d = new Date(dateVal);
                  if (d && !isNaN(d.getTime())) {
                    isOnline = Date.now() - d.getTime() < 180000;
                  }
                }

                // Format timestamp
                let formattedTime = '';
                if (conv.updatedAt || conv.lastMessageAt) {
                  const date = new Date(conv.updatedAt || conv.lastMessageAt!);
                  formattedTime = date.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                }

                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      if (conv.id) {
                        setSelectedConvId(conv.id);
                        navigate(`/client/messages?convId=${conv.id}`);
                      }
                    }}
                    className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors relative ${
                      isSelected
                        ? 'bg-[var(--color-accent-cyan)]/10 border-l-4 border-l-[var(--color-accent-cyan)]'
                        : 'hover:bg-[var(--color-background)]/60'
                    }`}
                  >
                    {/* AVATAR WITH ONLINE BADGE */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-[var(--color-background)] border border-[var(--color-accent-cyan)]/50 text-[var(--color-accent-cyan)] flex items-center justify-center font-mono font-bold text-xs overflow-hidden">
                        {prof?.avatarUrl ? (
                          <img src={prof.avatarUrl} alt={name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          avatar
                        )}
                      </div>
                      <span
                        className={`w-2.5 h-2.5 rounded-full absolute bottom-0 right-0 border-2 border-[var(--color-surface)] ${
                          isOnline ? 'bg-[var(--color-success-green)] animate-pulse' : 'bg-slate-500'
                        }`}
                      />
                    </div>

                    {/* TEXT METADATA */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                          {name}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--color-text-secondary)] shrink-0">
                          {formattedTime}
                        </span>
                      </div>

                      <p className="text-xs text-[var(--color-text-secondary)] truncate font-sans">
                        {conv.lastMessage || 'Start a conversation...'}
                      </p>
                    </div>

                    {/* UNREAD COUNT BADGE */}
                    {unread > 0 && (
                      <div className="w-5 h-5 rounded-full bg-[var(--color-accent-cyan)] text-slate-950 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                        {unread}
                      </div>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-4">
                <EmptyState
                  icon={MessageSquare}
                  title="No active conversations"
                  description="Start chatting with AI specialists from your project workspace or candidate profiles."
                  actionLabel="Find Talent"
                  onAction={() => navigate('/client/find-talent')}
                />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: ACTIVE THREAD (8 COLS) */}
        <div
          className={`md:col-span-8 flex flex-col h-full min-h-0 bg-[var(--color-background)] ${
            !selectedConvId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* THREAD HEADER */}
              <div className="shrink-0 p-3.5 px-5 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* MOBILE BACK BUTTON */}
                  <button
                    onClick={() => setSelectedConvId('')}
                    className="md:hidden p-1.5 rounded hover:bg-[var(--color-background)] text-[var(--color-text-secondary)]"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  {/* CLICKABLE AVATAR -> OPENS PROFILE MODAL */}
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(true)}
                    className="relative shrink-0 group focus:outline-none"
                    title="Click to view full profile"
                  >
                    <div className="w-10 h-10 rounded-full bg-[var(--color-background)] border-2 border-[var(--color-accent-cyan)]/60 text-[var(--color-accent-cyan)] flex items-center justify-center font-mono font-bold text-xs shadow-[0_0_10px_rgba(6,182,212,0.15)] group-hover:scale-105 transition-transform overflow-hidden">
                      {otherProfile?.avatarUrl ? (
                        <img src={otherProfile.avatarUrl} alt={otherParticipantName} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        otherParticipantAvatar
                      )}
                    </div>
                    <span
                      className={`w-2.5 h-2.5 rounded-full absolute bottom-0 right-0 border-2 border-[var(--color-surface)] ${
                        otherPresence.isOnline
                          ? 'bg-[var(--color-success-green)] animate-pulse'
                          : 'bg-slate-500'
                      }`}
                    />
                  </button>

                  {/* CLICKABLE NAME -> OPENS PROFILE MODAL */}
                  <div className="min-w-0 cursor-pointer" onClick={() => setIsProfileModalOpen(true)}>
                    <h2 className="text-sm font-bold text-[var(--color-text-primary)] hover:text-[var(--color-accent-cyan)] transition-colors flex items-center gap-2 flex-wrap">
                      <span className="truncate">{otherParticipantName}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/30 font-semibold shrink-0">
                        SYMBIOTE Verified
                      </span>
                    </h2>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--color-text-secondary)]">
                      <span className="truncate max-w-[180px] sm:max-w-xs">{otherParticipantTitle}</span>
                      <span>·</span>
                      <span
                        className={
                          otherPresence.isOnline
                            ? 'text-emerald-400 font-semibold'
                            : 'text-[var(--color-text-secondary)]'
                        }
                      >
                        {otherPresence.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* THREAD HEADER CONTROLS & LINKED PROJECT BADGE */}
                <div className="flex items-center gap-2 shrink-0 relative">
                  {/* VIDEO CALL BUTTON (Temporarily hidden) */}
                  {false && (
                    <button
                      type="button"
                      onClick={() => setActiveCallType('video')}
                      className="p-2 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-colors cursor-pointer"
                      title={`Start Secure Video Call with ${otherParticipantName}`}
                    >
                      <Video className="w-4 h-4" />
                    </button>
                  )}

                  {/* AUDIO CALL BUTTON (Temporarily hidden) */}
                  {false && (
                    <button
                      type="button"
                      onClick={() => setActiveCallType('audio')}
                      className="p-2 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-colors cursor-pointer"
                      title={`Start Audio Call with ${otherParticipantName}`}
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  )}

                  {activeProject && (
                    <button
                      type="button"
                      onClick={() => navigate(`/client/projects/${activeProject.id}`)}
                      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs text-slate-300 hover:border-cyan-500 hover:text-cyan-400 transition-colors"
                      title="Open linked project details"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="font-semibold max-w-[120px] truncate">{activeProject.title}</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </button>
                  )}

                  {/* KEBAB DROPDOWN MENU */}
                  <div className="relative">
                    <button
                      onClick={() => setShowKebabMenu(!showKebabMenu)}
                      className="p-2 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {showKebabMenu && (
                      <div className="absolute right-0 top-11 w-48 rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl z-30 py-1 font-mono text-xs text-[var(--color-text-primary)]">
                        <button
                          onClick={() => {
                            setShowKebabMenu(false);
                            setIsProfileModalOpen(true);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-[var(--color-background)] flex items-center gap-2"
                        >
                          <User className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
                          <span>View Profile</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowKebabMenu(false);
                            setToastNotification('Thread notifications muted.');
                            setTimeout(() => setToastNotification(null), 3000);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-[var(--color-background)] flex items-center gap-2"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Mute Notifications</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* LINKED PROJECT BANNER BELOW HEADER (IF LINKED) */}
              {activeProject && (
                <div className="shrink-0 px-4 py-2 bg-slate-900/90 border-b border-[var(--color-border)] flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-2 truncate">
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono font-bold uppercase">
                      Linked Project
                    </span>
                    <span className="font-bold text-white truncate">{activeProject.title}</span>
                    <span className="text-slate-400 font-mono hidden sm:inline">
                      Budget: {formatProjectBudget(activeProject)}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => navigate(`/client/projects/${activeProject.id}`)}
                    className="text-cyan-400 hover:text-cyan-300 font-mono text-[11px] shrink-0"
                  >
                    View Project
                  </Button>
                </div>
              )}

              {/* MESSAGE SCROLL CONTAINER */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6">
                {groupedMessages.map((group) => (
                  <div key={group.dateLabel} className="space-y-4">
                    {/* DATE DIVIDER PILL */}
                    <div className="flex items-center justify-center">
                      <span className="px-3 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] font-mono text-[var(--color-text-secondary)] shadow-sm">
                        {group.dateLabel}
                      </span>
                    </div>

                    {/* MESSAGES IN DATE GROUP */}
                    {group.msgs.map((msg) => {
                      const isOutgoing = msg.senderId === clientId;

                      return (
                        <div
                          key={msg.id || msg.sentAt}
                          className={`flex items-end gap-2.5 ${
                            isOutgoing ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {/* INCOMING SENDER AVATAR */}
                          {!isOutgoing && (
                            <button
                              type="button"
                              onClick={() => setIsProfileModalOpen(true)}
                              className="shrink-0 mb-1 hover:scale-105 transition-transform"
                            >
                              <Avatar
                                name={otherParticipantName}
                                src={otherProfile?.avatarUrl}
                                initials={otherParticipantAvatar}
                                size="sm"
                              />
                            </button>
                          )}

                          {/* MESSAGE BUBBLE */}
                          <div
                            className={`max-w-[80%] sm:max-w-[70%] space-y-1.5 p-3.5 rounded-[14px] shadow-sm ${
                              isOutgoing
                                ? 'bg-gradient-to-r from-[var(--color-accent-cyan)] to-emerald-400 text-slate-950 rounded-br-xs font-medium'
                                : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-bl-xs'
                            }`}
                          >
                            {/* TEXT CONTENT */}
                            {msg.text && (
                              <p className="text-xs leading-relaxed whitespace-pre-wrap break-words font-sans">
                                {msg.text}
                              </p>
                            )}

                            {/* ATTACHMENTS PREVIEW */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                {msg.attachments.map((att, idx) => (
                                  <button
                                    type="button"
                                    key={idx}
                                    onClick={() => triggerFileDownload(att.url, att.name)}
                                    className={`w-full text-left p-2.5 rounded-[8px] flex items-center justify-between gap-3 text-xs font-mono transition-colors cursor-pointer ${
                                      isOutgoing
                                        ? 'bg-slate-950/20 hover:bg-slate-950/30 text-slate-950 border border-slate-950/20'
                                        : 'bg-[var(--color-background)] hover:bg-[var(--color-background)]/80 text-[var(--color-text-primary)] border border-[var(--color-border)]'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <File className="w-4 h-4 shrink-0" />
                                      <span className="truncate font-semibold">{att.name}</span>
                                    </div>
                                    <span className="text-[10px] shrink-0 opacity-80">
                                      {att.size || 'File'}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* TIMESTAMP + READ INDICATOR */}
                            <div
                              className={`flex items-center justify-end gap-1 text-[9px] font-mono ${
                                isOutgoing ? 'text-slate-900/80' : 'text-[var(--color-text-secondary)]'
                              }`}
                            >
                              <span>
                                {new Date(msg.sentAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {isOutgoing && <CheckCheck className="w-3 h-3 text-slate-950" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* LIVE IS TYPING INDICATOR ROW */}
                {isOtherTyping && (
                  <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-accent-cyan)] animate-pulse pl-1">
                    <div className="flex items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-accent-cyan)]/30 px-3 py-1.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-cyan)] animate-ping" />
                      <span>{otherParticipantName} is typing...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* PENDING ATTACHMENTS PREVIEW CHIPS */}
              {pendingAttachments.length > 0 && (
                <div className="shrink-0 px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex flex-wrap gap-2">
                  {pendingAttachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1 rounded-full bg-[var(--color-background)] border border-[var(--color-accent-cyan)]/50 text-[var(--color-accent-cyan)] text-xs font-mono flex items-center gap-2"
                    >
                      <Paperclip className="w-3 h-3" />
                      <span className="max-w-[140px] truncate">{att.name}</span>
                      <button
                        onClick={() => removePendingAttachment(idx)}
                        className="hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* INPUT BAR OR COMPLETED ARCHIVE NOTICE */}
              {activeProject?.status === 'completed' ? (
                <div className="shrink-0 p-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] text-center text-xs font-mono text-[var(--color-text-secondary)] flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>This project is 100% completed & archived. Thread messages are preserved in read-only mode.</span>
                </div>
              ) : (
                <form
                  onSubmit={handleSendMessage}
                  className="shrink-0 p-3.5 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex items-center gap-2"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    multiple
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach File or Document"
                    className="p-2.5 rounded-[10px] bg-[var(--color-background)] border border-[var(--color-border)] hover:border-[var(--color-accent-cyan)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] transition-colors shrink-0"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    placeholder={`Message ${otherParticipantName}...`}
                    value={messageText}
                    onChange={handleInputChange}
                    className="flex-1 h-11 px-4 rounded-[10px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] transition-colors"
                  />

                  <Button
                    type="submit"
                    disabled={(!messageText.trim() && pendingAttachments.length === 0) || sending}
                    className="w-11 h-11 rounded-full bg-gradient-to-r from-[var(--color-accent-cyan)] to-emerald-400 text-slate-950 font-bold p-0 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <MessageSquare className="w-12 h-12 text-[var(--color-accent-cyan)]/40 animate-pulse" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Select a Conversation
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] font-mono max-w-sm">
                  Choose an active specialist thread from the left pane to view messages or initiate a new project conversation.
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* USER PROFILE MODAL */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userId={otherParticipantId}
        initialProfile={otherProfile}
        conversationId={selectedConvId}
        returnTo={`/client/messages?convId=${selectedConvId}`}
        projectId={activeProject?.id}
      />

      {/* ACTIVE VIDEO / AUDIO CALL MODAL (Issue #5) */}
      {activeCallType && (
        <ActiveCallModal
          isOpen={!!activeCallType}
          onClose={() => setActiveCallType(null)}
          callType={activeCallType}
          peerName={otherParticipantName}
          peerAvatar={otherProfile?.avatarUrl}
          peerRole="Symbiote Specialist"
          projectName={activeProject?.title}
        />
      )}
    </div>
  );
};
