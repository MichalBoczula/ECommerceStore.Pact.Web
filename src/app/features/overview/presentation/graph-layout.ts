import { DependencyGraph } from '../domain/overview.models';

export interface GraphNode { readonly applicationId: string; readonly x: number; readonly y: number; }
export interface GraphPath { readonly id: string; readonly label: string; readonly path: string; readonly empty: boolean; readonly focusX: number; readonly focusY: number; }
export interface GraphLayout { readonly nodes: readonly GraphNode[]; readonly paths: readonly GraphPath[]; readonly width: number; readonly height: number; }

/** Geometry only. Breaking a visual cycle never changes edges or implies an execution order. */
export function graphLayout(graph: DependencyGraph): GraphLayout {
  const remaining = new Set([...graph.nodes].sort()); const ranks = new Map<string, number>();
  while (remaining.size) {
    const ready = [...remaining].filter(node => graph.edges.every(e => e.integration.providerApplicationId !== node || !remaining.has(e.integration.consumerApplicationId)));
    if (!ready.length) ready.push([...remaining][0]);
    for (const node of ready) {
      const parents = graph.edges.filter(e => e.integration.providerApplicationId === node).map(e => ranks.get(e.integration.consumerApplicationId)).filter((rank): rank is number => rank !== undefined);
      ranks.set(node, parents.length ? Math.max(...parents) + 1 : 0); remaining.delete(node);
    }
  }
  const columns = new Map<number, string[]>();
  for (const [node, rank] of ranks) columns.set(rank, [...(columns.get(rank) ?? []), node]);
  const height = Math.max(292, ...[...columns.values()].map(column => column.length * 116 + 48));
  const nodes = [...columns].flatMap(([rank, column]) => column.map((applicationId, index) => ({ applicationId, x: 16 + rank * 192, y: (height - column.length * 116) / 2 + index * 116 })));
  const positions = new Map(nodes.map(n => [n.applicationId, n]));
  const paths = graph.edges.map(edge => {
    const source = positions.get(edge.integration.consumerApplicationId)!; const target = positions.get(edge.integration.providerApplicationId)!;
    const forward = target.x > source.x; const x1 = source.x + 160; const y1 = source.y + 38; const x2 = target.x; const y2 = target.y + 38;
    const bend = forward ? (x1 + x2) / 2 : x1 + 48;
    return { id: edge.integration.id, label: `${edge.integration.consumerApplicationId} → ${edge.integration.providerApplicationId}`, empty: edge.matchingReports.total === 0,
      focusX: forward ? (x1 + x2) / 2 : (source.x + 80 + 3 * bend + 3 * (x2 - 24) + target.x + 80) / 8,
      focusY: forward ? (y1 + y2) / 2 : (source.y + 76 + 6 * (height - 8) + target.y + 76) / 8,
      path: forward ? `M ${x1} ${y1} C ${bend} ${y1}, ${bend} ${y2}, ${x2} ${y2}` : `M ${source.x + 80} ${source.y + 76} C ${bend} ${height - 8}, ${x2 - 24} ${height - 8}, ${target.x + 80} ${target.y + 76}` };
  });
  return { nodes, paths, width: Math.max(760, ...nodes.map(n => n.x + 176)), height };
}
