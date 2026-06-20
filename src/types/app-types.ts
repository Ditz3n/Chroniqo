// src/types/app-types.ts
import type {
  Comment,
  CommunityRole,
  GlobalRole,
  Prisma,
} from "@prisma/client";

export interface ChroniqoLogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export interface HeroSmileyProps {
  lockedMood: number | null;
  externalCycleValue?: number;
  externalFading?: boolean;
}

export interface HeroProps {
  lockedMood: number | null;
}

export interface TooltipExtraProps {
  className?: string;
  sideOffset?: number;
}

export interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  delayDuration?: number;
}

export type LoginLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export type GenStep = {
  id: string;
  label?: string;
  status: "pending" | "loading" | "done" | "error";
  error?: string;
};

export interface ReactionUser {
  id: string;
  name: string;
  fullName?: string;
  image?: string | null;
  avatarEmoji?: string | null;
  avatarBgColor?: string | null;
  dailyStatusValue?: number | null;
}

export interface GlobalBan {
  id: string;
  email: string;
}

export interface MessageReaction {
  emoji: string;
  users: ReactionUser[];
}

export interface Message {
  id: string;
  sender: "me" | "them";
  senderName?: string;
  text: string;
  timestamp: Date;
  replyTo?: string; // Text snippet or ID of the replied message
  reactions?: MessageReaction[];
}

export interface ChatConversation {
  id: string;
  name: string; // Usually a comma-separated list of other participants
  lastMessage: string | null;
  timeAgo: string;
  unread: boolean;
  active: boolean; // True if created/updated recently
  verified: boolean;
  lastActive: string;
  expiresAt: Date;
}

export type ApiConversation = {
  id: string;
  name: string | null;
  image: string | null;
  avatarEmoji?: string | null;
  avatarBgColor?: string | null;
  updatedAt: string;
  unreadCount?: number;
  participants: {
    status: string;
    nickname: string | null;
    isMuted?: boolean;
    user: {
      id: string;
      name: string | null;
      username: string | null;
      image: string | null;
      avatarEmoji?: string | null;
      avatarBgColor?: string | null;
      emailVerified?: Date | string | null;
      dailyStatuses?: { value: number }[];
    };
  }[];
  messages: {
    content: string;
    deletedAt?: string | null;
    isSystem?: boolean;
    messageType?: string | null;
  }[];
  isCommunity: boolean;
  communityId: string | null;
  community: {
    id: string;
    name: string;
    image: string | null;
    avatarEmoji: string | null;
    avatarBgColor: string | null;
    mutes?: Array<{
      userId: string;
      reason: string | null;
      expiresAt: string | null;
    }>;
    members: Array<{
      role: "OWNER" | "ADMIN" | "MODERATOR" | "USER";
      userId: string;
      isMuted: boolean;
      anonymousIdentity: {
        displayName: string;
        username: string;
        animalEmoji: string;
        bgColor: string;
      } | null;
      user: {
        id: string;
        name: string | null;
        username: string | null;
        image: string | null;
        avatarEmoji: string | null;
        avatarBgColor: string | null;
        dailyStatuses: Array<{ value: number }>;
        emailVerified?: Date | string | null;
      };
    }>;
  } | null;
};

export type MiniChatLastMessage = ApiConversation["messages"][number] & {
  sender?: {
    name: string | null;
    username: string | null;
  };
};

export interface SearchUser {
  id: string;
  name?: string;
  username?: string;
  image?: string;
  avatarEmoji?: string | null;
  avatarBgColor?: string | null;
  headerImage?: string | null;
  headerEmoji?: string | null;
  headerBgColor?: string | null;
  emailVerified?: Date | string | null;
}

export type ApiReaction = {
  emoji: string;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image?: string | null;
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
    dailyStatuses?: { value: number }[];
    emailVerified?: Date | string | null;
  };
};

export type ApiMessage = {
  id: string;
  content: string;
  createdAt: string;
  deletedAt: string | null;
  replyToId: string | null;
  dailyStatusId: string | null;
  dailyStatus?: {
    id: string;
    value: number;
    note: string | null;
    user: { name: string | null; username: string | null };
  } | null;
  sender: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    emailVerified?: Date | string | null;
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
  };
  reactions: ApiReaction[];
  isSystem: boolean;
  isAnonymous: boolean;
  messageType?: string | null;
  minigameId?: string | null;
};

export interface UIMessage {
  id: string;
  originalSenderId: string;
  sender: "me" | "them";
  senderName: string;
  senderUsername: string | null;
  senderImage?: string | null;
  senderAvatarEmoji?: string | null;
  senderAvatarBgColor?: string | null;
  senderDailyStatusValue?: number | null;
  senderVerified?: boolean;
  text: string;
  timestamp: Date;
  replyTo?: string;
  replyToId?: string;
  replyToStatus?: {
    value: number;
    note: string | null;
    username: string;
  };
  isDeleted: boolean;
  reactions?: { emoji: string; users: ReactionUser[] }[];
  isSystem: boolean;
  isAnonymous: boolean;
  messageType?: string | null;
  minigameId?: string | null;
}

export interface ApiChatData {
  conversation: {
    expiresAt: string;
    deletedByUserId: string | null;
    deletionScheduledAt: string | null;
    isMuted: boolean;
    isCommunity: boolean;
    communityId: string | null;
  };
  messages: ApiMessage[];
}

export interface MiniChatListProps {
  onSelectChat: (id: string) => void;
  onNewMessage: () => void;
}

