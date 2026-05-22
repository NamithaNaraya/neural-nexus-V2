import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input, Label } from '../../../components/ui/Input';
import { Loader2, Plus } from 'lucide-react';

export function FolderCreateForm({
  show,
  newFolderName,
  setNewFolderName,
  newFolderDesc,
  setNewFolderDesc,
  creating,
  onCreate,
  onCancel,
}) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="border-primary/40 shadow-md">
            <CardContent className="p-5">
              <form onSubmit={onCreate} className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="folder-name">Folder Name</Label>
                    <Input
                      id="folder-name"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="e.g. Herbal Medicine Research"
                      autoFocus
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="folder-desc">Description (optional)</Label>
                    <Input
                      id="folder-desc"
                      value={newFolderDesc}
                      onChange={(e) => setNewFolderDesc(e.target.value)}
                      placeholder="What's this folder about?"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-end">
                  <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="gradient"
                    className="gap-2"
                    disabled={creating}
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {creating ? 'Creating...' : 'Create Folder'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
