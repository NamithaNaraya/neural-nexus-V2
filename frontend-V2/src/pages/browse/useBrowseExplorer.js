import { useEffect, useRef, useState } from 'react';
import { browseService } from '../../services/browseService';
import { graphService } from '../../services/graphService';
import { useGlobalFolder } from '../../contexts/GlobalFolderContext';
import { PAGE_SIZE } from './constants';
import { groupNodesByType, sortNodes } from './helpers';

export function useBrowseExplorer() {
  const { selectedFolderId: folderId, currentFolder } = useGlobalFolder();
  const [nodeTypes, setNodeTypes] = useState([]);
  const [activeType, setActiveType] = useState('all');
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState('gallery');
  const [sortMode, setSortMode] = useState('name-asc');
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const forceRefreshRef = useRef(false);

  useEffect(() => {
    const handleCrud = () => {
      forceRefreshRef.current = true;
      setPage(1);
    };

    window.addEventListener('nnv2:graph-crud', handleCrud);
    return () => window.removeEventListener('nnv2:graph-crud', handleCrud);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadNodeTypes() {
      try {
        if (!folderId) {
          if (!ignore) {
            setNodeTypes([]);
            setActiveType('all');
          }
          return;
        }

        const response = await browseService.getNodeTypes(folderId, { force: forceRefreshRef.current });
        const types = Array.isArray(response?.types) ? response.types : [];

        if (!ignore) {
          setNodeTypes(types);
          setActiveType((current) => (
            current === 'all' || types.some((item) => item.type === current) ? current : 'all'
          ));
        }
      } catch (err) {
        console.error('Failed to load node types:', err);
        if (!ignore) {
          setNodeTypes([]);
          setActiveType('all');
        }
      }
    }

    loadNodeTypes();
    return () => {
      ignore = true;
    };
  }, [folderId]);

  useEffect(() => {
    setPage(1);
  }, [folderId, activeType, query]);

  useEffect(() => {
    let ignore = false;
    const searchTerm = query.trim();

    async function loadNodes() {
      setLoading(true);
      setError('');

      try {
        if (!folderId) {
          if (!ignore) {
            setNodes([]);
            setTotalPages(1);
          }
          return;
        }

        if (activeType === 'all') {
          const response = await graphService.getFolder(folderId, 600, { force: forceRefreshRef.current });
          const rawNodes = Array.isArray(response?.nodes) ? response.nodes : [];
          const filtered = searchTerm
            ? rawNodes.filter((node) => JSON.stringify(node).toLowerCase().includes(searchTerm.toLowerCase()))
            : rawNodes;

          const sorted = sortNodes(filtered, sortMode);
          const computedTotalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
          const safePage = Math.min(page, computedTotalPages);
          const startIndex = (safePage - 1) * PAGE_SIZE;
          const pageNodes = sorted.slice(startIndex, startIndex + PAGE_SIZE);

          if (!ignore) {
            setNodes(pageNodes);
            setTotalPages(computedTotalPages);
            if (safePage !== page) setPage(safePage);
          }
        } else {
          const response = await browseService.getNodesByType(activeType, folderId, page, PAGE_SIZE, searchTerm, {
            force: forceRefreshRef.current,
          });
          const rawNodes = Array.isArray(response?.nodes) ? response.nodes : [];
          const sorted = sortNodes(rawNodes, sortMode);

          if (!ignore) {
            setNodes(sorted);
            setTotalPages(Math.max(1, response?.total_pages || 1));
          }
        }
      } catch (err) {
        console.error('Failed to load browse data:', err);
        if (!ignore) {
          setNodes([]);
          setTotalPages(1);
          setError('Browse data could not be loaded right now.');
        }
      } finally {
        forceRefreshRef.current = false;
        if (!ignore) setLoading(false);
      }
    }

    loadNodes();
    return () => {
      ignore = true;
    };
  }, [folderId, activeType, page, query, sortMode]);

  const selectedTypeMeta = nodeTypes.find((item) => item.type === activeType);
  const totalKnownNodes = nodeTypes.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const groupedNodes = groupNodesByType(nodes);

  return {
    nodeTypes,
    folderId,
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
  };
}
