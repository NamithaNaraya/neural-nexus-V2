const STORAGE_PREFIX = 'neural_nexus_chat_sessions_v3';
const MAX_SESSION_COUNT = 24;
const MAX_MESSAGES_PER_SESSION = 240;
const MAX_SOURCE_COUNT = 6;
const MAX_RESULTS_COUNT = 20;
const MAX_TEXT_LENGTH = 12000;

export const WELCOME_MESSAGE = {
  role: 'assistant',
  isWelcome: true,
  content: "Welcome to the NESSO Nexus! I'm your Research Assistant with integrated RAG and ecosystem search. Ask anything about your research folders or knowledge clusters, and I'll help you cultivate full answers from your data.",
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
};

const safeJsonParse = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

const hashString = (input) => {
  let hash = 2166136261;
  const text = String(input || '');
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const deterministicUuidFromString = (value) => {
  const a = hashString(`${value}:a`);
  const b = hashString(`${value}:b`).slice(0, 4);
  const cRaw = hashString(`${value}:c`).slice(0, 4);
  const dRaw = hashString(`${value}:d`).slice(0, 4);
  const e = `${hashString(`${value}:e`)}${hashString(`${value}:f`).slice(0, 4)}`.slice(0, 12);
  const c = `4${cRaw.slice(1)}`; // version 4 style nibble
  const d = `a${dRaw.slice(1)}`; // variant nibble
  return `${a}-${b}-${c}-${d}-${e}`;
};

const normalizeSessionId = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return generateId();
  return isUuid(raw) ? raw : deterministicUuidFromString(raw);
};

const normalizeUserKey = (userKey) => {
  const raw = String(userKey || 'anonymous').trim().toLowerCase();
  return raw.replace(/[^a-z0-9._-]/g, '_');
};

export const getChatStorageKey = (userKey) => `${STORAGE_PREFIX}:${normalizeUserKey(userKey)}`;

export const getDefaultSessionTitle = (folderName = 'New Session') => folderName || 'New Session';

const hasMeaningfulSessionMessages = (messages = []) =>
  Array.isArray(messages) &&
  messages.some((message) => {
    if (message?.isWelcome) return false;
    return String(message?.content || '').trim().length > 0
      || Boolean(message?.webSearchAnswer)
      || Boolean(message?.generalAnswer);
  });

export const isGhostTimeoutSession = (session) => {
  const title = String(session?.title || '').toLowerCase();
  const messageCount = Number(session?.messageCount || 0);
  const hasRealMessages = hasMeaningfulSessionMessages(session?.messages || []);
  return title.includes('ollama timeout') && !hasRealMessages && messageCount <= 0;
};

export const dedupeSessionsById = (sessions = []) => {
  const uniqueSessions = [];
  const seen = new Map();

  for (const session of Array.isArray(sessions) ? sessions : []) {
    if (!session?.id) continue;
    const existingIndex = seen.get(session.id);
    if (existingIndex === undefined) {
      seen.set(session.id, uniqueSessions.length);
      uniqueSessions.push(session);
      continue;
    }

    const existing = uniqueSessions[existingIndex];
    const existingScore = Number(existing?.updatedAt || existing?.createdAt || 0);
    const nextScore = Number(session?.updatedAt || session?.createdAt || 0);
    const existingHasMessages = hasMeaningfulSessionMessages(existing?.messages || []) || Number(existing?.messageCount || 0) > 0;
    const nextHasMessages = hasMeaningfulSessionMessages(session?.messages || []) || Number(session?.messageCount || 0) > 0;

    if (
      nextHasMessages && !existingHasMessages
      || (nextHasMessages === existingHasMessages && nextScore >= existingScore)
    ) {
      uniqueSessions[existingIndex] = session;
    }
  }

  return uniqueSessions;
};

export const getSessionTitleFromMessages = (messages = [], fallback = 'New Session') => {
  const firstUserMessage = messages.find((message) => message?.role === 'user' && String(message?.content || '').trim());
  const content = String(firstUserMessage?.content || '').trim();

  if (!content) return fallback;
  return content.length > 42 ? `${content.slice(0, 42).trim()}…` : content;
};

export const createChatSession = ({ folderId = '', folderName = '', title, messages } = {}) => {
  const sessionMessages = Array.isArray(messages) && messages.length > 0 ? messages : [WELCOME_MESSAGE];
  const createdAt = Date.now();

  return {
    id: normalizeSessionId(generateId()),
    folderId: folderId ? String(folderId) : '',
    folderName: folderName || '',
    title: title || getSessionTitleFromMessages(sessionMessages, getDefaultSessionTitle(folderName)),
    createdAt,
    updatedAt: createdAt,
    messages: sessionMessages,
  };
};