export interface MiniChatViewProps {
  chatId: string;
  onBack?: () => void;
}

export type ChatView = "list" | "new" | "chat";

export interface MiniNewMessageProps {
  onStartChat: (conversationId: string) => void;
}

export type NewChatModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (users: SearchUser[], durationHours: 24 | 48 | 72) => void;
};

export interface MessagesSidebarProps {
  onNewPendingChat?: (user: SearchUser) => void;
  onSelectChat: (id: string) => void;
  selectedChatId: string | null;
}

export interface ChatViewProps {
  chatId: string | null;
  onBack: () => void;
  pendingUser?: SearchUser;
  onConversationCreated?: (id: string) => void;
}

export interface ChatInfoSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string | null;
  conversationMeta?: {
    expiresAt: string;
    deletedByUserId: string | null;
    deletionScheduledAt: string | null;
  };
  onMutate: () => void;
  disabled?: boolean;
}

export interface NoteUser {
  id: number;
  username: string;
  note: string;
  hasNote: boolean;
  statusValue: number;
}

export interface CarouselStatus {
  id: string;
  value: number;
  note: string | null;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
    emailVerified?: Date | string | null;
  };
}

export type SaveState = "idle" | "success" | "error" | "reset";

export interface DailyStatusData {
  id: string;
  userId: string;
  value: number;
  note: string | null;
  date: string;
}

export interface DailyStatusEditorProps {
  dateStr: string; // YYYY-MM-DD
  displayDate: string; // E.g., "12th March 2026"
  initialData?: DailyStatusData;
  onClose: () => void;
  onSaved: () => void; // fires immediately on successful save (for calendar refresh)
  onSuccess: () => void; // fires after feedback animation (for closing)
}

export interface UserProfile {
  id: string;
  name: string | null;
  username: string | null;
  role: "USER" | "ADMIN";
  image: string | null;
  headerImage: string | null;
  avatarEmoji?: string | null;
  avatarBgColor?: string | null;
  headerEmoji?: string | null;
  headerBgColor?: string | null;
  bio: string | null;
  isPrivate: boolean;
  isBlockedByMe: boolean;
  hasBlockedMe: boolean;
  pinnedPostId: string | null;
  messagingPermission: "ALL" | "ONLY_FRIENDS" | "NONE";
  createdAt: string;
  currentMood: {
    id: string;
    value: number;
    note: string | null;
    user: { name: string | null; username: string | null };
  } | null;
  stats: {
    friends: number;
    posts: number;
    comments: number;
    supports: number;
  };
  relationshipStatus:
    | "NONE"
    | "FRIENDS"
    | "REQUEST_SENT"
    | "REQUEST_RECEIVED"
    | "SELF";
  emailVerified?: Date | string | null;
  email?: string | null;
  usernameChangedAt?: string | null;
  gender?: string | null;
  age?: number | null;
  height?: number | null;
  heightUnit?: string | null;
  weight?: number | null;
  weightUnit?: string | null;
  conditions?: string[];
  medications?: string[];
  birthDate?: string | null;
  autoUpdateAge?: boolean;
  showConditions?: boolean;
  showMedications?: boolean;
  showAge?: boolean;
  showHeight?: boolean;
  showWeight?: boolean;
  globalMute?: { reason: string | null; expiresAt: string | null } | null;
}

export interface SessionUpdatePayload {
  image?: string | null;
  avatarEmoji?: string | null;
  avatarBgColor?: string | null;
  onboarded?: boolean;
  username?: string | null;
  hasPassword?: boolean;
}

export interface ProfileHeaderProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  onUpdate: () => void;
}

export interface ProfileSidebarProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  onUpdate: () => void;
}

export interface ProfileTabsProps {
  profile: UserProfile;
  isOwnProfile: boolean;
}

export interface CommentMock {
  id: string;
  community: string;
  communityAvatar?: string;
  postTitle: string;
  author: string;
  timeAgo: string;
  content: string;
}

export interface FriendRequest {
  id: string;
  sender: {
    name: string | null;
    username: string | null;
    image: string | null;
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
    dailyStatuses?: { value: number }[];
  };
}

export interface FriendRequestsResponse {
  requests: FriendRequest[];
}

// Post types
export type PostLayout = "card" | "compact";
export type SortOption = "best" | "hot" | "new" | "top" | "rising";

type PostBase = {
  id: string;
  authorId?: string;
  communityId?: string | null;
  community: string;
  communityAvatar?: string;
  communityAvatarEmoji?: string | null;
  communityAvatarBgColor?: string | null;
  author: string;
  authorUsername: string;
  authorImage?: string | null;
  authorAvatarEmoji?: string | null;
  authorAvatarBgColor?: string | null;
  authorGlobalRole?: GlobalRole;
  authorCommunityRole?: CommunityRole;
  authorEmailVerified?: boolean | string | Date | null;
  anonymousIdentity?: {
    displayName: string;
    username: string;
    avatarEmoji: string;
    avatarBgColor: string;
  } | null;
  timeAgo: string;
  supports: number;
  comments: number;
  userSupported?: boolean;
  title: string;
  body?: string;
  spoiler?: boolean;
  isSaved?: boolean;
  isHidden?: boolean;
  isPinned?: boolean;
  isAuthor?: boolean; // helps the UI know if it can show "Delete"
  isAnonymous?: boolean;
  viewerCommunityRole?: CommunityRole | null;
  viewCount?: number;
};

export type TextPost = PostBase & {
  type: "text";
  body: string;
  spoiler?: boolean;
};

