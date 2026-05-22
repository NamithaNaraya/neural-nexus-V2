import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { FolderOpen, FileText, Network, X, GitFork, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '../../../components/ui/Skeleton';
import { AnimatedNumber } from '../../../components/shared/AnimatedNumber';

export function FolderDetailsPanel({
  open,
  selectedFolder,
  folderFiles,
  filesLoading,
  nodeTypes = [],
  selectedNodeType = '',
  onNodeTypeChange = () => {},
  nodeSearch = '',
  onNodeSearch = () => {},
  folderNodes = [],
  nodesLoading = false,
  nodesPage = 1,
  nodesTotalPages = 0,
  onNodePageChange = () => {},
  onClose,
  formatDate,
}) {
  if (!open || !selectedFolder) return null;

  const fileBadgeColor = (status) => {
    if (status === 'completed') return 'success';
    if (status === 'processing') return 'info';
    if (status === 'failed') return 'destructive';
    return 'secondary';
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="shadow-lg border-primary/40">
            <div className="p-5 border-b border-border/30 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-primary" />
                  {selectedFolder.name}
                </h2>
                {selectedFolder.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedFolder.description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                <div className="p-3 rounded-xl bg-muted/20 border border-border/30 text-center">
                  <p className="text-xl font-bold"><AnimatedNumber value={selectedFolder.file_count} /></p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Files</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border border-border/30 text-center">
                  <p className="text-xl font-bold"><AnimatedNumber value={selectedFolder.node_count} /></p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Nodes</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border border-border/30 text-center">
                  <p className="text-xl font-bold">{formatDate(selectedFolder.updated_at)}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Updated</p>
                </div>
              </div>

              {filesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 rounded-lg" />
                  ))}
                </div>
              ) : folderFiles.length > 0 ? (
                <div className="space-y-2">
                  {folderFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 border border-border/20 hover:bg-muted/20 transition-colors duration-200"
                    >
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.filename}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <Badge variant={fileBadgeColor(file.status)} className="text-[10px]">
                            {file.status}
                          </Badge>
                          <span className="inline-flex items-center gap-1">
                            <Network className="w-3 h-3" />
                            {file.node_count} nodes
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <GitFork className="w-3 h-3" />
                            {file.relationship_count} rels
                          </span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px] uppercase shrink-0">
                        {file.file_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No files in this folder</p>
                  <p className="text-xs mt-1 text-muted-foreground/50">Upload files on the Upload page</p>
                </div>
              )}

              {/* Node browser section - from /browse endpoints (folder-specific) */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-3">Browse folder nodes</h3>
                {nodesLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-12 rounded-lg" />
                    ))}
                  </div>
                ) : nodeTypes.length === 0 ? (
                  <div className="rounded-lg border border-border/30 bg-muted/10 p-6 text-muted-foreground text-sm">
                    No nodes found in this folder yet. Try uploading or processing data first.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 mb-3">
                      <Input
                        value={nodeSearch}
                        onChange={(e) => onNodeSearch(e.target.value)}
                        placeholder="Search nodes in folder..."
                        className="h-10"
                      />
                      <span className="px-3 py-2 rounded-md bg-muted/20 text-xs text-muted-foreground font-medium border border-border/60 flex items-center">
                        {folderNodes.length} shown
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {nodeTypes.map((t) => (
                        <button
                          key={t.type}
                          type="button"
                          onClick={() => onNodeTypeChange(t.type)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition ${selectedNodeType === t.type ? 'bg-primary text-white border-primary' : 'bg-muted/20 text-muted-foreground border-border/60 hover:bg-muted/40'}`}
                        >
                          {t.type} ({t.count})
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2 max-h-[38vh] overflow-y-auto pr-1">
                      {folderNodes.length === 0 ? (
                        <div className="rounded-lg border border-border/30 bg-muted/10 p-4 text-sm text-muted-foreground">
                          No nodes in this type. Try selecting another type.
                        </div>
                      ) : (
                        folderNodes.map((n) => (
                          <div key={n.id} className="p-3 rounded-lg border border-border/20 bg-white shadow-sm flex justify-between items-start gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{n.name || n.id}</p>
                              <div className="flex flex-wrap gap-1 mt-1 text-xs text-muted-foreground">
                                <span className="px-2 py-0.5 rounded-full bg-muted/20">{n.type || 'Entity'}</span>
                                <span className="px-2 py-0.5 rounded-full bg-muted/20">{Object.values(n.connections || {}).reduce((sum, v) => sum + v, 0)} links</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {nodesTotalPages > 1 && (
                      <div className="flex items-center justify-end gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => onNodePageChange(Math.max(1, nodesPage - 1))}
                          disabled={nodesPage <= 1}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border/30 text-xs"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" /> Prev
                        </button>
                        <span className="text-xs text-muted-foreground">Page {nodesPage} of {nodesTotalPages}</span>
                        <button
                          type="button"
                          onClick={() => onNodePageChange(Math.min(nodesTotalPages, nodesPage + 1))}
                          disabled={nodesPage >= nodesTotalPages}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border/30 text-xs"
                        >
                          Next <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
