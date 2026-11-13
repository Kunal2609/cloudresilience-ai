"""Graph algorithms and NetworkX graph construction for CloudResilience AI."""
from collections import deque
from typing import Dict, List, Set, Any, Tuple, Optional
import networkx as nx
from app.schemas.models import (
    VirtualArchitecture,
    VirtualResource,
    VirtualEdge,
    RelationshipType,
    ResourceType,
    ResourceState,
    CriticalityLevel,
    SecurityExposure,
    BlastRadiusAnalysis,
)

class CloudArchitectureGraph:
    """Multi-layer directed graph representation of cloud infrastructure."""

    def __init__(self, architecture: VirtualArchitecture):
        self.architecture = architecture
        self.resources_by_id: Dict[str, VirtualResource] = {
            r.id: r for r in architecture.resources
        }
        self.edges_by_id: Dict[str, VirtualEdge] = {
            e.id: e for e in architecture.edges
        }

        # Full directed multi-relationship graph
        self.g = nx.DiGraph()

        # Specific semantics subgraphs
        self.dependency_graph = nx.DiGraph() # Edge: Dependent -> Dependency (A depends on B)
        self.propagation_graph = nx.DiGraph() # Edge: Dependency -> Dependent (Failure in B flows to A)
        self.security_graph = nx.DiGraph() # Edge: Identity/Service -> Resource (reachability & permissions)
        self.failover_graph = nx.DiGraph() # Edge: Primary -> Standby

        self._build_graphs()

    def _build_graphs(self):
        # Add nodes with metadata
        for res in self.architecture.resources:
            node_attrs = {
                "id": res.id,
                "name": res.name,
                "type": res.type.value if hasattr(res.type, "value") else str(res.type),
                "criticality": res.criticality.value if hasattr(res.criticality, "value") else str(res.criticality),
                "state": res.state.value if hasattr(res.state, "value") else str(res.state),
                "security_exposure": res.security_exposure.value if hasattr(res.security_exposure, "value") else str(res.security_exposure),
                "has_redundancy": res.has_redundancy,
                "redundant_target_id": res.redundant_target_id,
                "is_spof": res.is_spof,
                "az": res.az,
                "region": res.region,
                "rto_minutes": res.rto_minutes,
                "rpo_minutes": res.rpo_minutes,
                "config": res.config,
            }
            self.g.add_node(res.id, **node_attrs)
            self.dependency_graph.add_node(res.id, **node_attrs)
            self.propagation_graph.add_node(res.id, **node_attrs)
            self.security_graph.add_node(res.id, **node_attrs)
            self.failover_graph.add_node(res.id, **node_attrs)

        # Add edges according to relationship semantics
        for edge in self.architecture.edges:
            if not edge.is_active:
                continue
            if edge.source not in self.resources_by_id or edge.target not in self.resources_by_id:
                continue

            rel_str = edge.relationship.value if hasattr(edge.relationship, "value") else str(edge.relationship)
            edge_attrs = {
                "id": edge.id,
                "relationship": rel_str,
                "permission_level": edge.permission_level,
                "latency_ms": edge.latency_ms,
                "description": edge.description,
                "dependency_strength": edge.dependency_strength,
                "propagation_rules": edge.propagation_rules,
                "config": edge.config,
            }
            failure_propagates = edge.dependency_strength != 0 and edge.propagation_rules.get("failure", True) is not False
            self.g.add_edge(edge.source, edge.target, **edge_attrs)

            if edge.relationship == RelationshipType.DEPENDS_ON:
                # source depends on target
                self.dependency_graph.add_edge(edge.source, edge.target, **edge_attrs)
                # Failure flows in opposite direction: target failure affects source
                if failure_propagates:
                    self.propagation_graph.add_edge(edge.target, edge.source, **edge_attrs)

            elif edge.relationship == RelationshipType.FAILOVER_TO:
                self.failover_graph.add_edge(edge.source, edge.target, **edge_attrs)

            elif edge.relationship in (RelationshipType.HAS_PERMISSION, RelationshipType.ASSUMES_ROLE):
                # Only explicit grants and modeled role assumptions establish
                # an authorization path. Network connectivity is tracked by
                # the architecture graph, but cannot grant data access.
                self.security_graph.add_edge(edge.source, edge.target, **edge_attrs)

            elif edge.relationship in (RelationshipType.NETWORK_REACHABLE, RelationshipType.CONNECTS_TO):
                # Network connections can also propagate traffic disruptions
                if failure_propagates:
                    self.propagation_graph.add_edge(edge.target, edge.source, **edge_attrs)

            elif edge.relationship == RelationshipType.DATA_FLOW:
                # A failed data producer affects its consumers in the direction
                # opposite to the configured producer -> consumer flow.
                if failure_propagates and edge.propagation_rules.get("data_failure", True) is not False:
                    self.propagation_graph.add_edge(edge.source, edge.target, **edge_attrs)

    # ------------------ Graph Metric Algorithms ------------------

    def degree_centrality(self) -> Dict[str, float]:
        """Calculates normalized degree centrality for all nodes."""
        if len(self.g) <= 1:
            return {n: 0.0 for n in self.g.nodes}
        return nx.degree_centrality(self.g)

    def betweenness_centrality(self) -> Dict[str, float]:
        """Calculates normalized betweenness centrality identifying bridge components."""
        if len(self.g) <= 2:
            return {n: 0.0 for n in self.g.nodes}
        return nx.betweenness_centrality(self.g)

    def detect_cycles(self) -> List[List[str]]:
        """Detects cyclic dependencies in the architecture."""
        try:
            return list(nx.simple_cycles(self.dependency_graph))
        except Exception:
            return []

    def topological_sort_dependencies(self) -> List[str]:
        """Returns topological ordering of services (base dependencies first)."""
        try:
            # Reversing dependency graph to get order of startup: leaf dependencies first
            reversed_dep = self.dependency_graph.reverse()
            return list(nx.topological_sort(reversed_dep))
        except nx.NetworkXUnfeasible:
            # Graph has cycles; fallback to in-degree ordering
            in_degrees = dict(self.dependency_graph.in_degree())
            return sorted(in_degrees.keys(), key=lambda k: in_degrees[k])

    def find_spofs(self) -> List[str]:
        """Identifies Single Points of Failure based on graph structure and lack of redundancy."""
        spofs = set()
        for res_id, res in self.resources_by_id.items():
            if res.is_spof:
                spofs.add(res_id)
                continue

            # Check if has redundancy or failover edge
            has_failover_edge = self.failover_graph.out_degree(res_id) > 0 or res.has_redundancy
            if has_failover_edge:
                continue

            # Check how many critical dependents rely on this node
            dependents = list(self.propagation_graph.successors(res_id)) if res_id in self.propagation_graph else []
            if len(dependents) >= 2 or any(
                self.resources_by_id.get(dep) and self.resources_by_id[dep].criticality == CriticalityLevel.CRITICAL
                for dep in dependents
            ):
                spofs.add(res_id)

        return sorted(list(spofs))

    # ------------------ Traversal Algorithms ------------------

    def bfs_propagation(self, start_node_id: str) -> List[Tuple[str, str, int]]:
        """
        Executes Breadth-First Search along failure propagation paths.
        Returns list of (parent_id, node_id, depth).
        """
        if start_node_id not in self.propagation_graph:
            return []
        
        visited = {start_node_id}
        queue = deque([(start_node_id, 0)])
        results = []

        while queue:
            current, depth = queue.popleft()
            for neighbor in self.propagation_graph.successors(current):
                if neighbor not in visited:
                    visited.add(neighbor)
                    results.append((current, neighbor, depth + 1))
                    queue.append((neighbor, depth + 1))
        return results

    def dfs_attack_paths(self, start_identity_id: str, max_depth: int = 6) -> List[List[str]]:
        """
        Executes Depth-First Search on security permission graph to uncover lateral attack paths.
        """
        if start_identity_id not in self.security_graph:
            return []

        all_paths = []
        
        def dfs(current_id: str, current_path: List[str], depth: int):
            if depth >= max_depth:
                return
            for neighbor in self.security_graph.successors(current_id):
                if neighbor not in current_path:
                    new_path = current_path + [neighbor]
                    all_paths.append(new_path)
                    dfs(neighbor, new_path, depth + 1)

        dfs(start_identity_id, [start_identity_id], 1)
        return all_paths

    def calculate_blast_radius(self, initiating_resource_id: str) -> BlastRadiusAnalysis:
        """
        Calculates the blast radius for a catastrophic failure of initiating_resource_id,
        evaluating direct, indirect, and unaffected resources, plus redundancy protection.
        """
        total_res = len(self.architecture.resources)
        if total_res == 0:
            return BlastRadiusAnalysis(
                initiating_resource_id=initiating_resource_id,
                total_resources=0,
                directly_affected_ids=[],
                indirectly_affected_ids=[],
                unaffected_ids=[],
                critical_services_at_risk_ids=[],
                spof_ids=[],
                percentage_affected=0.0,
                propagation_paths=[]
            )

        initiator = self.resources_by_id.get(initiating_resource_id)
        redundancy_saved = []

        # Check if initiating resource has active failover
        has_active_failover = False
        if initiator and (initiator.has_redundancy or self.failover_graph.out_degree(initiating_resource_id) > 0):
            # If failover is available, primary outage is absorbed!
            has_active_failover = True
            standby_targets = list(self.failover_graph.successors(initiating_resource_id))
            if standby_targets:
                redundancy_saved.extend(standby_targets)
            elif initiator.redundant_target_id:
                redundancy_saved.append(initiator.redundant_target_id)

        directly_affected = set()
        indirectly_affected = set()
        propagation_paths = []

        if not has_active_failover:
            # Primary failed without failover: propagate along propagation graph
            if initiating_resource_id in self.propagation_graph:
                direct_neighbors = list(self.propagation_graph.successors(initiating_resource_id))
                for neighbor in direct_neighbors:
                    directly_affected.add(neighbor)
                    propagation_paths.append([initiating_resource_id, neighbor])

                # Run BFS for indirect dependents
                bfs_steps = self.bfs_propagation(initiating_resource_id)
                for parent, node, depth in bfs_steps:
                    if depth > 1:
                        indirectly_affected.add(node)
                        # Find path from root
                        try:
                            path = nx.shortest_path(self.propagation_graph, initiating_resource_id, node)
                            propagation_paths.append(path)
                        except Exception:
                            pass

        all_affected = {initiating_resource_id} | directly_affected | indirectly_affected
        unaffected = [r.id for r in self.architecture.resources if r.id not in all_affected]

        critical_at_risk = [
            r_id for r_id in all_affected
            if self.resources_by_id.get(r_id) and self.resources_by_id[r_id].criticality in (CriticalityLevel.CRITICAL, CriticalityLevel.HIGH)
        ]

        spofs = self.find_spofs()

        pct = round((len(all_affected) / total_res) * 100.0, 1)

        return BlastRadiusAnalysis(
            initiating_resource_id=initiating_resource_id,
            total_resources=total_res,
            directly_affected_ids=sorted(list(directly_affected)),
            indirectly_affected_ids=sorted(list(indirectly_affected)),
            unaffected_ids=sorted(unaffected),
            critical_services_at_risk_ids=sorted(critical_at_risk),
            spof_ids=spofs,
            percentage_affected=pct,
            propagation_paths=propagation_paths,
            redundancy_saved_ids=redundancy_saved
        )