export type ImagePost = PostBase & {
  type: "image";
  images: string[];
  spoiler?: boolean;
};

export type VideoPost = PostBase & {
  type: "video";
  videoUrl: string;
  thumbnailUrl: string;
  duration: number; // seconds
  spoiler?: boolean;
};

export type YoutubePost = PostBase & {
  type: "youtube";
  videoId: string;
};

export type LinkPost = PostBase & {
  type: "link";
  url: string;
  siteName: string;
  metaTitle: string;
  metaDescription: string;
  metaImage: string;
};

export type PollPost = PostBase & {
  type: "poll";
  content?: string | null;
  options: { id: string; text: string; votes: number }[];
  closesAt: string;
  isClosed: boolean;
  userVote: string | null;
  totalVotes: number;
};

export type Post =
  | TextPost
  | ImagePost
  | VideoPost
  | YoutubePost
  | LinkPost
  | PollPost;

// Tab keys for profile sections
export type TabKey =
  | "overview"
  | "posts"
  | "comments"
  | "saved"
  | "history"
  | "hidden"
  | "supported"
  | "friends"
  | "requests"
  | "sent"
  | "members"
  | "pending"
  | "muted"
  | "banned";

// Friends Types

export interface FriendDailyStatus {
  value: number;
}

export interface FriendUser {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  bio: string | null;
  dailyStatuses: FriendDailyStatus[];
  avatarEmoji?: string | null;
  avatarBgColor?: string | null;
  emailVerified?: Date | string | null;
}

export interface IncomingFriendRequest {
  id: string;
  sender: FriendUser;
}

export interface SentFriendRequest {
  id: string;
  receiver: FriendUser;
}

export interface FriendsData {
  friends: FriendUser[];
  receivedRequests: IncomingFriendRequest[];
  sentRequests: SentFriendRequest[];
  blockedUsers: FriendUser[];
}

export type FriendOverride = "removed" | "pending" | "accepted";

export interface FriendCardProps {
  user: FriendUser;
  isOwnProfile: boolean;
  override: FriendOverride | undefined;
  onRemove: (username: string) => Promise<void>;
  onReAdd: (username: string) => Promise<void>;
  onCancelRequest: (username: string) => Promise<void>;
}

export interface RequestCardProps {
  requestId: string;
  user: FriendUser;
  onAccept: (id: string) => Promise<void>;
  onDecline: (id: string) => Promise<void>;
}

export interface SentRequestCardProps {
  user: FriendUser;
  override: FriendOverride | undefined;
  onCancel: (username: string) => Promise<void>;
  onReAdd: (username: string) => Promise<void>;
  onRemove: (username: string) => Promise<void>;
}

export interface UseFriendsOptions {
  username: string | null;
  isLocked: boolean;
  onUpdate?: () => void;
}

// Community types
export interface ApiCommunity {
  id: string;
  name: string;
  description: string | null;
  category: string;
  image: string | null;
  headerImage: string | null;
  avatarEmoji?: string | null;
  avatarBgColor?: string | null;
  headerEmoji?: string | null;
  headerBgColor?: string | null;
  isPrivate: boolean;
  isActive?: boolean;
  banReason?: string | null;
  bannedUntil?: string | null;
  isBanned?: boolean;
  isBlockedByMe?: boolean;
  rules?: string[];
  banDetails?: {
    reason: string | null;
    expiresAt: string | null;
  } | null;
  _count?: {
    members: number;
  };
  canAccessSuspended?: boolean;
  isJoined?: boolean;
}

export interface AdminReportedUser {
  user: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
    emailVerified?: Date | string | null;
  };
  reportCount: number;
  mutedUntil?: string | null;
  dailyStatusValue?: number | null;
}

export interface AdminReportedCommunity {
  community: {
    id: string;
    name: string;
    image: string | null;
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
    isPrivate: boolean;
  };
  reportCount: number;
  isSuspended?: boolean;
  suspendedUntil?: string | null;
}

export interface AdminReportItem {
  id: string;
  reason: string;
  isSuppressed: boolean;
  createdAt: string | Date;
  targetUserId?: string | null;
  targetPostId?: string | null;
  targetCommentId?: string | null;
  reporter?: {
    username: string | null;
    emailVerified?: Date | string | null;
  };
  targetPost?: {
    id: string;
    title: string;
    community?: { name: string } | null;
    author?: {
      username: string | null;
      emailVerified?: Date | string | null;
    } | null;
  } | null;
  targetComment?: {
    id: string;
    content: string;
    author?: {
      username: string | null;
      image: string | null;
      emailVerified?: Date | string | null;
    } | null;
    post: {
      id: string;
      title: string;
      community?: { name: string } | null;
      author?: {
        username: string | null;
        image: string | null;
        emailVerified?: Date | string | null;
      } | null;
    };
  } | null;
  targetCommunity?: {
    name: string;
  } | null;
}

export interface ApiAdminWarning {
  id: string;
  createdAt: string | Date;
  admin: {
    username: string | null;
    name: string | null;
    image: string | null;
  } | null;
}

export interface CommunitiesOverviewData {
  recommended: ApiCommunity[];
  all: ApiCommunity[];
  joined: ApiCommunity[];
  hidden: ApiCommunity[];
  blocked: ApiCommunity[];
  suspended: ApiCommunity[];
}

export interface CommunityLeader {
  role: CommunityRole;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
    emailVerified?: Date | string | null;
    dailyStatuses?: { value: number }[];
  };
}

