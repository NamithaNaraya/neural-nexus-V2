import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { GraphNodeCrudModal } from '../../components/crud';
import { graphService } from '../../services/graphService';
import { filterGraphData } from './filterGraphData';
import { getNodeTypeColor, withAlpha } from './colorSystem';

export default function GraphPropertyTablePage(props) {
  const {
    folderId,
    graphData: graphDataProp = null,
    nodeTypeFilters,
    relationshipTypeFilters,
    nodeTypeColors = {},
    minDegree,
    showOrphans,
    nodeSearch,
    searchResultIds = null,
  } = props;

  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudMode, setCrudMode] = useState('create');
  const [activeNode, setActiveNode] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const forceRefreshRef = useRef(false);

  useEffect(() => {
    const handleCrud = () => {
      forceRefreshRef.current = true;
      setRefreshToken((value) => value + 1);
    };

    window.addEventListener('nnv2:graph-crud', handleCrud);
    return () => window.removeEventListener('nnv2:graph-crud', handleCrud);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!folderId) {
          setGraphData({ nodes: [], links: [] });
          return;
        }
        if (graphDataProp) {
          setGraphData(graphDataProp);
          return;
        }
        const data = await graphService.getFolder(folderId, 10000, { force: forceRefreshRef.current });
        setGraphData(data);
      } catch (err) {
        console.error('Failed to load graph:', err);
      } finally {
        forceRefreshRef.current = false;
        setLoading(false);
      }
    };
    load();
  }, [folderId, refreshToken, graphDataProp]);

  const filteredGraph = useMemo(
    () =>
      filterGraphData(graphData, {
        nodeTypeFilters,
        relationshipTypeFilters,
        minDegree,
        showOrphans,
        nodeSearch,
        searchResultIds,
      }),
    [graphData, nodeTypeFilters, relationshipTypeFilters, minDegree, showOrphans, nodeSearch, searchResultIds]
  );

  const sortedNodes = useMemo(() => {
    const nodes = [...filteredGraph.nodes];
    nodes.sort((a, b) => {
      let aVal = a[sortBy] ?? '';
      let bVal = b[sortBy] ?? '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      let result = 0;
      if (aVal < bVal) result = -1;
      else if (aVal > bVal) result = 1;
      return sortOrder === 'asc' ? result : -result;
    });
    return nodes.slice(0, 500);
  }, [filteredGraph.nodes, sortBy, sortOrder]);

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortOrder((value) => (value === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(key);
    setSortOrder('asc');
  };

  return (
    <div className="h-full p-5">
      {loading ? (
        <Skeleton className="h-full rounded-[22px]" />
      ) : (
        <Card className="h-full overflow-hidden rounded-[22px] border border-border/60 bg-card shadow-[0_16px_38px_rgba(15,23,42,0.08)]">
          <CardContent className="h-full p-0">
            <div className="h-full overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                  <tr className="border-b border-border">
                    <th
                      onClick={() => toggleSort('name')}
                      className="cursor-pointer px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground hover:bg-muted"
                    >
                      <div className="flex items-center gap-1">
                        Name {sortBy === 'name' ? <ChevronDown className="h-3 w-3" /> : null}
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('type')}
                      className="cursor-pointer px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground hover:bg-muted"
                    >
                      <div className="flex items-center gap-1">
                        Type {sortBy === 'type' ? <ChevronDown className="h-3 w-3" /> : null}
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('degree')}
                      className="cursor-pointer px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground hover:bg-muted"
                    >
                      <div className="flex items-center gap-1">
                        Degree {sortBy === 'degree' ? <ChevronDown className="h-3 w-3" /> : null}
                      </div>
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Description</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedNodes.map((node, idx) => {
                    const nodeType = node.type || 'Unknown';
                    const baseColor = getNodeTypeColor(nodeType, nodeTypeColors);
                    return (
                      <tr
                        key={node.id}
                        className={`${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'} cursor-pointer hover:bg-muted/40`}
                        onClick={() => {
                          setCrudMode('edit');
                          setActiveNode(node);
                          setCrudOpen(true);
                        }}
                      >
                        <td className="px-4 py-2 text-xs font-medium">{node.name || '-'}</td>
                        <td className="px-4 py-2 text-xs">
                          <span
                            className="inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium"
                            style={{
                              backgroundColor: withAlpha(baseColor, '22'),
                              borderColor: withAlpha(baseColor, '55'),
                              color: baseColor,
                            }}
                          >
                            {nodeType}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs font-semibold">{node.degree || 0}</td>
                        <td className="max-w-sm truncate px-4 py-2 text-xs text-muted-foreground">{node.description || '-'}</td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            className="mr-2 rounded-md border border-border/50 px-2 py-1 text-[10px] font-medium hover:bg-muted/50"
                            onClick={(event) => {
                              event.stopPropagation();
                              setCrudMode('edit');
                              setActiveNode(node);
                              setCrudOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-red-500/20 px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-500/5"
                            onClick={async (event) => {
                              event.stopPropagation();
                              await graphService.deleteNode(node.id, folderId);
                              setRefreshToken((value) => value + 1);
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <GraphNodeCrudModal
        open={crudOpen}
        mode={crudMode}
        folderId={folderId}
        initialNode={activeNode}
        onClose={() => setCrudOpen(false)}
        onSuccess={() => setRefreshToken((value) => value + 1)}
      />
    </div>
  );
}