export const loadChatWorkspace = (userKey) => {
  const storageKey = getChatStorageKey(userKey);
  if (typeof localStorage === 'undefined') {
    const session = createChatSession();
    return { currentSessionId: session.id, sessions: [session] };
  }

  let raw = null;
  try {
    raw = localStorage.getItem(storageKey);
  } catch {
    const session = createChatSession();
    return { currentSessionId: session.id, sessions: [session] };
  }
  if (!raw) {
    const session = createChatSession();
    return { currentSessionId: session.id, sessions: [session] };
  }

  const parsed = safeJsonParse(raw, null);
  if (!parsed || typeof parsed !== 'object') {
    const session = createChatSession();
    return { currentSessionId: session.id, sessions: [session] };
  }

  const sessions = Array.isArray(parsed.sessions)
    ? dedupeSessionsById(
        parsed.sessions
          .filter(Boolean)
          .map((session) => ({
            id: normalizeSessionId(session.id || generateId()),
            folderId: session.folderId ? String(session.folderId) : '',
            folderName: session.folderName || '',
            title: session.title || getSessionTitleFromMessages(session.messages || [], getDefaultSessionTitle(session.folderName || 'New Research')),
            createdAt: Number(session.createdAt || Date.now()),
            updatedAt: Number(session.updatedAt || session.createdAt || Date.now()),
            messages: Array.isArray(session.messages) && session.messages.length > 0 ? session.messages : [WELCOME_MESSAGE],
          }))
          .filter((session) => !isGhostTimeoutSession(session))
      )
    : [];

  if (sessions.length === 0) {
    const session = createChatSession();
    return { currentSessionId: session.id, sessions: [session] };
  }

  const requestedCurrentSessionId = String(parsed.currentSessionId || '');
  const hasRequestedCurrentSession = sessions.some((session) => session.id === requestedCurrentSessionId);

  // Prefer the explicitly saved current session so refreshes do not unexpectedly switch chats.
  const currentSessionId = hasRequestedCurrentSession
    ? requestedCurrentSessionId
    : sessions.slice().sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))[0]?.id || sessions[0].id;

  return {
    currentSessionId,
    sessions,
  };
};

export const saveChatWorkspace = (userKey, workspace) => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(getChatStorageKey(userKey), JSON.stringify(serializeWorkspace(workspace)));
  } catch {
    try {
      const reducedWorkspace = serializeWorkspaceCompact(workspace);
      localStorage.setItem(getChatStorageKey(userKey), JSON.stringify(reducedWorkspace));
    } catch {
      // Ignore storage failures so the UI never crashes.
    }
  }
};

