import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Avatar } from '@/src/components/ui/avatar';
import { useAuth } from '@/src/context/AuthContext';
import { Conversation, Message, ChatAttachment, Project, ProjectFile, UserProfile } from '@/src/types/firestore';
import {
  subscribeToUserConversations,
  subscribeToMessages,
  sendMessage,
  markConversationAsRead,
  setTypingStatus,
  createConversation,
} from '@/src/lib/firestore/conversations';
import { subscribeToProjectById, getProjects } from '@/src/lib/firestore/projects';
import {
  subscribeToProjectFilesForProject,
  createProjectFile,
} from '@/src/lib/firestore/projectFiles';
import { subscribeToUserProfile } from '@/src/lib/firestore/users';
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
  CheckCheck,
  X,
  Clock,
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  FileCode,
  Download,
  ChevronRight,
  Plus,
  Briefcase,
  Sparkles,
  Video,
  Phone,
  Lock,
} from 'lucide-react';

export const SymbioteMessagingPage: React.FC = () => {
  const { firebaseUser, userProfile } = useAuth();
  const uid = firebaseUser?.uid || '';
  const symbioteName =
    userProfile?.displayName ||
    (userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : 'AI Specialist');

  const navigate = useNavigate();
  const routeParams = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();

  // Active conversation ID & Query params
  const activeConvIdFromUrl = routeParams.conversationId || searchParams.get('convId') || '';
  const initialClientId = searchParams.get('client') || '';
  const initialProjectId = searchParams.get('projectId') || '';

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
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);

  // Kebab Menu, Profile Modal & Toast
  const [showKebabMenu, setShowKebabMenu] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Active Video / Audio Call State (Issue #5)
  const [activeCallType, setActiveCallType] = useState<'audio' | 'video' | null>(null);

  // Participant User Profiles Map (cached/subscribed)
  const [participantProfiles, setParticipantProfiles] = useState<Record<string, UserProfile>>({});

  // Project Info Sidebar State
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);

  // Refs
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sidebarFileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Handle Client query parameter (Initiate/Open conversation)
  useEffect(() => {
    if (!uid || !initialClientId) return;

    const handleInitiate = async () => {
      try {
        const convId = await createConversation([uid, initialClientId], initialProjectId || undefined, {
          participantNames: { [uid]: symbioteName },
        });
        if (convId) {
          setSelectedConvId(convId);
        }
      } catch (err) {
        console.error('Error initiating conversation with client:', err);
      }
    };

    handleInitiate();
  }, [uid, initialClientId, initialProjectId, symbioteName]);

  // 2. Subscribe to Real User Conversations
  useEffect(() => {
    if (!uid) return;
    setLoading(true);

    const unsub = subscribeToUserConversations(uid, (convList) => {
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
  }, [uid]);

  // Handle URL route changes
  useEffect(() => {
    if (activeConvIdFromUrl) {
      setSelectedConvId(activeConvIdFromUrl);
    }
  }, [activeConvIdFromUrl]);

  // Active Selected Conversation Object
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConvId) || conversations[0] || null;
  }, [conversations, selectedConvId]);

  // Client (Other Participant) Info
  const clientParticipantId = useMemo(() => {
    if (!activeConversation) return '';
    return activeConversation.participantIds.find((id) => id !== uid) || '';
  }, [activeConversation, uid]);

  // 3. Subscribe to Real User Profiles for All Participants
  useEffect(() => {
    if (conversations.length === 0) return;

    const allOtherIds = new Set<string>();
    conversations.forEach((conv) => {
      conv.participantIds.forEach((id) => {
        if (id && id !== uid) allOtherIds.add(id);
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
  }, [conversations, uid]);

  // Client Profile details
  const clientProfile = participantProfiles[clientParticipantId] || null;

  const clientName = useMemo(() => {
    if (clientProfile) {
      return (
        clientProfile.companyName ||
        clientProfile.displayName ||
        (clientProfile.firstName ? `${clientProfile.firstName} ${clientProfile.lastName || ''}`.trim() : '') ||
        'Client'
      );
    }
    if (activeConversation?.participantNames?.[clientParticipantId]) {
      return activeConversation.participantNames[clientParticipantId];
    }
    return 'Client';
  }, [clientProfile, activeConversation, clientParticipantId]);

  const clientAvatar = useMemo(() => {
    if (clientProfile?.avatarInitials) return clientProfile.avatarInitials;
    if (clientName) return clientName.slice(0, 2).toUpperCase();
    return 'CL';
  }, [clientProfile, clientName]);

  const clientTitle = useMemo(() => {
    if (clientProfile?.jobTitle || clientProfile?.title || clientProfile?.companyName) {
      return clientProfile.jobTitle || clientProfile.title || `${clientProfile.companyName} Representative`;
    }
    if (activeConversation?.participantTitles?.[clientParticipantId]) {
      return activeConversation.participantTitles[clientParticipantId];
    }
    return 'Client Owner';
  }, [clientProfile, activeConversation, clientParticipantId]);

  // Compute presence status from lastActiveAt
  const clientPresence = useMemo(() => {
    if (!clientProfile?.lastActiveAt) {
      return { isOnline: false, label: 'Offline' };
    }
    let date: Date | null = null;
    const val: any = clientProfile.lastActiveAt;
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
  }, [clientProfile]);

  // 4. Subscribe to Real Project Object for Right Sidebar
  const activeProjectId = activeConversation?.projectId || initialProjectId;

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
    } else if (uid && clientParticipantId) {
      // Find any project matching symbiote + client pair
      getProjects().then((projs) => {
        const match = projs.find(
          (p) =>
            (p.ownerId === clientParticipantId || p.clientId === clientParticipantId) &&
            (p.assignedSymbioteId === uid || (p.teamMembers && p.teamMembers.some((m) => typeof m === 'string' ? m === uid : m.uid === uid)))
        );
        if (match) {
          setActiveProject(match);
        } else {
          setActiveProject(null);
        }
      });
    } else {
      setActiveProject(null);
    }
  }, [activeProjectId, uid, clientParticipantId]);

  // 5. Subscribe to Shared Project Files
  useEffect(() => {
    if (!activeProject?.id) {
      setProjectFiles([]);
      return;
    }

    const unsubFiles = subscribeToProjectFilesForProject(activeProject.id, (filesList) => {
      setProjectFiles(filesList);
    });

    return () => unsubFiles();
  }, [activeProject?.id]);

  // Handle Sidebar File Upload
  const handleSidebarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeProject?.id) return;

    setUploadingFile(true);
    try {
      for (const file of Array.from(files)) {
        const fileObj = file as File;
        const sizeMB = (fileObj.size / (1024 * 1024)).toFixed(1);
        const formattedSize = fileObj.size > 1024 * 1024 ? `${sizeMB} MB` : `${Math.round(fileObj.size / 1024)} KB`;

        const uploadRes = await uploadFileToCloudinary(fileObj, {
          projectId: activeProject.id,
          folder: `syncsphere/projects/${activeProject.id}`,
          fileName: fileObj.name,
        });

        await createProjectFile({
          projectId: activeProject.id,
          name: fileObj.name,
          size: formattedSize,
          sizeBytes: uploadRes.bytes || fileObj.size,
          type: fileObj.type || 'document',
          uploadedBy: symbioteName,
          category: 'deliverables',
          uploadedAt: new Date().toISOString(),
          downloadUrl: uploadRes.url,
        });
      }
      setToastNotification('File uploaded to project workspace via Cloudinary.');
      setTimeout(() => setToastNotification(null), 3000);
    } catch (err) {
      console.error('Error uploading file to Cloudinary:', err);
      setToastNotification('Upload failed. Please retry.');
      setTimeout(() => setToastNotification(null), 3000);
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  // 6. Subscribe to Messages in Active Thread
  useEffect(() => {
    if (!selectedConvId || !uid) {
      setMessages([]);
      return;
    }

    markConversationAsRead(selectedConvId, uid);

    const unsub = subscribeToMessages(selectedConvId, (msgList) => {
      setMessages(msgList);
      markConversationAsRead(selectedConvId, uid);
    });

    return () => unsub();
  }, [selectedConvId, uid]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typing Indicator Detection
  const isOtherTyping = useMemo(() => {
    if (!activeConversation || !clientParticipantId) return false;
    const typingTime = activeConversation.typing?.[clientParticipantId];
    if (!typingTime) return false;
    return Date.now() - typingTime < 4000;
  }, [activeConversation, clientParticipantId]);

  // Handle Keystrokes & Typing Indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);

    if (!selectedConvId || !uid) return;

    setTypingStatus(selectedConvId, uid, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (selectedConvId) {
        setTypingStatus(selectedConvId, uid, false);
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
      await sendMessage(selectedConvId, uid, textToSend, attachmentsToSend, symbioteName);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      await setTypingStatus(selectedConvId, uid, false);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  // Handle File Upload Attachment with Cloudinary
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
      const oId = pIds.find((id) => id !== uid) || '';
      const prof = participantProfiles[oId];
      const name = prof?.companyName || prof?.displayName || conv.participantNames?.[oId] || '';
      const title = prof?.jobTitle || prof?.title || conv.participantTitles?.[oId] || '';
      const lastMsg = conv.lastMessage || '';

      return (
        name.toLowerCase().includes(q) ||
        title.toLowerCase().includes(q) ||
        lastMsg.toLowerCase().includes(q)
      );
    });
  }, [conversations, searchQuery, uid, participantProfiles]);

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
          <div className="p-2 rounded-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">
              Client Workspace Messaging
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] font-mono">
              Direct project messaging & client communication.
            </p>
          </div>
        </div>

        {toastNotification && (
          <div className="px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-mono animate-fadeIn flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{toastNotification}</span>
          </div>
        )}
      </div>

      {/* THREE-COLUMN GRID (CONVERSATIONS, CHAT, PROJECT INFO) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
        {/* COLUMN 1 & 2: CONVERSATION LIST + ACTIVE THREAD (lg:col-span-9) */}
        <Card className="lg:col-span-9 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-12 h-full min-h-0">
          {/* LEFT PANE: CONVERSATION LIST (4 COLS) */}
          <div
            className={`md:col-span-4 border-r border-[var(--color-border)] flex flex-col h-full min-h-0 bg-[var(--color-surface)] ${
              selectedConvId ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* SEARCH INPUT */}
            <div className="shrink-0 p-3.5 border-b border-[var(--color-border)] bg-[var(--color-background)]/50">
              <div className="relative">
                <Search className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-primary)] focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* CONVERSATIONS LIST */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-[var(--color-border)]">
              {loading ? (
                <div className="p-8 text-center text-xs font-mono text-[var(--color-text-secondary)] space-y-2">
                  <Sparkles className="w-5 h-5 text-emerald-400 animate-spin mx-auto" />
                  <p>Loading conversations...</p>
                </div>
              ) : filteredConversations.length > 0 ? (
                filteredConversations.map((conv) => {
                  const isSelected = conv.id === selectedConvId;
                  const pIds = conv.participantIds || [];
                  const oId = pIds.find((id) => id !== uid) || '';
                  const prof = participantProfiles[oId];

                  const name =
                    prof?.companyName ||
                    prof?.displayName ||
                    conv.participantNames?.[oId] ||
                    'Client';

                  const avatar =
                    prof?.avatarInitials ||
                    (name ? name.slice(0, 2).toUpperCase() : 'CL');

                  const unread = conv.id === selectedConvId ? 0 : (Number(conv.unreadCount?.[uid]) || 0);

                  // Presence
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
                          navigate(`/symbiote/messages?convId=${conv.id}`);
                        }
                      }}
                      className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors relative ${
                        isSelected
                          ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500'
                          : 'hover:bg-[var(--color-background)]/60'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-[var(--color-background)] border border-emerald-500/50 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs overflow-hidden">
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

                      {unread > 0 && (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
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
                    title="No active client threads"
                    description="When clients message you or invite you to projects, conversation threads will appear here."
                    actionLabel="View Workspaces"
                    onAction={() => navigate('/symbiote/dashboard')}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ACTIVE THREAD CONTAINER (8 COLS) */}
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
                    <button
                      onClick={() => setSelectedConvId('')}
                      className="md:hidden p-1.5 rounded hover:bg-[var(--color-background)] text-[var(--color-text-secondary)]"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    {/* CLICKABLE AVATAR -> OPENS CLIENT PROFILE MODAL */}
                    <button
                      type="button"
                      onClick={() => setIsProfileModalOpen(true)}
                      className="relative shrink-0 group focus:outline-none"
                      title="Click to view client profile"
                    >
                      <div className="w-10 h-10 rounded-full bg-[var(--color-background)] border-2 border-emerald-500/60 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
                        {clientProfile?.avatarUrl ? (
                          <img src={clientProfile.avatarUrl} alt={clientName} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          clientAvatar
                        )}
                      </div>
                      <span
                        className={`w-2.5 h-2.5 rounded-full absolute bottom-0 right-0 border-2 border-[var(--color-surface)] ${
                          clientPresence.isOnline
                            ? 'bg-[var(--color-success-green)] animate-pulse'
                            : 'bg-slate-500'
                        }`}
                      />
                    </button>

                    {/* CLICKABLE NAME -> OPENS CLIENT PROFILE MODAL */}
                    <div className="min-w-0 cursor-pointer" onClick={() => setIsProfileModalOpen(true)}>
                      <h2 className="text-sm font-bold text-[var(--color-text-primary)] hover:text-emerald-400 transition-colors flex items-center gap-2 flex-wrap">
                        <span className="truncate">{clientName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold shrink-0">
                          Verified Client
                        </span>
                      </h2>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--color-text-secondary)]">
                        <span className="truncate max-w-[180px] sm:max-w-xs">{clientTitle}</span>
                        <span>·</span>
                        <span
                          className={
                            clientPresence.isOnline
                              ? 'text-emerald-400 font-semibold'
                              : 'text-[var(--color-text-secondary)]'
                          }
                        >
                          {clientPresence.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* HEADER ACTIONS */}
                  <div className="flex items-center gap-2 shrink-0 relative">
                    {/* VIDEO CALL BUTTON (Temporarily hidden) */}
                    {false && (
                      <button
                        type="button"
                        onClick={() => setActiveCallType('video')}
                        className="p-2 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-colors cursor-pointer"
                        title={`Start Secure Video Call with ${clientName}`}
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
                        title={`Start Audio Call with ${clientName}`}
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                    )}

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
                            <User className="w-3.5 h-3.5 text-emerald-400" />
                            <span>View Client Profile</span>
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

                {/* MESSAGES SCROLL CONTAINER */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6">
                  {groupedMessages.map((group) => (
                    <div key={group.dateLabel} className="space-y-4">
                      <div className="flex items-center justify-center">
                        <span className="px-3 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] font-mono text-[var(--color-text-secondary)] shadow-sm">
                          {group.dateLabel}
                        </span>
                      </div>

                      {group.msgs.map((msg) => {
                        const isOutgoing = msg.senderId === uid;

                        return (
                          <div
                            key={msg.id || msg.sentAt}
                            className={`flex items-end gap-2.5 ${
                              isOutgoing ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            {!isOutgoing && (
                              <button
                                type="button"
                                onClick={() => setIsProfileModalOpen(true)}
                                className="shrink-0 mb-1 hover:scale-105 transition-transform"
                              >
                                <Avatar
                                  name={clientName}
                                  src={clientProfile?.avatarUrl}
                                  initials={clientAvatar}
                                  size="sm"
                                />
                              </button>
                            )}

                            <div
                              className={`max-w-[80%] sm:max-w-[70%] space-y-1.5 p-3.5 rounded-[14px] shadow-sm ${
                                isOutgoing
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 rounded-br-xs font-medium'
                                  : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-bl-xs'
                              }`}
                            >
                              {msg.text && (
                                <p className="text-xs leading-relaxed whitespace-pre-wrap break-words font-sans">
                                  {msg.text}
                                </p>
                              )}

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
                                        <FileText className="w-4 h-4 shrink-0" />
                                        <span className="truncate font-semibold">{att.name}</span>
                                      </div>
                                      <span className="text-[10px] shrink-0 opacity-80">
                                        {att.size || 'File'}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}

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

                  {isOtherTyping && (
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 animate-pulse pl-1">
                      <div className="flex items-center gap-1 bg-[var(--color-surface)] border border-emerald-500/30 px-3 py-1.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>{clientName} is typing...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* PENDING ATTACHMENTS PREVIEW */}
                {pendingAttachments.length > 0 && (
                  <div className="shrink-0 px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex flex-wrap gap-2">
                    {pendingAttachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="px-2.5 py-1 rounded-full bg-[var(--color-background)] border border-emerald-500/50 text-emerald-400 text-xs font-mono flex items-center gap-2"
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

                {/* COMPOSER FORM OR ARCHIVED NOTICE */}
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
                      title="Attach File"
                      className="p-2.5 rounded-[10px] bg-[var(--color-background)] border border-[var(--color-border)] hover:border-emerald-500 text-[var(--color-text-secondary)] hover:text-emerald-400 transition-colors shrink-0"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    <input
                      type="text"
                      placeholder={`Message ${clientName}...`}
                      value={messageText}
                      onChange={handleInputChange}
                      className="flex-1 h-11 px-4 rounded-[10px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-primary)] focus:outline-none focus:border-emerald-500 transition-colors"
                    />

                    <Button
                      type="submit"
                      disabled={(!messageText.trim() && pendingAttachments.length === 0) || sending}
                      className="w-11 h-11 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold p-0 flex items-center justify-center shrink-0 shadow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <MessageSquare className="w-12 h-12 text-[var(--color-text-secondary)] opacity-40" />
                <h3 className="text-body font-bold text-[var(--color-text-primary)]">
                  No Active Conversation Selected
                </h3>
                <p className="text-caption text-[var(--color-text-secondary)] max-w-xs">
                  Select a client thread from the left list to view messages or start communicating.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* COLUMN 3: RIGHT PROJECT INFO SIDEBAR (lg:col-span-3) */}
        <Card className="lg:col-span-3 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] flex flex-col h-full min-h-0 overflow-hidden shadow-sm">
          {/* SIDEBAR HEADER */}
          <div className="p-3.5 border-b border-[var(--color-border)] bg-[var(--color-background)] shrink-0">
            <h3 className="text-body font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <span>Project Details</span>
            </h3>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-5">
            {/* PROJECT OVERVIEW CARD */}
            {activeProject ? (
              <div className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] space-y-3">
                <div className="space-y-1">
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                    {activeProject.status || 'In Progress'}
                  </span>
                  <h4 className="text-body font-bold text-[var(--color-text-primary)] pt-1">
                    {activeProject.title}
                  </h4>
                </div>

                {/* PROGRESS % BAR */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-caption font-semibold">
                    <span className="text-[var(--color-text-secondary)]">Progress</span>
                    <span className="text-emerald-400 font-mono">{activeProject.progress || 60}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--color-surface)] overflow-hidden border border-[var(--color-border)]">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${activeProject.progress || 60}%` }}
                    />
                  </div>
                </div>

                {/* DUE DATE & BUDGET */}
                <div className="grid grid-cols-2 gap-2 text-caption pt-1 border-t border-[var(--color-border)]">
                  <div>
                    <span className="text-[11px] text-[var(--color-text-secondary)] block">Target Due</span>
                    <span className="font-semibold text-[var(--color-text-primary)] font-mono">
                      {activeProject.dueDate ? new Date(activeProject.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Flexible'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[var(--color-text-secondary)] block">Budget</span>
                    <span className="font-semibold text-emerald-400 font-mono">
                      {formatProjectBudget(activeProject)}
                    </span>
                  </div>
                </div>

                {/* OPEN WORKSPACE LINK */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/symbiote/workspace/${activeProject.id}`)}
                  className="w-full text-caption font-semibold py-1.5 border-[var(--color-border)] hover:border-emerald-500 hover:text-emerald-400 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Open Full Workspace</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-center text-caption text-[var(--color-text-secondary)]">
                No active project details tied to this thread.
              </div>
            )}

            {/* MINI SHARED FILES LIST */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                <h4 className="text-caption font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Shared Files ({projectFiles.length})</span>
                </h4>

                {activeProject && (
                  <button
                    type="button"
                    onClick={() => sidebarFileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-semibold flex items-center gap-1 transition-all"
                    title="Upload file to project"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Upload</span>
                  </button>
                )}

                <input
                  type="file"
                  ref={sidebarFileInputRef}
                  onChange={handleSidebarFileUpload}
                  className="hidden"
                />
              </div>

              {projectFiles.length > 0 ? (
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {projectFiles.map((file) => {
                    const isPdf = file.name.endsWith('.pdf') || file.type?.includes('pdf');
                    const isImage = file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.type?.includes('image');

                    return (
                      <div
                        key={file.id}
                        className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-between gap-2 text-caption hover:border-cyan-500/30 transition-all group"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {isPdf ? (
                            <FileText className="w-4 h-4 text-red-400 shrink-0" />
                          ) : isImage ? (
                            <ImageIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                          ) : (
                            <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[var(--color-text-primary)] truncate" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-[10px] font-mono text-[var(--color-text-secondary)]">
                              {file.size}
                            </p>
                          </div>
                        </div>

                        {file.downloadUrl && file.downloadUrl !== '#' ? (
                          <button
                            type="button"
                            onClick={() => triggerFileDownload(file.downloadUrl, file.name)}
                            className="p-1.5 rounded text-[var(--color-text-secondary)] hover:text-emerald-400 hover:bg-[var(--color-surface)] transition-all shrink-0 cursor-pointer"
                            title="Download file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const textContent = `SyncSphere Document: ${file.name}\nProject ID: ${file.projectId}\nCategory: ${file.category}\nUploaded By: ${file.uploadedBy || 'User'}\nDate: ${file.uploadedAt}`;
                              const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
                              triggerFileDownload(URL.createObjectURL(blob), file.name);
                            }}
                            className="p-1.5 rounded text-[var(--color-text-secondary)] hover:text-emerald-400 hover:bg-[var(--color-surface)] transition-all shrink-0 cursor-pointer"
                            title="Download file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-center text-caption text-[var(--color-text-secondary)]">
                  No files uploaded for this project yet.
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* USER PROFILE MODAL */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userId={clientParticipantId}
        initialProfile={clientProfile}
        conversationId={selectedConvId}
        returnTo={`/symbiote/messages?convId=${selectedConvId}`}
        projectId={activeProject?.id}
      />

      {/* ACTIVE VIDEO / AUDIO CALL MODAL (Issue #5) */}
      {activeCallType && (
        <ActiveCallModal
          isOpen={!!activeCallType}
          onClose={() => setActiveCallType(null)}
          callType={activeCallType}
          peerName={clientName}
          peerAvatar={clientProfile?.avatarUrl}
          peerRole="Client Principal"
          projectName={activeProject?.title}
        />
      )}
    </div>
  );
};
