import React, { Suspense, lazy, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Upload as UploadIcon,
  FileText,
  FolderPlus,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Brain,
  Database,
  FileSpreadsheet,
  Zap,
  Network,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { uploadService } from '../services/uploadService';
import { useGlobalFolder } from '../contexts/GlobalFolderContext';
import { useNavigate } from 'react-router-dom';
import { UploadPageSkeleton } from '../components/skeletons/RoutePageSkeleton';

const TextIngest = lazy(() => import('../components/ingest/TextIngest').then((m) => ({ default: m.TextIngest })));
const CypherIngest = lazy(() => import('../components/ingest/CypherIngest').then((m) => ({ default: m.CypherIngest })));
const ExcelMapper = lazy(() => import('../components/ingest/ExcelMapper').then((m) => ({ default: m.ExcelMapper })));

export default function UploadPage() {
  const { currentFolder, selectedFolderId } = useGlobalFolder();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pipeline');
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles.map(f => ({ file: f, status: 'pending' }))]);
  }, []);

  const handleFileSelect = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles.map(f => ({ file: f, status: 'pending' }))]);
  }, []);

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async () => {
    if (!selectedFolderId || files.length === 0 || uploading) return;

    setUploading(true);
    setUploadProgress(0);

    // Mark all as uploading
    setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' })));

    try {
      const rawFiles = files.map(f => f.file);
      await uploadService.uploadFiles(
        selectedFolderId,
        rawFiles,
        (progress) => setUploadProgress(progress)
      );

      // Mark all as success
      setFiles(prev => prev.map(f => ({ ...f, status: 'success' })));
    } catch (err) {
      const detail = err.response?.data?.detail;
      let message = 'Upload failed';
      if (typeof detail === 'string') {
        message = detail;
      } else if (Array.isArray(detail)) {
        message = detail.map(d => d.msg || JSON.stringify(d)).join(', ');
      } else if (detail && typeof detail === 'object') {
        message = detail.msg || JSON.stringify(detail);
      }
      setFiles(prev => prev.map(f => ({ ...f, status: 'error', error: message })));
    } finally {
      setUploading(false);
    }
  };

  const tabs = [
    { id: 'pipeline', label: 'File Upload', icon: Brain, color: 'text-primary' },
    { id: 'excel', label: 'Excel/CSV Mapper', icon: FileSpreadsheet, color: 'text-accent' },
    { id: 'text', label: 'Paste Text', icon: FileText, color: 'text-accent' },
    { id: 'cypher', label: 'Direct Query', icon: Database, color: 'text-primary' },
  ];
  const activeTabPanelId = `upload-tab-panel-${activeTab}`;

  return (
    <section aria-labelledby="upload-page-title" className="mx-auto w-full max-w-[1360px] min-w-0 space-y-5 overflow-x-hidden px-2">
      {/* Page Title */}
      <div className="min-w-0 space-y-1">
        <div className="min-w-0 space-y-1">
          <Badge variant="outline" className="border-none bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
            Data Upload
          </Badge>
          <h1 id="upload-page-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
            Upload <span className="gradient-text">Workspace Data</span>
          </h1>
          <p className="max-w-2xl text-[13px] font-medium text-muted-foreground">
            Add files, tables, text, or direct queries to the selected workspace.
          </p>
        </div>
      </div>

      {/* Modern High-End Tabs */}
      <div className="w-full max-w-full overflow-x-auto pb-1">
        <div role="tablist" aria-label="Upload methods" className="flex min-w-[920px] items-stretch gap-2 rounded-3xl border border-border/10 bg-blackAlpha.200 p-1.5 shadow-inner">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`upload-tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`upload-tab-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex min-w-0 flex-1 items-center justify-center gap-2.5 overflow-hidden rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all duration-300 group sm:px-6',
                activeTab === tab.id
                  ? 'border border-primary/20 bg-primary/16 text-foreground shadow-md shadow-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-whiteAlpha.100'
              )}
            >
              <tab.icon className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", activeTab === tab.id ? "text-primary" : tab.color)} />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {!selectedFolderId && (
        <div className="rounded-2xl border border-red-500/15 bg-red-500/5 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-red-600">
              Select a folder first to define the upload destination.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-xl bg-red-500/10 text-[10px] font-black text-red-500 hover:bg-red-500/20"
              onClick={() => navigate('/folders')}
            >
              OPEN FOLDERS
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <Card className="flex min-h-[600px] w-full min-w-0 max-w-full flex-col overflow-hidden rounded-[32px] border-border/10 bg-card/60 shadow-2xl backdrop-blur-3xl">
        <CardContent id={activeTabPanelId} role="tabpanel" aria-labelledby={`upload-tab-${activeTab}`} className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          {!selectedFolderId ? (
            <div className="h-[500px] flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 animate-pulse">
                <AlertCircle className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black uppercase tracking-tight">No Active Workspace</h3>
                <p className="text-sm text-muted-foreground max-w-sm font-medium">Select a folder first to choose where uploaded data should go.</p>
              </div>
              <Button 
                variant="gradient" 
                className="h-12 rounded-2xl px-8 font-black shadow-lg shadow-emerald-500/20"
                onClick={() => navigate('/folders')}
              >
                Open Library
              </Button>
            </div>
          ) : (
            <>
              {activeTab === 'pipeline' && (
                <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)] lg:gap-12">
                  <div className="min-w-0 space-y-8 animate-in slide-in-from-left-8 duration-500">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black uppercase tracking-tight">Upload Files</h3>
                      <p className="text-sm text-muted-foreground font-medium">Drop files here and process them into the current workspace.</p>
                    </div>

                    {/* Drag & Drop Zone */}
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Upload files by dragging files here or opening the file picker"
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('file-upload').click()}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          document.getElementById('file-upload')?.click();
                        }
                      }}
                      className={cn(
                        'relative border-2 border-dashed rounded-[32px] p-20 text-center transition-all duration-500 cursor-pointer group',
                        isDragging
                          ? 'border-primary bg-primary/5 scale-[1.02] shadow-2xl'
                          : 'border-border/40 hover:border-primary/40 hover:bg-primary/5'
                      )}
                    >
                      <input id="file-upload" aria-label="Choose files to upload" type="file" multiple accept=".pdf,.txt,.csv,.json,.md,.docx" onChange={handleFileSelect} className="hidden" />
                      
                      <div className="space-y-4">
                        <div className={cn(
                          'w-20 h-20 rounded-3xl mx-auto flex items-center justify-center transition-all duration-500',
                          isDragging ? 'bg-primary text-white rotate-6 scale-110 shadow-xl' : 'bg-whiteAlpha.100 text-muted-foreground group-hover:text-primary'
                        )}>
                          <CloudUpload className="w-10 h-10" />
                        </div>
                        <div>
                          <p className="text-lg font-black uppercase tracking-tight">
                            {isDragging ? 'Release To Upload' : 'Drop Files Here'}
                          </p>
                          <p className="text-sm text-muted-foreground font-medium mt-1">
                            or <span className="text-primary font-bold decoration-2 underline-offset-4 hover:underline">browse files</span> from your device
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* File List */}
                    {files.length > 0 && (
                      <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between px-2">
                          <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">Upload Queue ({files.length})</h4>
                          <button onClick={() => setFiles([])} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:underline">Wipe All</button>
                        </div>
                        <div className="space-y-2 max-h-[250px] overflow-auto pr-2 custom-scrollbar">
                          {files.map((item, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-whiteAlpha.50 border border-border/10 group animate-in slide-in-from-right-4">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="truncate text-sm font-black text-foreground/90">{item.file.name}</p>
                                <p className="text-[10px] text-muted-foreground font-bold">{formatSize(item.file.size)}</p>
                              </div>
                              {item.status === 'success' ? <CheckCircle2 className="w-5 h-5 text-primary" /> :
                               item.status === 'error' ? <AlertCircle className="w-5 h-5 text-red-500" /> :
                               item.status === 'uploading' ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> :
                               <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="p-2 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><X className="w-4 h-4" /></button>
                              }
                            </div>
                          ))}
                        </div>
                        {uploading && (
                          <div className="w-full bg-whiteAlpha.100 rounded-full h-2 overflow-hidden shadow-inner" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress} aria-label="Upload progress">
                            <div className="h-full rounded-full bg-primary transition-all duration-300 shadow-lg shadow-primary/30" style={{ width: `${uploadProgress}%` }} />
                          </div>
                        )}
                        <Button
                          variant="gradient"
                          className="w-full h-14 rounded-2xl gap-3 text-base font-black shadow-xl shadow-primary/20"
                          disabled={uploading || files.every(f => f.status === 'success')}
                          onClick={handleUpload}
                        >
                          {uploading ? <><Loader2 className="w-5 h-5 animate-spin" /> Uploading... {uploadProgress}%</> :
                           files.every(f => f.status === 'success') ? <><CheckCircle2 className="w-5 h-5" /> Upload Complete</> :
                           <><Zap className="w-5 h-5" /> Start Upload</>}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="hidden min-w-0 lg:block space-y-8 animate-in slide-in-from-right-8 duration-500">
                    <div className="space-y-1">
                      <h3 className="text-xl font-black uppercase tracking-tight">Upload Notes</h3>
                      <p className="text-[11px] text-muted-foreground font-medium tracking-wide">A quick guide for cleaner imports.</p>
                    </div>
                    <div className="space-y-6">
                      {[
                        { title: 'Supported Files', desc: 'Use PDF, TXT, CSV, JSON, MD, or DOCX files for the upload flow.', icon: Zap },
                        { title: 'Workspace Scope', desc: 'All imported content is attached to the currently selected folder.', icon: Network },
                        { title: 'Review First', desc: 'Check the results before relying on them in graph and chat views.', icon: CheckCircle2 },
                      ].map((step, i) => (
                        <div key={i} className="flex gap-4 rounded-3xl border border-border/5 bg-whiteAlpha.50 p-5 transition-all group hover:border-primary/20">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0 transition-transform group-hover:scale-110">
                            <step.icon className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-[13px] font-black uppercase tracking-tight">{step.title}</h4>
                            <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">{step.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'text' && (
                <div className="animate-in slide-in-from-right-8 duration-500">
                  <div className="mb-8 space-y-1">
                    <h3 className="text-2xl font-black uppercase tracking-tight">Paste Text</h3>
                    <p className="text-sm text-muted-foreground font-medium">Paste plain text directly into the current workspace.</p>
                  </div>
                  <Suspense fallback={<UploadPageSkeleton />}>
                    <TextIngest folderId={selectedFolderId} />
                  </Suspense>
                </div>
              )}

              {activeTab === 'cypher' && (
                <div className="animate-in slide-in-from-right-8 duration-500">
                  <div className="mb-8 space-y-1">
                    <h3 className="text-2xl font-black uppercase tracking-tight">Direct Query</h3>
                    <p className="text-sm text-muted-foreground font-medium">Run a direct graph query in the current workspace.</p>
                  </div>
                  <Suspense fallback={<UploadPageSkeleton />}>
                    <CypherIngest folderId={selectedFolderId} />
                  </Suspense>
                </div>
              )}

              {activeTab === 'excel' && (
                <div className="animate-in slide-in-from-right-8 duration-500">
                  <div className="mb-8 space-y-1">
                    <h3 className="text-2xl font-black uppercase tracking-tight">Table Mapper</h3>
                    <p className="text-sm text-muted-foreground font-medium">Map Excel or CSV columns into graph fields step by step.</p>
                  </div>
                  <Suspense fallback={<UploadPageSkeleton />}>
                    <ExcelMapper folderId={selectedFolderId} />
                  </Suspense>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