const clampText = (value, maxLength = MAX_TEXT_LENGTH) => {
  const text = String(value || '');
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const serializeMessage = (message, options = {}) => {
  const aggressive = Boolean(options.aggressive);
  const base = {
    role: message?.role || 'assistant',
    content: clampText(message?.content || '', aggressive ? 4000 : MAX_TEXT_LENGTH),
    isWelcome: Boolean(message?.isWelcome),
    isError: Boolean(message?.isError),
    isWebSearch: Boolean(message?.isWebSearch),
    isGeneralAnswer: Boolean(message?.isGeneralAnswer),
    webSearchPending: Boolean(message?.webSearchPending),
    webSearchSuggested: Boolean(message?.webSearchSuggested),
    webSearchQuery: message?.webSearchQuery || '',
    webSearchContextHint: message?.webSearchContextHint || '',
    contextSummary: clampText(message?.contextSummary || '', aggressive ? 800 : 2000),
    algorithm: message?.algorithm || null,
  };

  // Persist the original question so assistant messages can show "Replying to: ..."
  if (message?.originalQuestion) {
    base.originalQuestion = clampText(message.originalQuestion, 500);
  }

  if (message?.webSearchAnswer) {
    base.webSearchAnswer = clampText(message.webSearchAnswer, aggressive ? 3000 : 9000);
  }

  if (Array.isArray(message?.webSearchSources) && message.webSearchSources.length > 0) {
    base.webSearchSources = message.webSearchSources.slice(0, MAX_SOURCE_COUNT).map((source) => ({
      title: clampText(source?.title || source?.name || source?.url || 'Source', 180),
      url: source?.url || source?.uri || '',
      snippet: clampText(source?.snippet || '', aggressive ? 120 : 280),
    }));
  }

  if (!aggressive && Array.isArray(message?.sources) && message.sources.length > 0) {
    base.sources = message.sources.slice(0, MAX_SOURCE_COUNT).map((source) => ({
      node_type: source?.node_type || source?.type || '',
      node_name: clampText(source?.node_name || source?.name || '', 120),
    }));
  }

  if (!aggressive && Array.isArray(message?.results) && message.results.length > 0) {
    base.results = message.results.slice(0, MAX_RESULTS_COUNT);
  }

  // Persist grounding, intent, and general answer data
  if (message?.dataGrounding) {
    base.dataGrounding = message.dataGrounding;
  }
  if (message?.intent && !aggressive) {
    base.intent = message.intent;
  }
  if (message?.generalAnswer) {
    base.generalAnswer = clampText(message.generalAnswer, aggressive ? 4000 : MAX_TEXT_LENGTH);
  }

  return base;
};

const serializeWorkspace = (workspace, options = {}) => {
  const currentSessionId = workspace?.currentSessionId;
  const sessions = dedupeSessionsById((workspace?.sessions || []))
    .slice(0, MAX_SESSION_COUNT)
    .map((session) => {
      const rawMessages = Array.isArray(session?.messages) ? session.messages : [];
      // Persist full chat history per session (bounded) so refresh restores conversations reliably.
      const messagesToSerialize = rawMessages.length > 0
        ? rawMessages.slice(-MAX_MESSAGES_PER_SESSION)
        : [WELCOME_MESSAGE];

      return {
        id: normalizeSessionId(session?.id || generateId()),
        folderId: session?.folderId ? String(session.folderId) : '',
        folderName: session?.folderName || '',
        title: session?.title || getDefaultSessionTitle(session?.folderName || 'New Research'),
        createdAt: Number(session?.createdAt || Date.now()),
        updatedAt: Number(session?.updatedAt || session?.createdAt || Date.now()),
        messages: messagesToSerialize.map((message) => serializeMessage(message, options)),
      };
    });

  const finalCurrentId = sessions.some((session) => session.id === currentSessionId)
    ? currentSessionId
    : sessions[0]?.id || '';

  return {
    currentSessionId: finalCurrentId,
    sessions,
  };
};

const serializeWorkspaceCompact = (workspace) => {
  const currentSessionId = String(workspace?.currentSessionId || '');
  const sessions = dedupeSessionsById((workspace?.sessions || []))
    .slice(0, 12)
    .map((session) => {
      const sid = normalizeSessionId(session?.id || generateId());
      const rawMessages = Array.isArray(session?.messages) ? session.messages : [];
      const keep = sid === currentSessionId ? rawMessages.slice(-40) : rawMessages.slice(-6);
      return {
        id: sid,
        folderId: session?.folderId ? String(session.folderId) : '',
        folderName: session?.folderName || '',
        title: session?.title || 'New Chat',
        createdAt: Number(session?.createdAt || Date.now()),
        updatedAt: Number(session?.updatedAt || session?.createdAt || Date.now()),
        messages: (keep.length ? keep : [WELCOME_MESSAGE]).map((message) => serializeMessage(message, { aggressive: true })),
      };
    });
  return {
    currentSessionId: sessions.some((s) => s.id === currentSessionId) ? currentSessionId : sessions[0]?.id || '',
    sessions,
  };
};

export const upsertSession = (workspace, session) => {
  const nextSession = {
    ...session,
    title: session.title || getSessionTitleFromMessages(session.messages || [], getDefaultSessionTitle(session.folderName || 'New Research')),
    updatedAt: Date.now(),
  };

  const sessions = dedupeSessionsById([nextSession, ...(workspace.sessions || []).filter((item) => item.id !== nextSession.id)]);
  return {
    currentSessionId: workspace.currentSessionId || nextSession.id,
    sessions,
  };
};

export const replaceSessionMessages = (workspace, sessionId, messages, patch = {}) => {
  const sessions = dedupeSessionsById((workspace.sessions || []).map((session) => {
    if (session.id !== sessionId) return session;
    return {
      ...session,
      ...patch,
      messages,
      title: patch.title || session.title || getSessionTitleFromMessages(messages, getDefaultSessionTitle(patch.folderName || session.folderName || 'New Research')),
      updatedAt: Date.now(),
    };
  }));

  return {
    ...workspace,
    sessions,
  };
};

export const createBlankSession = ({ folderId = '', folderName = '' } = {}) =>
  createChatSession({ folderId, folderName, messages: [WELCOME_MESSAGE] });

export const selectSessionForFolder = (workspace, folderId, folderName = '') => {
  const folderKey = folderId ? String(folderId) : '';
  const matchingSessions = dedupeSessionsById(workspace.sessions || [])
    .filter((session) => String(session.folderId || '') === folderKey)
    .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));

  if (matchingSessions.length > 0) {
    return {
      ...workspace,
      currentSessionId: matchingSessions[0].id,
    };
  }

  const newSession = createBlankSession({ folderId, folderName });
  return {
    currentSessionId: newSession.id,
    sessions: dedupeSessionsById([newSession, ...(workspace.sessions || [])]),
  };
};

export const removeSession = (workspace, sessionId) => {
  const sessions = dedupeSessionsById((workspace.sessions || []).filter((session) => session.id !== sessionId));
  const nextCurrent = workspace.currentSessionId === sessionId ? (sessions[0]?.id || '') : workspace.currentSessionId;
  if (sessions.length === 0) {
    const fallback = createBlankSession();
    return {
      currentSessionId: fallback.id,
      sessions: [fallback],
    };
  }

  return {
    currentSessionId: nextCurrent,
    sessions,
  };
};