export interface ApiCommunityDetail extends ApiCommunity {
  isActive: boolean;
  rules: string[];
  image: string | null;
  headerImage: string | null;
  avatarEmoji?: string | null;
  avatarBgColor?: string | null;
  headerEmoji?: string | null;
  headerBgColor?: string | null;
  createdAt: string;
  isBanned?: boolean;
  membership: {
    status: "NONE" | "PENDING" | "ACCEPTED" | "BANNED";
    role: "USER" | "MODERATOR" | "ADMIN" | "OWNER" | null;
  };
  stats: {
    members: number;
    posts: number;
    online: number;
  };
  isPersonallyHidden: boolean;
  isBlockedByMe: boolean;
  leaders?: CommunityLeader[];
}

export type CategoryTab =
  | "all"
  | "joined"
  | "chronic"
  | "physical"
  | "psychological"
  | "hidden"
  | "blocked"
  | "suspended";

export interface CommunityHeaderProps {
  community: ApiCommunityDetail;
  isPersonallyHidden: boolean;
  onUpdate: () => void;
}

export interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export interface CommunityCardProps {
  community: ApiCommunity;
  locale: string;
}

export interface CommunitySidebarProps {
  community: ApiCommunityDetail;
  onUpdate: () => void;
}

export interface EditCommunityModalProps {
  community: ApiCommunityDetail;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export interface ApiPostDraft {
  id: string;
  title: string | null;
  type: string;
  content: string | null;
  metadata: Record<string, unknown> | null;
  communityId: string | null;
  createdAt: string;
  updatedAt: string;
  community: {
    id: string;
    name: string;
    image: string | null;
    rules?: string[];
  } | null;
}

export type PostTypeTab =
  | "text"
  | "image"
  | "video"
  | "link"
  | "poll"
  | "youtube";

export type Destination = {
  type: "profile" | "community";
  id: string | null;
  name: string;
  image?: string | null;
  avatarEmoji?: string | null;
  avatarBgColor?: string | null;
  rules?: string[];
};

export interface DestinationSelectorProps {
  value: Destination;
  onChange: (dest: Destination) => void;
}

export interface CreatePostSidebarProps {
  destination: Destination;
}

export interface DraftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDraft: (draft: ApiPostDraft) => void;
}

export interface TextPostFormProps {
  title: string;
  setTitle: (t: string) => void;
  content: string;
  setContent: (c: string) => void;
}

export interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (text: string, url: string) => void;
  initialText?: string;
  initialUrl?: string;
}

export interface LinkDropdownProps {
  url: string;
  text: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}

export interface MarkdownHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface TableContextMenuProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onInsertRowBelow: () => void;
  onDeleteRow: () => void;
  onInsertColumnBefore: () => void;
  onInsertColumnAfter: () => void;
  onDeleteColumn: () => void;
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onDeleteTable: () => void;
  triggerElement: HTMLElement | null;
}

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  isMarkdownMode?: boolean;
  onLinkClick?: (element: HTMLAnchorElement) => void;
  onTableCellClick?: (cell: HTMLTableCellElement, button: HTMLElement) => void;
  onSelectionChange?: (activeCell: HTMLTableCellElement | null) => void;
}

export interface FormatToolbarProps {
  onFormatClick: (format: string) => void;
  activeFormats: Set<string>;
  onSwitchMode?: () => void;
  isMarkdownMode?: boolean;
  className?: string;
  disabledFormats?: Set<string>;
  boldDisabled?: boolean;
}

// Post Renderer Types
export interface ApiPost {
  id: string;
  title: string;
  type: string;
  content: string | null;
  metadata: Record<string, unknown> | null;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
    globalRole?: GlobalRole;
    communityRole?: CommunityRole;
    emailVerified?: Date | string | null;
  };
  anonymousIdentity?: {
    displayName: string;
    username: string;
    animalEmoji: string;
    bgColor: string;
  } | null;
  community: {
    id: string;
    name: string;
    image: string | null;
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
  } | null;
  _count: {
    comments: number;
  };
  supports: number;
  userSupported: boolean;
  isSaved: boolean;
  isHidden: boolean;
  isPinned: boolean;
  viewerCommunityRole?: CommunityRole | null;
  viewCount?: number;
  isAuthor?: boolean;
}

export interface PostFeedProps {
  layout: PostLayout;
  sort: SortOption;
  communityName?: string;
  username?: string;
  tab?: string;
}

export interface YoutubePostProps {
  post: YoutubePost;
  layout: PostLayout;
  hasPinnedPostInFeed?: boolean;
  onHideDelete?: () => void;
  currentTab?: string;
  isSingleView?: boolean;
}

export interface VideoPostProps {
  post: VideoPost;
  layout: PostLayout;
  hasPinnedPostInFeed?: boolean;
  onHideDelete?: () => void;
  currentTab?: string;
  isSingleView?: boolean;
}

export interface TextPostProps {
  post: TextPost;
  layout: PostLayout;
  hasPinnedPostInFeed?: boolean;
  onHideDelete?: () => void;
  currentTab?: string;
  isSingleView?: boolean;
}

export interface PostRendererProps {
  post: Post;
  layout: PostLayout;
  hasPinnedPostInFeed?: boolean;
  onHideDelete?: () => void;
  currentTab?: string;
  isSingleView?: boolean;
}

export interface PostHeaderProps {
  post: Post;
  layout: PostLayout;
  hasPinnedPostInFeed?: boolean;
  onHideDelete?: () => void;
  currentTab?: string;
}

