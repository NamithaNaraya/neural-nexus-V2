import React, { Suspense, lazy, useDeferredValue, useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { IconButton } from '../components/ui/IconButton';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { AnimatedNumber } from '../components/shared/AnimatedNumber';
import {
  FolderOpen,
  Plus,
  FileText,
  Network,
  Calendar,
  Trash2,
  ArrowLeft,
  ChevronRight,
  X,
  Loader2,
  GitFork,
  Search,
  Pencil,
  AlertTriangle,
  LayoutGrid,
  List,
  Terminal,
  Activity,
  Layers,
  BrainCircuit,
  Cpu,
  Sprout,
  Leaf,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { folderService } from '../services/folderService';
import { browseService } from '../services/browseService';
import { useGlobalFolder } from '../contexts/GlobalFolderContext';

const FolderNodesPanel = lazy(() => import('./folders/FolderNodesPanel').then((m) => ({ default: m.FolderNodesPanel })));
const FolderFilesPanel = lazy(() => import('./folders/FolderFilesPanel').then((m) => ({ default: m.FolderFilesPanel })));
const FolderCrudModal = lazy(() => import('../components/crud/FolderCrudModal').then((m) => ({ default: m.FolderCrudModal })));

const FolderCardSkeleton = ({ mode = 'grid' }) => {
  if (mode === 'list') {
    return (
      <Card className="rounded-[24px] border-border/10 bg-secondary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="flex gap-3 shrink-0 mr-4">
              <Skeleton className="h-6 w-14 rounded-lg" />
              <Skeleton className="h-6 w-14 rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[32px] border-border/10 bg-secondary/5">
      <CardContent className="p-8">
        <div className="flex items-start gap-6">
          <Skeleton className="w-16 h-16 rounded-[20px] shrink-0" />
          <div className="flex-1 space-y-3 py-1">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <div className="flex gap-4 mt-8">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-20" />
        </div>
      </CardContent>
    </Card>
  );
};

export default function FoldersPage() {
  const { folders, loading, refreshFolders, selectedFolderId, setSelectedFolderId } = useGlobalFolder();
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('folder_view_mode') || 'grid');

  useEffect(() => {
    localStorage.setItem('folder_view_mode', viewMode);
  }, [viewMode]);

  const [showCreate, setShowCreate] = useState(false);
  const [folderSearch, setFolderSearch] = useState('');
  const [folderContentSearch, setFolderContentSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedFolderTab, setSelectedFolderTab] = useState('nodes');
  const [folderFiles, setFolderFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);

  const [nodeTypes, setNodeTypes] = useState([]);
  const [selectedNodeType, setSelectedNodeType] = useState('');
  const [folderNodes, setFolderNodes] = useState([]);
  const [nodesLoading, setNodesLoading] = useState(false);
  const [nodeSearch, setNodeSearch] = useState('');
  const [nodesPage, setNodesPage] = useState(1);
  const [nodesTotalPages, setNodesTotalPages] = useState(0);
  const folderNodesCacheRef = useRef(new Map());
  const loadedFolderFilesIdRef = useRef('');
  const lastSyncedFolderIdRef = useRef('');
  const pendingFolderSyncRef = useRef('');

  const [deleting, setDeleting] = useState(null);
  const loadingFolderIdRef = useRef('');
  const [deletePromptFolder, setDeletePromptFolder] = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const deferredFolderSearch = useDeferredValue(folderSearch);
  const deferredFolderContentSearch = useDeferredValue(folderContentSearch);

  const filteredFolders = useMemo(() => {
    const term = deferredFolderSearch.trim().toLowerCase();
    if (!term) return folders;

    return folders.filter((folder) => {
      const name = String(folder.name || '').toLowerCase();
      const description = String(folder.description || '').toLowerCase();
      const id = String(folder.id || '').toLowerCase();
      return name.includes(term) || description.includes(term) || id.includes(term);
    });
  }, [deferredFolderSearch, folders]);

  const filteredFolderNodes = useMemo(() => {
    const term = deferredFolderContentSearch.trim().toLowerCase();
    if (!term) return folderNodes;

    return folderNodes.filter((node) => {
      const name = String(node.name || '').toLowerCase();
      const type = String(node.type || '').toLowerCase();
      const id = String(node.id || '').toLowerCase();
      return name.includes(term) || type.includes(term) || id.includes(term);
    });
  }, [deferredFolderContentSearch, folderNodes]);

  const filteredFolderFiles = useMemo(() => {
    const term = deferredFolderContentSearch.trim().toLowerCase();
    if (!term) return folderFiles;

    return folderFiles.filter((file) => {
      const name = String(file.filename || '').toLowerCase();
      const type = String(file.file_type || '').toLowerCase();
      const status = String(file.status || '').toLowerCase();
      return name.includes(term) || type.includes(term) || status.includes(term);
    });
  }, [deferredFolderContentSearch, folderFiles]);

  const resetFolderSelection = useCallback(() => {
    setSelectedFolder(null);
    setSelectedFolderId('');
    setSelectedFolderTab('nodes');
    setFolderContentSearch('');
    setNodeSearch('');
    setSelectedNodeType('');
    setFolderFiles([]);
    setNodeTypes([]);
    setFolderNodes([]);
    setNodesPage(1);
    setNodesTotalPages(0);
    loadedFolderFilesIdRef.current = '';
    lastSyncedFolderIdRef.current = '';
    pendingFolderSyncRef.current = '';
  }, [setSelectedFolderId]);

  const fetchFolderNodes = useCallback(async (folderId, type, page = 1, q = '') => {
    const cacheKey = `${folderId}:${type}:${page}:${q}`;
    const cached = folderNodesCacheRef.current.get(cacheKey);
    if (cached) {
      setFolderNodes(cached.nodes);
      setNodesTotalPages(cached.totalPages);
      setNodesPage(cached.page);
      setNodesLoading(false);
      return;
    }

    setNodesLoading(true);
    try {
      const data = await browseService.getNodesByType(type, folderId, page, 20, q);
      const nodes = Array.isArray(data.nodes) ? data.nodes : [];
      const totalPages = data.total_pages || 0;
      const currentPage = data.page || 1;
      folderNodesCacheRef.current.set(cacheKey, {
        nodes,
        totalPages,
        page: currentPage,
      });
      setFolderNodes(nodes);
      setNodesTotalPages(totalPages);
      setNodesPage(currentPage);
    } catch (err) {
      console.error('Failed to fetch nodes by type:', err);
      setFolderNodes([]);
      setNodesTotalPages(0);
      setNodesPage(1);
    } finally {
      setNodesLoading(false);
    }
  }, []);

  const fetchFolderFiles = useCallback(async (folderId) => {
    if (!folderId || String(loadedFolderFilesIdRef.current) === String(folderId)) return;

    setFilesLoading(true);
    try {
      const filesResult = await folderService.listFiles(folderId);
      setFolderFiles(Array.isArray(filesResult) ? filesResult : []);
      loadedFolderFilesIdRef.current = String(folderId);
    } catch (err) {
      console.error('Failed to fetch folder files:', err);
      setFolderFiles([]);
    } finally {
      setFilesLoading(false);
    }
  }, []);

  const loadFolderDetails = useCallback(async (folder) => {
    if (!folder?.id) return;
    const folderId = String(folder.id);
    loadingFolderIdRef.current = folderId;
    
    setSelectedFolder(folder);
    lastSyncedFolderIdRef.current = folderId;
    setNodeSearch('');
    setFolderContentSearch('');
    setFolderFiles([]);
    loadedFolderFilesIdRef.current = '';
    setFilesLoading(false);
    setNodesLoading(true);
    folderNodesCacheRef.current.clear();

    try {
      const nodeTypesResult = await browseService.getNodeTypes(folderId);
      
      // If folder selection changed while we were fetching types, abort
      if (loadingFolderIdRef.current !== folderId) return;

      const types = Array.isArray(nodeTypesResult?.types) ? nodeTypesResult.types : [];
      setNodeTypes(types);
      const firstType = types.length > 0 ? types[0].type : '';
      setSelectedNodeType(firstType);
      
      if (firstType) {
        await fetchFolderNodes(folderId, firstType, 1, '');
      } else {
        setFolderNodes([]);
        setNodesTotalPages(0);
        setNodesLoading(false);
      }
    } catch (err) {
      console.error('Failed to fetch folder details:', err);
      // Only reset if this is still the active folder
      if (loadingFolderIdRef.current === folderId) {
        setFolderFiles([]);
        setNodeTypes([]);
        setSelectedNodeType('');
        setFolderNodes([]);
        setNodesTotalPages(0);
        setNodesLoading(false);
      }
    }
  }, [fetchFolderNodes]);

  const activateFolder = useCallback(async (folder) => {
    if (!folder) return;
    const folderId = String(folder.id);
    pendingFolderSyncRef.current = folderId;
    setSelectedFolderId(folderId);
    if (String(lastSyncedFolderIdRef.current) === folderId && String(selectedFolder?.id || '') === folderId) {
      return;
    }
    await loadFolderDetails(folder);
  }, [loadFolderDetails, selectedFolder?.id, setSelectedFolderId]);

  useEffect(() => {
    if (!selectedFolderId || folders.length === 0) return;

    const nextFolder = folders.find((folder) => String(folder.id) === String(selectedFolderId)) || null;

    if (!nextFolder) {
      pendingFolderSyncRef.current = '';
      resetFolderSelection();
      return;
    }

    if (String(pendingFolderSyncRef.current) === String(selectedFolderId)) {
      pendingFolderSyncRef.current = '';
      return;
    }

    if (String(selectedFolder?.id || '') === String(nextFolder.id)) {
      setSelectedFolder((current) => (current ? { ...current, ...nextFolder } : current));
      return;
    }

    void loadFolderDetails(nextFolder);
  }, [folders, loadFolderDetails, resetFolderSelection, selectedFolder?.id, selectedFolderId]);

  useEffect(() => {
    if (selectedFolderTab !== 'files' || !selectedFolder?.id) return;
    void fetchFolderFiles(selectedFolder.id);
  }, [fetchFolderFiles, selectedFolder?.id, selectedFolderTab]);

  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    return new Date(isoStr).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  useEffect(() => {
    if (!selectedFolder || !selectedNodeType || !nodeSearch) return;
    const timer = setTimeout(() => {
      fetchFolderNodes(selectedFolder.id, selectedNodeType, 1, nodeSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [nodeSearch, selectedFolder, selectedNodeType, fetchFolderNodes]);

  return (
    <section aria-labelledby="folders-page-title" className="flex flex-1 min-h-0 flex-col gap-6 overflow-hidden pt-2 bg-transparent">
      {statusMessage && (
        <div role="alert" aria-live="polite" className="rounded-2xl border border-destructive/25 bg-destructive/10 px-6 py-3 text-[12px] font-black uppercase tracking-widest text-destructive animate-fade-in shadow-xl shadow-destructive/10">
          {statusMessage}
        </div>
      )}

      {/* Neural Header Section */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between px-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
             {/* Sub-header content removed for cleanliness */}
          </div>
          <div className="space-y-1">
            <h1 id="folders-page-title" className="text-xl font-black tracking-tighter text-foreground uppercase leading-none">Folders</h1>
            <p className="max-w-xl text-[11px] text-muted-foreground/60 font-bold leading-relaxed tracking-tight">
              Manage and organize your data directories with high-performance synthesis.
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-4 lg:w-auto lg:min-w-[480px] lg:flex-row lg:items-center lg:justify-end">
          <div className="relative flex-1 group">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40 transition-colors group-focus-within:text-primary" />
            <Input
              aria-label="Search folders"
              value={folderSearch}
              onChange={(e) => setFolderSearch(e.target.value)}
              placeholder="Search folders..."
              className="h-10 pl-10 rounded-[16px] border-border/20 bg-secondary/20 dark:bg-secondary/40 focus:ring-4 focus:ring-primary/10 focus:border-primary/40 transition-all duration-500 font-bold tracking-tight shadow-inner"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1.5 bg-secondary/30 dark:bg-secondary/50 rounded-[18px] border border-border/20 backdrop-blur-3xl shadow-xl ring-1 ring-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-[12px] transition-all duration-500",
                viewMode === 'grid' 
                  ? "bg-white text-primary shadow-xl shadow-primary/10 ring-1 ring-black/5" 
                  : "text-muted-foreground/50 hover:text-primary hover:bg-white/40 dark:hover:bg-white/10"
              )}
              title="Grid View"
            >
              <LayoutGrid className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-[12px] transition-all duration-500",
                viewMode === 'list' 
                  ? "bg-white text-primary shadow-xl shadow-primary/10 ring-1 ring-black/5" 
                  : "text-muted-foreground/50 hover:text-primary hover:bg-white/40 dark:hover:bg-white/10"
              )}
              title="Stream View"
            >
              <List className="w-4.5 h-4.5" />
            </button>
          </div>

          <Button
            variant="default"
            className="h-10 shrink-0 gap-2 rounded-[16px] px-6 text-[11px] font-black tracking-[0.1em] uppercase shadow-xl shadow-primary/20 transition-all duration-500 hover:scale-105 active:scale-95 ring-4 ring-primary/10"
            onClick={() => setShowCreate(!showCreate)}
          >
            <Plus className="w-4 h-4" />
            Add Folder
          </Button>
        </div>
      </div>

      {/* Main Grid — Dynamic Response */}
      <div className={cn(
        "grid flex-1 h-full min-h-0 items-stretch gap-6 overflow-hidden transition-all duration-700",
        selectedFolder ? "grid-cols-1 lg:grid-cols-[minmax(20rem,32%)_minmax(0,68%)] px-2 pb-8" : "grid-cols-1 px-2 pb-10"
      )}>
        
        {/* Folder List — Small & Neat */}
        <div className={cn(
          "space-y-4 overflow-y-auto min-h-0 h-full pr-2 custom-scrollbar transition-all duration-700",
          !selectedFolder && "w-full"
        )}>

          {loading ? (
            <div className={cn(
              "grid gap-4",
              viewMode === 'grid' 
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-1" 
                : "grid-cols-1"
            )}>
              {[1, 2, 3, 4, 5, 6].map(i => <FolderCardSkeleton key={i} mode={viewMode} />)}
            </div>
          ) : filteredFolders.length > 0 ? (
            <div className={cn(
              'transition-all duration-700',
              viewMode === 'list' 
                ? 'space-y-3' 
                : cn(
                    'grid gap-5',
                    selectedFolder ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
                  )
            )}>

              {filteredFolders.map((folder) => (
                <Card
                  key={folder.id}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    'cursor-pointer group relative overflow-hidden backdrop-blur-3xl transition-all duration-500',
                    viewMode === 'list' ? 'rounded-[24px]' : 'rounded-[36px]',
                    (selectedFolder?.id === folder.id || String(selectedFolderId) === String(folder.id))
                      ? 'border-primary/40 bg-primary/10 dark:bg-primary/20 shadow-2xl shadow-primary/15 ring-2 ring-primary/20 translate-x-2'
                      : 'border-border/15 bg-white/40 dark:bg-black/40 hover:bg-white/70 dark:hover:bg-white/5 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1'
                  )}
                  onClick={() => activateFolder(folder)}
                >
                  {viewMode === 'grid' ? (
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-5">
                        <div className="w-13 h-13 rounded-[18px] bg-secondary/50 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 shadow-inner border border-border/10">
                          <FolderOpen className="w-6.5 h-6.5 text-primary/80" />
                        </div>
                        <div className="flex items-center gap-2 shrink-0 -mr-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); setShowEdit(true); }}
                            className="p-3 rounded-[14px] opacity-0 group-hover:opacity-100 hover:bg-primary/20 dark:hover:bg-primary/30 text-muted-foreground/60 hover:text-primary transition-all duration-300"
                            title="Refine Collection"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeletePromptFolder(folder); }}
                            className="p-3 rounded-[14px] opacity-0 group-hover:opacity-100 hover:bg-destructive/20 dark:hover:bg-destructive/30 text-muted-foreground/60 hover:text-destructive transition-all duration-300"
                            title="Prune Collection"
                          >
                            {deleting === folder.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-2.5 min-w-0">
                        <h3 className="font-black text-lg leading-tight tracking-tighter text-foreground group-hover:text-primary transition-colors uppercase">
                          {folder.name}
                        </h3>
                        {folder.description && (
                          <p className="text-[13px] text-muted-foreground/60 line-clamp-2 font-bold leading-relaxed tracking-tight group-hover:text-muted-foreground/80 transition-colors">
                            {folder.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-6">
                        <Badge variant="outline" className="h-6.5 gap-2 px-3 text-[9px] font-black border-primary/20 text-primary/70 uppercase tracking-[0.2em] bg-primary/5 rounded-[10px]">
                          <FileText className="w-3.5 h-3.5" />
                          {folder.file_count}
                        </Badge>
                        <Badge variant="outline" className="h-6.5 gap-2 px-3 text-[9px] font-black border-accent/20 text-accent/70 uppercase tracking-[0.2em] bg-accent/5 rounded-[10px]">
                          <Network className="w-3.5 h-3.5" />
                          {folder.node_count}
                        </Badge>
                      </div>
                    </CardContent>
                  ) : (
                    <CardContent className="p-3.5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="w-11 h-11 rounded-[14px] bg-secondary/50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-all duration-700 border border-border/10">
                            <FolderOpen className="w-5.5 h-5.5 text-primary/80" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3">
                              <h3 
                                title={folder.name}
                                className="font-black text-base truncate text-foreground group-hover:text-primary transition-colors uppercase tracking-tight"
                              >
                                {folder.name}
                              </h3>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Badge variant="outline" className="h-5 gap-1.5 px-2 text-[8px] font-black border-primary/20 text-primary/60 tracking-[0.1em] bg-primary/5 rounded-lg">
                                  {folder.file_count} F
                                </Badge>
                                <Badge variant="outline" className="h-5 gap-1.5 px-2 text-[8px] font-black border-accent/20 text-accent/60 tracking-[0.1em] bg-accent/5 rounded-lg">
                                  {folder.node_count} N
                                </Badge>
                              </div>
                            </div>
                            {folder.description && (
                              <p className="text-[11px] text-muted-foreground/60 truncate font-bold mt-0.5 tracking-tight">
                                {folder.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 pr-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); setShowEdit(true); }}
                            className="p-2 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all duration-500"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeletePromptFolder(folder); }}
                            className="p-2 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all duration-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className={cn(
                            "ml-1 h-8 w-8 flex items-center justify-center rounded-[10px] text-primary transition-all duration-700",
                            (selectedFolder?.id === folder.id) ? "bg-primary text-white shadow-xl shadow-primary/30" : "opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0"
                          )}>
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card className="min-h-[380px] flex items-center justify-center rounded-[32px] border-dashed border-2 border-border/20 bg-secondary/5 backdrop-blur-xl">
              <CardContent className="text-center space-y-6 py-16">
                <div className="mx-auto w-20 h-20 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center animate-pulse">
                  <Cpu className="w-10 h-10 text-primary/30" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-black tracking-tight uppercase">No Folders Found</h2>
                  <p className="text-[13px] text-muted-foreground/60 font-bold max-w-[320px] mx-auto leading-relaxed">Create a folder to begin organizing your research data.</p>
                </div>
                <Button className="gap-2.5 rounded-xl h-12 px-8 font-black uppercase tracking-widest shadow-xl shadow-primary/20" onClick={() => setShowCreate(true)}>
                  <Plus className="w-4 h-4" />
                  Create Folder
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Folder Detail Area (The Greenhouse) */}
        {selectedFolder && (
          <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 overflow-hidden animate-in fade-in slide-in-from-right-12 duration-1000">
            <section className="flex-1 flex flex-col h-full min-h-0 w-full overflow-hidden glass-card rounded-[40px]">
              {/* Greenhouse Header */}
              <div className="border-b border-border/10 px-8 py-6 bg-secondary/20 relative overflow-hidden">
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-8 min-w-0">
                    <button
                      onClick={resetFolderSelection}
                      className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-white text-primary shadow-2xl shadow-primary/10 border border-primary/10 transition-all duration-500 hover:scale-110 hover:shadow-primary/20 active:scale-95"
                    >
                      <ArrowLeft className="w-5.5 h-5.5" />
                    </button>
                    <div className="min-w-0">
                      <h2 className="text-lg font-[900] tracking-tighter text-foreground uppercase truncate leading-none mb-1">{selectedFolder.name}</h2>
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1 grayscale opacity-40">
                          <Sprout className="w-3 h-3 text-primary animate-pulse" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Growth Zone</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground/30 font-bold">•</span>
                        <p className="text-[10px] text-muted-foreground/40 font-bold truncate italic tracking-tight">{selectedFolder.description || "Active Greenhouse Environment"}</p>
                      </div>
                    </div>
                  </div>
                  <IconButton 
                    icon={<X size={24} />} 
                    variant="ghost" 
                    className="rounded-xl h-11 w-11 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all duration-500" 
                    onClick={resetFolderSelection} 
                  />
                </div>
                {/* Decorative Icon Background */}
                <Sprout className="absolute -right-16 -bottom-16 w-64 h-64 text-primary opacity-[0.02] rotate-12" />
              </div>

              <CardContent className="flex flex-1 min-h-0 flex-col gap-4 p-6 overflow-hidden">
                {/* Optimized Bio-Status Bar */}
                <div className="flex flex-wrap items-center gap-4 border-b border-border/5 pb-6">
                  {[
                    { label: 'Files', value: selectedFolder.file_count, icon: FileText, color: 'text-primary' },
                    { label: 'Nodes', value: selectedFolder.node_count, icon: Network, color: 'text-accent' },
                    { label: 'Synced', value: formatDate(selectedFolder.updated_at), icon: Calendar, color: 'text-muted-foreground/60', isDate: true }
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2 rounded-xl bg-secondary/15 border border-border/5 shadow-sm">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center border border-current/10", stat.color, "bg-current/5")}>
                        <stat.icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-[14px] font-black tracking-tighter text-foreground leading-none">
                          {stat.isDate ? stat.value : <AnimatedNumber value={stat.value} />}
                        </p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 mt-0.5">{stat.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Growth Layers & Staging */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between border-b border-border/5 pb-4">
                     <div className="flex bg-secondary/30 p-1.5 rounded-[18px] border border-border/10 shadow-inner backdrop-blur-xl ring-1 ring-white/10">
                      {[
                        { id: 'nodes', label: 'Knowledge Base', icon: BrainCircuit },
                        { id: 'files', label: 'Source Files', icon: Layers },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setSelectedFolderTab(tab.id)}
                          className={cn(
                            'flex items-center gap-2 rounded-[12px] px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all duration-500',
                            selectedFolderTab === tab.id
                              ? 'bg-white text-primary shadow-xl shadow-primary/10 ring-1 ring-black/5'
                              : 'text-muted-foreground/40 hover:text-primary/60 hover:bg-white/30'
                          )}
                        >
                          <tab.icon className="w-4 h-4" />
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col min-h-0 mt-4 relative">
                     <Suspense fallback={<div className="flex-1 flex items-center justify-center py-40"><Loader2 className="animate-spin text-primary w-12 h-12" /></div>}>
                        <div className="flex-1 flex flex-col min-h-0">
                          {selectedFolderTab === 'nodes' ? (
                            <FolderNodesPanel
                              active={true}
                              folderContentSearch={folderContentSearch}
                              setFolderContentSearch={setFolderContentSearch}
                              nodeTypes={nodeTypes}
                              selectedNodeType={selectedNodeType}
                              setSelectedNodeType={setSelectedNodeType}
                              selectedFolder={selectedFolder}
                              nodeSearch={nodeSearch}
                              setNodeSearch={setNodeSearch}
                              fetchFolderNodes={fetchFolderNodes}
                              nodesLoading={nodesLoading}
                              filteredFolderNodes={filteredFolderNodes}
                            />
                          ) : (
                            <FolderFilesPanel
                              active={true}
                              folderContentSearch={folderContentSearch}
                              setFolderContentSearch={setFolderContentSearch}
                              filesLoading={filesLoading}
                              filteredFolderFiles={filteredFolderFiles}
                            />
                          )}
                        </div>
                     </Suspense>
                  </div>
                </div>
              </CardContent>
            </section>
          </div>
        )}
      </div>

      <Suspense fallback={null}>
        <FolderCrudModal
          open={showCreate}
          mode="create"
          onClose={() => setShowCreate(false)}
          onSuccess={async (createdFolder) => {
            setStatusMessage('');
            await refreshFolders();
            if (createdFolder?.id) {
              setSelectedFolderId(String(createdFolder.id));
            }
          }}
        />
        <FolderCrudModal
          open={showEdit}
          mode="edit"
          initialFolder={editingFolder}
          onClose={() => {
            setShowEdit(false);
            setEditingFolder(null);
          }}
          onSuccess={async (updatedFolder) => {
            setStatusMessage('');
            await refreshFolders();
            if (updatedFolder?.id && String(selectedFolder?.id || '') === String(updatedFolder.id)) {
              setSelectedFolder((current) => (current ? { ...current, ...updatedFolder } : current));
            }
          }}
        />
      </Suspense>
    </section>
  );
}
