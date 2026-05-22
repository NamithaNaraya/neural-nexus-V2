import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowseFilters } from './components/BrowseFilters';
import { BrowseHero } from './components/BrowseHero';
import { BrowsePagination } from './components/BrowsePagination';
import { BrowseLoadingState, BrowseEmptyState } from './components/BrowseStates';
import { BrowseSummary } from './components/BrowseSummary';
import { useBrowseExplorer } from './useBrowseExplorer';
import { GalleryView } from './views/GalleryView';
import { GroupsView } from './views/GroupsView';
import { StreamView } from './views/StreamView';
import { TableView } from './views/TableView';

export default function BrowsePage() {
  const navigate = useNavigate();
  const {
    folderId,
    nodeTypes,
    activeType,
    setActiveType,
    query,
    setQuery,
    viewMode,
    setViewMode,
    sortMode,
    setSortMode,
    nodes,
    loading,
    error,
    page,
    setPage,
    totalPages,
    currentFolder,
    selectedTypeMeta,
    totalKnownNodes,
    groupedNodes,
  } = useBrowseExplorer();

  const handleOpenInGraph = (node) => {
    if (!node?.id) return;
    navigate(`/graph/2d?exploreId=${encodeURIComponent(String(node.id))}`);
  };

  const renderView = () => {
    switch (viewMode) {
      case 'stream':
        return <StreamView nodes={nodes} onOpenInGraph={handleOpenInGraph} />;
      case 'table':
        return <TableView nodes={nodes} onOpenInGraph={handleOpenInGraph} />;
      case 'groups':
        return <GroupsView groups={groupedNodes} />;
      case 'gallery':
      default:
        return <GalleryView nodes={nodes} onOpenInGraph={handleOpenInGraph} />;
    }
  };

  return (
    <section aria-labelledby="browse-page-title" className="space-y-6 pb-6">
      <BrowseHero
        totalKnownNodes={totalKnownNodes}
        totalTypes={nodeTypes.length}
        currentFolderName={currentFolder?.name}
      />

      <BrowseFilters
        query={query}
        setQuery={setQuery}
        activeType={activeType}
        setActiveType={setActiveType}
        sortMode={sortMode}
        setSortMode={setSortMode}
        nodeTypes={nodeTypes}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      <BrowseSummary
        resultCount={nodes.length}
        currentFolder={currentFolder}
        activeType={activeType}
        selectedTypeMeta={selectedTypeMeta}
        page={page}
        totalPages={totalPages}
      />

      {loading ? (
        <div aria-live="polite" aria-busy="true">
          <BrowseLoadingState />
        </div>
      ) : nodes.length > 0 ? (
        <>
          {renderView()}
          <BrowsePagination page={page} totalPages={totalPages} setPage={setPage} />
        </>
      ) : (
        <div aria-live="polite">
          <BrowseEmptyState query={query} error={error} />
        </div>
      )}
    </section>
  );
}