export interface PollPostProps {
  post: PollPost;
  layout: PostLayout;
  hasPinnedPostInFeed?: boolean;
  onHideDelete?: () => void;
  currentTab?: string;
  isSingleView?: boolean;
}

export interface PollBodyProps {
  options: { id: string; text: string; votes: number }[];
  totalVotes: number;
  closesIn: string;
  voted: string | null;
  onVote: (id: string) => void;
  pollVotesLabel: string;
  tapToVoteLabel: string;
}

export interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export interface LinkPostProps {
  post: LinkPost;
  layout: PostLayout;
  hasPinnedPostInFeed?: boolean;
  onHideDelete?: () => void;
  currentTab?: string;
  isSingleView?: boolean;
}

export interface ImagePostProps {
  post: ImagePost;
  layout: PostLayout;
  hasPinnedPostInFeed?: boolean;
  onHideDelete?: () => void;
  currentTab?: string;
  isSingleView?: boolean;
}

export interface ApiCommunityMember {
  userId: string;
  role: "USER" | "MODERATOR" | "ADMIN" | "OWNER";
  status: string;
  joinedAt: string;
  isMuted?: boolean;
  anonymousIdentity?: {
    displayName: string;
    username: string;
    animalEmoji: string;
    bgColor: string;
  } | null;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
    emailVerified?: Date | string | null;
    dailyStatuses?: { value: number }[];
  };
}

export interface PostsPage {
  posts: ApiPost[];
}

export interface TransferOwnershipLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityName: string;
  onSuccess: () => void;
}

export interface MemberCardProps {
  member: ApiCommunityMember;
  viewerRole: string | null;
  currentUserId: string;
  onKick: (userId: string, username: string) => void;
  onChangeRole: (userId: string, newRole: string) => Promise<void>;
  useAnonPreview?: boolean;
  onToggleAnonPreview?: (userId: string) => void;
}

export type BanMuteAction = "ban" | "mute";

export type BanMuteDurationMode = "24h" | "48h" | "72h" | "custom" | "infinite";

export interface MembersTabsProps {
  communityName: string;
  currentUserId: string;
  isGlobalAdmin: boolean;
}

export interface BannedUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  reason: string | null;
  expires: string | null;
  dataAlreadyDeleted?: boolean;
}

export interface ApiCommunityBan {
  userId: string;
  reason: string | null;
  expiresAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    emailVerified?: Date | string | null;
  };
}

export interface ApiCommunityMute {
  userId: string;
  reason: string | null;
  expiresAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    emailVerified?: Date | string | null;
  };
}

export interface CommunityMembersResponse {
  members: ApiCommunityMember[];
  pending: ApiCommunityMember[];
  muted: ApiCommunityMute[];
  banned: ApiCommunityBan[];
}

export const isMemberRole = (
  role: string,
): role is ApiCommunityMember["role"] =>
  ["USER", "MODERATOR", "ADMIN", "OWNER"].includes(role);

export interface ExtendedMemberCardProps extends MemberCardProps {
  onOpenBanMuteModal?: (
    userId: string,
    username: string,
    type: "ban" | "mute",
  ) => void;
  onUnmute?: (userId: string) => Promise<void>;
}

export interface BanMuteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    action: "ban" | "mute",
    durationHours: number | null,
    reason: string | null,
  ) => Promise<void>;
  actionType: "ban" | "mute";
  targetUsername: string;
  onSuccessComplete?: () => void;
}

export interface KickUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string | null) => Promise<void>;
  targetUsername: string;
  communityName: string;
}

export type DurationMode = "24h" | "48h" | "72h" | "custom" | "infinite";

export interface BannedCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityName: string;
  reason: string | null;
  expires: string | null;
}

export type ReportTargetType = "USER" | "COMMUNITY" | "POST" | "COMMENT";

export interface ApiReport {
  id: string;
  reporterId: string;
  reason: string;
  targetUserId?: string | null;
  targetCommunityId?: string | null;
  targetPostId?: string | null;
  targetCommentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiNotification {
  id: string;
  userId: string;
  type: "WARNING" | "BANNED_ALERT" | "SYSTEM";
  title?: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export type ReportCreateData = {
  reporterId: string;
  reason: string;
  targetUserId?: string;
  targetCommunityId?: string;
  targetPostId?: string;
  targetCommentId?: string;
};

export interface ApiReportedPost extends ApiReport {
  reporter: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
    emailVerified?: Date | string | null;
  };
  targetPost: {
    id: string;
    title: string;
    content: string | null;
    author: {
      id: string;
      username: string | null;
      name: string | null;
      image: string | null;
      avatarEmoji?: string | null;
      avatarBgColor?: string | null;
      emailVerified?: Date | string | null;
    };
    community: {
      name: string;
    } | null;
  };
}

export interface ApiReportedComment extends ApiReport {
  reporter: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
    emailVerified?: Date | string | null;
  };
  targetComment: {
    id: string;
    content: string | null;
    author: {
      id: string;
      username: string | null;
      name: string | null;
      image: string | null;
      avatarEmoji?: string | null;
      avatarBgColor?: string | null;
      emailVerified?: Date | string | null;
    };
    post: {
      id: string;
      title: string;
      community: {
        name: string;
      } | null;
    };
  };
}

