import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  Fingerprint,
  GitCompareArrows,
  Link,
  Link2,
  Loader2,
  Tags,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Label } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useGlobalFolder } from '../contexts/GlobalFolderContext';
import { usePredictedLinks } from '../contexts/PredictedLinksContext';
import mlService from '../services/mlService';
import { BRAND_COLORS } from '../utils/visualPalette';

const TASKS = [
  { id: 'catalog', label: 'Catalog', icon: BrainCircuit, tone: 'emerald' },
  { id: 'linkPrediction', label: 'Link Prediction', icon: Link2, tone: 'sage' },
  { id: 'nodeClassification', label: 'Node Classification', icon: Tags, tone: 'amber' },
  { id: 'embeddings', label: 'Embeddings', icon: Fingerprint, tone: 'violet' },
  { id: 'similarity', label: 'Similarity', icon: GitCompareArrows, tone: 'teal' },
];

const initialState = {
  models: [],
  trainResult: null,
  linkPredictions: [],
  nodePredictions: [],
  embeddingResult: null,
  similarityResult: null,
  statusMsg: '',
  errorMsg: '',
};

function MLField({ label, children }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function MLPredictionPage() {
  const { selectedFolderId } = useGlobalFolder();
  const navigate = useNavigate();
  const { setPredictedLinks } = usePredictedLinks();
  const [activeTask, setActiveTask] = useState('catalog');
  const [isLoading, setIsLoading] = useState(false);
  const [state, setState] = useState(initialState);
  const [lpPipeline, setLpPipeline] = useState('my_lp_pipeline');
  const [lpModel, setLpModel] = useState('my_lp_model');
  const [lpThreshold, setLpThreshold] = useState(0.5);
  const [lpTopN, setLpTopN] = useState(50);
  const [ncPipeline, setNcPipeline] = useState('my_nc_pipeline');
  const [ncModel, setNcModel] = useState('my_nc_model');
  const [embMethod, setEmbMethod] = useState('fastRP');
  const [embDim, setEmbDim] = useState(128);
  const [similarityTopK, setSimilarityTopK] = useState(10);
  const [similarityCutoff, setSimilarityCutoff] = useState(0.1);

  const refreshCatalog = async () => {
    try {
      const data = await mlService.getModels();
      setState((prev) => ({
        ...prev,
        models: Array.isArray(data?.models) ? data.models : [],
      }));
    } catch (error) {
      console.error('Failed to load ML models:', error);
    }
  };

  useEffect(() => {
    void refreshCatalog();
  }, []);

  const updateState = (patch) => {
    setState((prev) => ({ ...prev, ...patch }));
  };

  const clearMessages = () => {
    updateState({
      trainResult: null,
      linkPredictions: [],
      nodePredictions: [],
      embeddingResult: null,
      similarityResult: null,
      statusMsg: '',
      errorMsg: '',
    });
  };

  const requireFolder = () => {
    if (!selectedFolderId) {
      updateState({ errorMsg: 'Open a folder first to run ML actions.' });
      return false;
    }
    return true;
  };

  const trainLinkPrediction = async () => {
    if (!requireFolder()) return;
    const pipeline = lpPipeline.trim();
    const model = lpModel.trim();
    if (!pipeline || !model) {
      updateState({ errorMsg: 'Pipeline name and model name are required.' });
      return;
    }

    setIsLoading(true);
    clearMessages();
    updateState({
      statusMsg: 'Training link prediction pipeline and generating model...',
    });

    try {
      const result = await mlService.trainLinkPrediction(selectedFolderId, pipeline, model);
      updateState({ trainResult: result, statusMsg: '' });
      await refreshCatalog();
      setActiveTask('catalog');
    } catch (error) {
      updateState({
        errorMsg: error?.response?.data?.detail || error?.message || 'Training failed.',
        statusMsg: '',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const trainNodeClassification = async () => {
    const pipeline = ncPipeline.trim();
    const model = ncModel.trim();
    if (!pipeline || !model) {
      updateState({ errorMsg: 'Pipeline name and model name are required.' });
      return;
    }

    setIsLoading(true);
    clearMessages();
    updateState({
      statusMsg: 'Encoding node types, training classifier, and saving the model...',
    });

    try {
      const result = await mlService.trainNodeClassification(pipeline, model);
      updateState({ trainResult: result, statusMsg: '' });
      await refreshCatalog();
      setActiveTask('catalog');
    } catch (error) {
      updateState({
        errorMsg: error?.response?.data?.detail || error?.message || 'Training failed.',
        statusMsg: '',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const predictLinks = async (modelName) => {
    if (!requireFolder()) return;
    setIsLoading(true);
    updateState({ errorMsg: '', statusMsg: 'Running link prediction on the current folder...' });
    try {
      const result = await mlService.predictLinks(selectedFolderId, modelName, lpThreshold, lpTopN);
      const predictions = Array.isArray(result?.predictions) ? result.predictions : [];
      updateState({
        linkPredictions: predictions,
        statusMsg: '',
      });
      setPredictedLinks(selectedFolderId, predictions.map((item, index) => ({
        id: `predicted:${selectedFolderId}:${item.source_id}:${item.target_id}:${index}`,
        source_id: item.source_id,
        target_id: item.target_id,
        probability: item.probability,
        type: 'PREDICTED_LINK',
        color: BRAND_COLORS.emerald,
        model_name: modelName,
        properties: {
          isPredicted: true,
          probability: item.probability,
          predictedLabel: `${item.source_name || item.source_id} -> ${item.target_name || item.target_id}`,
        },
      })));
      setActiveTask('linkPrediction');
    } catch (error) {
      updateState({
        errorMsg: error?.response?.data?.detail || error?.message || 'Prediction failed.',
        statusMsg: '',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const predictNodeClasses = async (modelName) => {
    setIsLoading(true);
    updateState({ errorMsg: '', statusMsg: 'Running node classification predictions...' });
    try {
      const result = await mlService.predictNodeClasses(modelName, 100);
      updateState({
        nodePredictions: Array.isArray(result?.predictions) ? result.predictions : [],
        statusMsg: '',
      });
      setActiveTask('nodeClassification');
    } catch (error) {
      updateState({
        errorMsg: error?.response?.data?.detail || error?.message || 'Prediction failed.',
        statusMsg: '',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateEmbeddings = async () => {
    if (!requireFolder()) return;
    setIsLoading(true);
    clearMessages();
    updateState({ statusMsg: `Generating ${embMethod} embeddings...` });
    try {
      const result = await mlService.generateEmbeddings(selectedFolderId, embMethod, embDim);
      updateState({ embeddingResult: result, statusMsg: '' });
      setActiveTask('embeddings');
    } catch (error) {
      updateState({
        errorMsg: error?.response?.data?.detail || error?.message || 'Embedding generation failed.',
        statusMsg: '',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runSimilarity = async () => {
    if (!requireFolder()) return;
    setIsLoading(true);
    clearMessages();
    updateState({ statusMsg: 'Computing node similarity across the current folder...' });
    try {
      const result = await mlService.nodeSimilarity(selectedFolderId, similarityTopK, similarityCutoff);
      updateState({ similarityResult: result, statusMsg: '' });
      setActiveTask('similarity');
    } catch (error) {
      updateState({
        errorMsg: error?.response?.data?.detail || error?.message || 'Similarity check failed.',
        statusMsg: '',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteModel = async (modelName) => {
    if (!window.confirm(`Delete model "${modelName}"?`)) return;
    setIsLoading(true);
    updateState({ errorMsg: '', statusMsg: '' });
    try {
      await mlService.dropModel(modelName);
      await refreshCatalog();
    } catch (error) {
      updateState({
        errorMsg: error?.response?.data?.detail || error?.message || 'Could not delete the model.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const activeTaskMeta = TASKS.find((task) => task.id === activeTask) || TASKS[0];
  const ActiveIcon = activeTaskMeta.icon;
  const canOpenPredictedLinks = activeTask === 'linkPrediction' && state.linkPredictions.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
          <span className="text-emerald-700 dark:text-emerald-400">ML Prediction</span>
        </h1>
        <p className="text-muted-foreground text-sm">
          Deep learning tools for finding structural patterns, hidden links, and node classifications.
        </p>
      </div>

      <Card variant="branded" className="flex min-h-0 flex-1 flex-col overflow-hidden border-border/50 shadow-2xl">
        <div className="border-b border-border/40 bg-card/40 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {TASKS.map((task) => {
              const Icon = task.icon;
              const active = task.id === activeTask;
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => {
                    setActiveTask(task.id);
                    updateState({ errorMsg: '', statusMsg: '' });
                  }}
                  className={[
                    'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300',
                    active
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 shadow-sm'
                      : 'border-border/50 bg-background/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4" />
                  {task.label}
                </button>
              );
            })}
          </div>
        </div>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 pt-4 lg:p-5 lg:pt-5">
          {activeTask === 'catalog' && (
            <div className="flex min-h-0 flex-1 flex-col space-y-4">
              {state.models.length === 0 ? (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 py-10 text-center">
                  <BrainCircuit className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-3 text-sm font-medium text-foreground">Laboratory empty</p>
                  <p className="mt-1 text-xs text-muted-foreground">Train a diagnostic model to begin analysis.</p>
                </div>
              ) : (
                <div className="grid min-h-0 gap-3 overflow-y-auto pr-1 lg:grid-cols-2">
                  {state.models.map((model, index) => {
                    const modelType = String(model?.modelType || model?.type || '');
                    const modelName = model?.modelName || model?.name || `Model ${index + 1}`;
                    const isLinkModel = modelType.toLowerCase().includes('link');
                    const isClassModel = modelType.toLowerCase().includes('classification');

                    return (
                      <div key={`${modelName}-${index}`} className="rounded-2xl border border-border/50 bg-background/40 p-4 shadow-sm hover:border-emerald-500/20 transition-colors group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-semibold group-hover:text-emerald-700 transition-colors">{modelName}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Scope:{' '}
                              <span className={isLinkModel ? 'text-emerald-600' : isClassModel ? 'text-amber-600' : 'text-foreground'}>
                                {modelType || 'General'}
                              </span>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteModel(modelName)}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            title="Delete model"
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10"
                            onClick={() => isLinkModel ? predictLinks(modelName) : isClassModel ? predictNodeClasses(modelName) : null}
                            disabled={isLoading}
                          >
                            Execute Model
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTask === 'linkPrediction' && (
            <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.84fr)]">
              <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4 text-sm text-emerald-700 dark:text-emerald-300">
                  <p className="font-bold flex items-center gap-2 mb-1"><Link2 className="h-4 w-4" /> Structural Inference</p>
                  Finds likely missing links between nodes by analyzing the topological neighborhood.
                </div>

                <div className="space-y-3">
                  <MLField label="Pipeline Name">
                    <Input value={lpPipeline} onChange={(e) => setLpPipeline(e.target.value)} disabled={isLoading} className="h-10 rounded-xl" />
                  </MLField>
                  <MLField label="Model Name">
                    <Input value={lpModel} onChange={(e) => setLpModel(e.target.value)} disabled={isLoading} className="h-10 rounded-xl" />
                  </MLField>
                  <div className="grid grid-cols-2 gap-3">
                    <MLField label="Threshold">
                      <Input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={lpThreshold}
                        onChange={(e) => setLpThreshold(Number(e.target.value))}
                        disabled={isLoading}
                        className="h-10 rounded-xl"
                      />
                    </MLField>
                    <MLField label="Top N">
                      <Input
                        type="number"
                        min="1"
                        max="200"
                        value={lpTopN}
                        onChange={(e) => setLpTopN(Number(e.target.value))}
                        disabled={isLoading}
                        className="h-10 rounded-xl"
                      />
                    </MLField>
                  </div>
                </div>

                <Button variant="gradient" className="h-11 w-full rounded-xl shadow-lg shadow-emerald-500/20" onClick={trainLinkPrediction} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Train Link Prediction
                </Button>
              </div>

              <div className="flex min-h-0 flex-col space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ActiveIcon className="h-4 w-4 text-emerald-600" />
                    Structural Insights
                  </div>
                  {canOpenPredictedLinks ? (
                    <button
                      type="button"
                      onClick={() => navigate('/graph/2d')}
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-500/10"
                    >
                      <Link className="h-3.5 w-3.5" />
                      Open in Graph
                    </button>
                  ) : null}
                </div>
                {state.linkPredictions.length === 0 ? (
                  <div className="flex min-h-0 flex-1 items-center rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground text-center">
                    Run prediction to see structural patterns found in the dataset.
                  </div>
                ) : (
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {state.linkPredictions.slice(0, 12).map((item, index) => (
                      <div key={index} className="rounded-xl border border-border/50 bg-background/40 px-3 py-2.5 text-sm hover:border-emerald-500/20 transition-colors">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 font-medium">
                            <span className="truncate">{item.source_name || item.source_id || 'Source'}</span>
                            <span className="mx-2 text-muted-foreground font-light">→</span>
                            <span className="truncate text-emerald-700">{item.target_name || item.target_id || 'Target'}</span>
                          </div>
                          <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 text-[10px]">
                            {typeof item.probability === 'number' ? `${(item.probability * 100).toFixed(1)}%` : 'Link'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTask === 'nodeClassification' && (
            <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.84fr)]">
              <div className="space-y-4">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-4 text-sm text-amber-700 dark:text-amber-300">
                  <p className="font-bold flex items-center gap-2 mb-1"><Tags className="h-4 w-4" /> Entity Classification</p>
                  Identifies potential mislabeling by comparing a node's topological features with its assigned type.
                </div>

                <div className="space-y-3">
                  <MLField label="Pipeline Name">
                    <Input value={ncPipeline} onChange={(e) => setNcPipeline(e.target.value)} disabled={isLoading} className="h-10 rounded-xl" />
                  </MLField>
                  <MLField label="Model Name">
                    <Input value={ncModel} onChange={(e) => setNcModel(e.target.value)} disabled={isLoading} className="h-10 rounded-xl" />
                  </MLField>
                </div>

                <Button variant="gradient" className="h-11 w-full rounded-xl shadow-lg shadow-emerald-500/20" onClick={trainNodeClassification} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Train Node Classifier
                </Button>
              </div>

              <div className="flex min-h-0 flex-col space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ActiveIcon className="h-4 w-4 text-amber-600" />
                  Classification Audit
                </div>
                {state.nodePredictions.length === 0 ? (
                  <div className="flex min-h-0 flex-1 items-center rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                    Classify your nodes to audit labeling integrity.
                  </div>
                ) : (
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {state.nodePredictions.slice(0, 16).map((item, index) => {
                      const matches = item.current_type === item.predicted_type;
                      return (
                        <div
                          key={index}
                          className={[
                            'rounded-xl border p-3 text-sm transition-colors',
                            matches
                              ? 'border-border/50 bg-background/40'
                              : 'border-amber-500/30 bg-amber-500/10 shadow-sm',
                          ].join(' ')}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate font-semibold">{item.name || 'Entity'}</span>
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                              <span className="text-muted-foreground">{item.current_type || 'Unknown'}</span>
                              <span className="text-muted-foreground/50">/</span>
                              <span className={matches ? 'text-emerald-600' : 'text-amber-600 underline decoration-amber-500/50 underline-offset-4'}>
                                {item.predicted_type || 'Unknown'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTask === 'embeddings' && (
            <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.84fr)]">
              <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4 text-sm text-emerald-700 dark:text-emerald-300">
                  <p className="font-bold flex items-center gap-2 mb-1"><Fingerprint className="h-4 w-4" /> Vector Embedding</p>
                  Generates dense numeric vectors for nodes to enable deep semantic and structural similarity analysis.
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {['fastRP', 'node2vec'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setEmbMethod(method)}
                      className={[
                        'rounded-xl border px-3 py-2.5 text-sm font-medium transition-all',
                        embMethod === method
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
                          : 'border-border/50 bg-background/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                      ].join(' ')}
                    >
                      {method === 'fastRP' ? 'FastRP' : 'Node2Vec'}
                    </button>
                  ))}
                </div>

                <MLField label={`Vector dimensions: ${embDim}`}>
                  <input
                    type="range"
                    min="64"
                    max="512"
                    step="32"
                    value={embDim}
                    onChange={(e) => setEmbDim(Number(e.target.value))}
                    className="w-full accent-emerald-500 h-2 bg-background/50 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>64D</span>
                    <span>256D</span>
                    <span>512D</span>
                  </div>
                </MLField>

                <Button variant="gradient" className="h-11 w-full rounded-xl shadow-lg shadow-emerald-500/20" onClick={generateEmbeddings} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Generate Embeddings
                </Button>
              </div>

              <div className="flex min-h-0 flex-col space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Fingerprint className="h-4 w-4 text-emerald-600" />
                  Vector Output
                </div>
                {state.embeddingResult ? (
                  <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border/50 bg-background/40 p-4">
                    <p className="text-sm font-bold text-emerald-700">
                      {state.embeddingResult.count || 0} entities processed
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Method: {state.embeddingResult.method || embMethod} · Dimensions: {state.embeddingResult.dimension || embDim}
                    </p>
                    <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                      {(state.embeddingResult.embeddings || []).slice(0, 10).map((row, index) => (
                        <div key={index} className="flex gap-2 rounded-lg border border-border/40 bg-white/5 px-3 py-2 text-xs font-mono">
                          <span className="min-w-0 flex-1 truncate font-sans font-medium text-foreground">{row.name || 'Entity'}</span>
                          <span className="text-emerald-600/60">
                            [{Array.isArray(row.embedding) ? row.embedding.slice(0, 3).map((value) => Number(value).toFixed(2)).join(',') : '...'},...]
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-0 flex-1 items-center rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground text-center">
                    Generate vectors to analyze topographic fingerprints.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTask === 'similarity' && (
            <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.84fr)]">
              <div className="space-y-4">
              <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 px-4 py-4 text-sm text-teal-700 dark:text-teal-300">
                  <p className="font-bold flex items-center gap-2 mb-1"><GitCompareArrows className="h-4 w-4" /> Topological Similarity</p>
                  Surfaces entities that occupy similar roles in the graph, facilitating discovery of parallel structures.
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MLField label="Limit (Top K)">
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={similarityTopK}
                      onChange={(e) => setSimilarityTopK(Number(e.target.value))}
                      disabled={isLoading}
                      className="h-10 rounded-xl"
                    />
                  </MLField>
                  <MLField label="Similarity Cutoff">
                    <Input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={similarityCutoff}
                      onChange={(e) => setSimilarityCutoff(Number(e.target.value))}
                      disabled={isLoading}
                      className="h-10 rounded-xl"
                    />
                  </MLField>
                </div>

                <Button variant="gradient" className="h-11 w-full rounded-xl shadow-lg shadow-emerald-500/20" onClick={runSimilarity} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Discover Patterns
                </Button>
              </div>

              <div className="flex min-h-0 flex-col space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <GitCompareArrows className="h-4 w-4 text-teal-600" />
                  Discovered Pairs
                </div>
                {state.similarityResult ? (
                  <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border/50 bg-background/40 p-4">
                    <p className="text-sm font-medium text-teal-700">
                      {state.similarityResult.count || 0} structural matches found
                    </p>
                    <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                      {(state.similarityResult.similarities || []).slice(0, 12).map((row, index) => (
                        <div key={index} className="flex items-center gap-3 rounded-lg border border-border/50 bg-white/5 px-3 py-2 text-xs">
                          <span className="min-w-0 flex-1 truncate font-medium">{row.source_name || 'Item A'}</span>
                          <div className="flex flex-col items-center gap-0.5 min-w-[50px]">
                            <span className="h-px w-full bg-teal-500/30" />
                            <span className="text-[9px] font-bold text-teal-600">{(row.similarity * 100).toFixed(0)}%</span>
                          </div>
                          <span className="min-w-0 flex-1 truncate text-right font-medium">{row.target_name || 'Item B'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-0 flex-1 items-center rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground text-center">
                    Compute similarity to surface ontological parallels.
                  </div>
                )}
              </div>
            </div>
          )}

          {state.statusMsg && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4 text-sm text-emerald-700 dark:text-emerald-300 shadow-sm animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin" />
              {state.statusMsg}
            </div>
          )}

          {state.errorMsg && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-4 text-sm text-red-700 dark:text-red-300 shadow-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {state.errorMsg}
            </div>
          )}

          {state.trainResult && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4 text-sm text-emerald-700 dark:text-emerald-300 shadow-sm animate-fade-in">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-bold">Training sequence finalized</p>
                <p className="mt-1 text-xs opacity-80">
                  Model <span className="font-bold text-emerald-800">"{state.trainResult.model_name || state.trainResult.modelName || 'active_model'}"</span> is archived in the catalog.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