export interface ApiReportedMember extends ApiReport {
  reporter: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
    emailVerified?: Date | string | null;
  };
  targetUser: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
    emailVerified?: Date | string | null;
  };
  targetComment?: {
    id: string;
    content: string | null;
    post: {
      id: string;
      title: string;
      community: {
        name: string;
      } | null;
    };
    author: {
      id: string;
      username: string | null;
      name: string | null;
      image: string | null;
      avatarEmoji?: string | null;
      avatarBgColor?: string | null;
      emailVerified?: Date | string | null;
    };
  } | null;
  targetPost?: {
    id: string;
    title: string;
    content: string | null;
    community: {
      name: string;
    } | null;
    author: {
      id: string;
      username: string | null;
      name: string | null;
      image: string | null;
      avatarEmoji?: string | null;
      avatarBgColor?: string | null;
      emailVerified?: Date | string | null;
    };
  } | null;
}

export type WarnTarget = {
  username: string;
  reportId: string;
  postTitle?: string;
};

export interface WarnUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityName: string;
  target: WarnTarget | null;
  onWarned: (reportId: string) => Promise<void>;
}

export interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetName: string;
  targetAuthorName?: string;
  targetContent?: string;
  targetImage?: string | null;
  targetAvatarEmoji?: string | null;
  targetAvatarBgColor?: string | null;
  communityContextId?: string;
  commentContextId?: string;
  postContextId?: string;
}

export type NotificationI18nPayload = {
  key: string;
  params: Record<string, string>;
};

export interface DeleteCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export interface ClearUserReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  targetName: string;
  onSuccessComplete?: () => void;
}

export interface ClearCommunityReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  targetName: string;
  onSuccessComplete?: () => void;
}

export interface GlobalBanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, durationHours: string) => Promise<void>;
  username: string;
  onSuccessComplete?: () => void;
}

export interface SuspendCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    action: "suspend" | "lift",
    reason: string,
    duration: string,
  ) => Promise<void>;
  isCurrentlySuspended: boolean;
  initialReason?: string;
  targetName: string;
}

export interface AdminWarnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  targetName: string;
  type: "USER" | "COMMUNITY";
}

export interface ApiComment {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  isAnonymous: boolean;
  anonymousIdentity?: {
    displayName: string;
    username: string;
    avatarEmoji: string;
    avatarBgColor: string;
  } | null;
  deletedAt: string | null;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
    globalRole?: GlobalRole;
    communityRole?: CommunityRole;
    dailyStatuses?: { value: number }[];
    emailVerified?: Date | string | null;
  };
  replies?: ApiComment[];
  _count: {
    supportedBy: number;
    replies: number;
  };
  userSupported: boolean;
  isHidden: boolean;
  isPostAuthor: boolean;
}

export interface CommentViewProps {
  postAuthorId: string;
  isPostAnonymous: boolean;
}

export type CommentWithRelations = Comment & {
  author: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
    emailVerified?: Date | string | null;
    role?: GlobalRole;
    communities?: { communityId: string; role: CommunityRole }[];
    dailyStatuses?: { value: number }[];
  };
  _count: { supportedBy: number; replies: number };
  supportedBy?: { userId: string; commentId: string }[];
  replies?: CommentWithRelations[];
};

export type ProfileCommentData = {
  id: string;
  content: string;
  createdAt: string;
  deletedAt: string | null;
  _count: { supportedBy: number };
  author: { username: string };
  post: {
    id: string;
    title: string;
    community: { name: string; image: string | null } | null;
    author: { username: string };
  };
};

export interface CommentFormProps {
  postId: string;
  parentId?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  communityId?: string | null;
  editCommentId?: string;
  initialContent?: string;
}

export interface CommentItemProps {
  comment: ApiComment;
  postAuthorId: string;
  isPostAnonymous: boolean;
  communityId?: string | null;
  isReply?: boolean;
  viewerCommunityRole?: CommunityRole | null;
}

export interface CommentListProps {
  postId: string;
  postAuthorId: string;
  isPostAnonymous: boolean;
  communityId?: string | null;
}

export interface IsolatedCommentViewProps {
  postId: string;
  commentId: string;
  backUrl: string;
}

export interface PostActionsProps {
  id: string;
  supports: number;
  comments: number;
  userSupported?: boolean;
  layout: PostLayout;
  viewCount?: number;
  isAuthor?: boolean;
}

export interface SinglePostViewProps {
  postId: string;
  backUrl: string;
  backLabelKey: string;
}

export interface DeleteCommentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  loadingAction: string | null;
}

export interface DeletePostModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  postTitle?: string;
  deleteReason: string;
  onDeleteReasonChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loadingAction: string | null;
}

export interface ProfileCommentItem {
  id: string;
  community: string;
  communityAvatar?: string;
  postTitle: string;
  author: string;
  timeAgo: string;
  content: string;
  deletedAt?: string | null;
  supports?: number;
}

export interface CommentRendererProps {
  comment: ProfileCommentItem;
}

export type CommentPreview = {
  id: string;
  content: string | null;
  author: {
    username: string | null;
    image: string | null;
  };
};

export interface ApiGlobalBan {
  id: string;
  email: string;
  reason: string | null;
  expiresAt: string | null;
  createdAt: string;
  isActive: boolean;
  user?: {
    username: string | null;
    name: string | null;
    image: string | null;
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
  } | null;
}

export interface ExtendBanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (durationHours: number | null) => Promise<void>;
  targetIdentifier: string;
  currentExpiration: string | null;
}

export interface RevokeBanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  targetEmail: string;
  targetUsername?: string | null;
}

export interface ApiGlobalMute {
  id: string;
  userId: string;
  reason: string | null;
  expiresAt: string | null;
  createdAt: string;
  user?: {
    username: string | null;
    name: string | null;
    image: string | null;
    email: string;
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
    emailVerified?: Date | string | null;
  } | null;
}

export interface GlobalMuteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, duration: string) => Promise<void>;
  username: string;
  isCurrentlyMuted?: boolean;
  initialReason?: string | null;
  onLift?: () => Promise<void>;
}

export interface ExtendMuteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (durationHours: number | null) => Promise<void>;
  targetIdentifier: string;
  currentExpiration: string | null;
}

export interface RevokeMuteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  targetUsername: string | null | undefined;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface PostMetadata extends Record<string, unknown> {
  voters?: Record<string, string>;
  totalVotes?: number;
  durationHours?: number;
  closesAt?: string;
  options?: PollOption[];
  userVote?: string | null;
}

export interface FeedPost {
  id: string;
  authorId: string;
  communityId: string | null;
  isAnonymous: boolean;
  type: string;
  title: string;
  content: string | null;
  createdAt: string;
  metadata: Prisma.JsonValue;
  author: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
    globalRole?: GlobalRole;
    communityRole?: CommunityRole;
    emailVerified?: Date | string | null;
  };
  anonymousIdentity?: {
    displayName: string;
    username: string;
    animalEmoji: string;
    bgColor: string;
  } | null;
  community: {
    id: string;
    name: string;
    image: string | null;
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
  } | null;
  _count: {
    comments: number;
    supportedBy: number;
  };
  supportedBy: Array<{ userId: string; postId: string }>;
  viewCount: number;
}

export interface ChatAvatarParticipant {
  user: {
    id: string;
    name?: string | null;
    username?: string | null;
    image?: string | null;
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
    dailyStatuses?: { value: number }[];
    emailVerified?: Date | string | null;
  };
}

export interface Point {
  x: number;
  y: number;
}

export interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  shape: "round" | "rect";
  aspectRatio: number;
  onCropComplete: (blob: Blob) => void;
  title?: string;
}

export interface EditGroupChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  currentName: string;
  currentImage: string | null;
  participants: ChatAvatarParticipant[];
  onSuccess: () => void;
}

export interface AssignNicknameModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  targetName: string;
  targetUsername: string;
  currentNickname: string;
  onSave: (userId: string, nickname: string) => Promise<void>;
}

export type PollFormOption = Omit<PollOption, "votes">;

export interface PollPostFormProps {
  title: string;
  setTitle: (t: string) => void;
  metadata: Record<string, unknown> | null;
  setMetadata: (meta: Record<string, unknown>) => void;
  content: string;
  setContent: (c: string) => void;
}

export type ActiveDialog = "main" | "rules" | "crop-avatar" | "crop-header";

export type CommunityMembersPendingResponse = {
  pending?: { userId: string }[];
  members?: {
    pending?: { userId: string }[];
  };
};

export interface SearchUserResult {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  headerImage?: string | null;
  avatarEmoji?: string | null;
  avatarBgColor?: string | null;
  headerEmoji?: string | null;
  headerBgColor?: string | null;
  emailVerified?: Date | string | null;
  currentMood?: { value: number } | null;
  stats?: { friends: number; supports: number };
}

export interface SearchCommunityResult {
  id: string;
  name: string;
  image: string | null;
  headerImage: string | null;
  avatarEmoji?: string | null;
  avatarBgColor?: string | null;
  headerEmoji?: string | null;
  headerBgColor?: string | null;
  _count: { members: number };
}

export interface SearchApiPost {
  id: string;
  authorId: string;
  communityId: string | null;
  isAnonymous: boolean;
  type: string;
  title: string;
  content: string | null;
  metadata: Prisma.JsonValue;
  createdAt: string;
  author: SearchUserResult;
  community: { id: string; name: string; image: string | null } | null;
  anonymousIdentity?: {
    displayName: string;
    username: string;
    animalEmoji: string;
    bgColor: string;
  } | null;
  _count: { comments: number; supportedBy: number };
  supports: number;
  comments: number;
  userSupported: boolean;
  isSaved: boolean;
  isHidden: boolean;
  isPinned: boolean;
}

export interface RecentSearch {
  id: string;
  kind: "user" | "community";
  name: string | null;
  username: string | null;
  image: string | null;
  avatarEmoji?: string | null;
  avatarBgColor?: string | null;
  memberCount?: number;
}

export interface SearchSuggestResponse {
  users: SearchUserResult[];
  communities: SearchCommunityResult[];
}

export interface SearchGlobalResponse {
  users: SearchUserResult[];
  communities: SearchCommunityResult[];
  posts: SearchApiPost[];
}

export interface SearchScopedResponse {
  posts: SearchApiPost[];
}

export interface SearchResultsViewProps {
  query: string;
  type: "global" | "community" | "user";
  scope?: string;
  section?: "users" | "communities" | "posts";
  locale: string;
}

export type SearchResponse = SearchGlobalResponse | SearchScopedResponse;

export interface UseSearchResultsParams {
  query: string;
  type: "global" | "community" | "user";
  scope?: string;
  section?: "users" | "communities" | "posts";
}

export interface UseSearchResultsReturn {
  users: SearchUserResult[];
  communities: SearchCommunityResult[];
  posts: Post[];
  isLoading: boolean;
  handleHidePost: (postId: string) => void;
}

export interface UserResultCardProps {
  user: SearchUserResult;
  locale: string;
  friendsLabel: string;
  supportsLabel: string;
}

export interface SectionHeadingProps {
  children: React.ReactNode;
}

export interface SearchPostListProps {
  posts: Post[];
  locale: string;
  onHidePost: (postId: string) => void;
  query: string;
}

export interface CommunityResultCardProps {
  community: SearchCommunityResult;
  locale: string;
  membersLabel: string;
}

export interface SearchBarProps {
  onFocusChange: (focused: boolean) => void;
}

export interface SearchBarProps {
  onFocusChange: (focused: boolean) => void;
}

export type AvailabilityState =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "self";

export type SettingsTab = "privacy" | "account" | "health";

export type TranslationFn = (
  key: string,
  params?: Record<string, string>,
) => string;

export type AdminTab =
  | "overview"
  | "users"
  | "communities"
  | "banned"
  | "muted"
  | "dummy";

export interface RoleBadgeProps {
  globalRole?: GlobalRole;
  communityRole?: CommunityRole;
  isAnonymousAuthor?: boolean;
}

export interface DeleteAccountSectionProps {
  email: string;
}

export type ValidationState =
  | "loading"
  | "valid"
  | "invalid"
  | "expired"
  | "exiting"
  | "success";

export interface ConfirmDeleteFormProps {
  token: string;
  locale: string;
}

export type SectionState = "loading" | "idle" | "pending" | "sent";

export interface AccountDeletedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type UsernameRequestState = "idle" | "pending" | "sent";

export type PasswordResetState = "idle" | "sending" | "sent" | "error";

export type ResendState = "idle" | "sent" | "cooldown" | "error";

export interface UsernameInputProps {
  id: string;
  value: string;
  onChange: (v: string) => void;
  indicator: "valid" | "invalid" | "none";
}

export interface ConfirmUsernameFormProps {
  token: string;
  locale: string;
}

export interface VerifyEmailResultProps {
  status: string;
  locale: string;
}

export type InterceptorInitialValue = number | null;

export type PendingDebugTest = null | "success" | "error";

export interface DailyMoodPreviewProps {
  onMoodSelect: (value: number) => void;
}

export interface ApiNiqoMessage {
  id: string;
  niqoChatId: string;
  role: "USER" | "MODEL";
  content: string;
  filteredContent?: string;
  createdAt: string;
}

export interface NiqoRecentChat {
  conversationId: string | null;
  preview: string | null;
}

export interface DeleteNiqoChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessComplete: () => void;
}

export interface NewNiqoChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<string | void>;
  onSuccessComplete?: (chatId?: string) => void;
}

export interface PiiFilterUserContext {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export interface AdminMoodEntry {
  value: number; // 0-4
  count: number;
  percentage: number; // 0-100, rounded
}

export interface AdminPlatformStats {
  users: {
    total: number;
    newThisPeriod: number;
    newLastPeriod: number;
    onboarded: number;
    onboardingRate: number;
  };
  content: {
    totalPosts: number;
    postsThisPeriod: number;
    postsLastPeriod: number;
    totalComments: number;
    commentsThisPeriod: number;
    commentsLastPeriod: number;
  };
  communities: {
    total: number;
    active: number;
    suspended: number;
    newThisPeriod: number;
  };
  moderation: {
    activeBans: number;
    activeMutes: number;
    pendingReports: number;
    totalReports: number;
  };
  mood: {
    distribution: AdminMoodEntry[];
    total: number;
  };
}

export type AdminStatsRange = "today" | "week" | "month" | "year";

export interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  trend?: React.ReactNode;
  subLabel?: string;
}

export type RangeOption = {
  value: AdminStatsRange;
  labelKey: string;
  icon: React.ElementType;
};

export type GameType = "TIC_TAC_TOE" | "CONNECT_FOUR" | "KNUCKLEBONES";
export type GameMode = "ASYNC" | "LIVE";
export type MinigameStatus =
  | "PENDING"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "DECLINED";

export type TicTacToeState = {
  board: (string | null)[]; // 9 cells: null | "PLAYER1" | "PLAYER2"
};

export type ConnectFourState = {
  // board[col][row] - 7 cols x 6 rows (row 0 = bottom)
  board: (string | null)[][];
};

export type KnuckleBonesState = {
  // grid[col][rowIdx] - 3 cols x 3 slots (rowIdx 0 = bottom)
  player1Grid: (number | null)[][];
  player2Grid: (number | null)[][];
  // Die already rolled server-side for the current player to place
  pendingRoll: number | null;
};

export type ApiMinigamePlayer = {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
  avatarEmoji: string | null;
  avatarBgColor: string | null;
};

export type ApiMinigame = {
  id: string;
  type: GameType;
  mode: GameMode;
  status: MinigameStatus;
  player1Id: string;
  player2Id: string;
  currentTurnId: string;
  winnerId: string | null;
  isDraw: boolean;
  state: TicTacToeState | ConnectFourState | KnuckleBonesState;
  conversationId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  player1: ApiMinigamePlayer;
  player2: ApiMinigamePlayer;
  winner: ApiMinigamePlayer | null;
};

export interface PostProps {
  recentPosts?: Post[];
}

export type RecentPost = {
  id: string;
  community: string;
  authorUsername?: string;
  communityImage?: string | null;
  communityEmoji?: string | null;
  communityBgColor?: string | null;
  authorImage?: string | null;
  authorEmoji?: string | null;
  authorBgColor?: string | null;
  authorEmailVerified?: boolean | string | Date | null;
  timeAgo: string;
  title: string;
  likes: number;
  comments: number;
  media?: MediaType;
};

export type MediaType =
  | { kind: "image"; url: string }
  | { kind: "youtube"; url: string }
  | { kind: "video"; url: string; duration: string }
  | { kind: "link"; url: string; siteName: string };
