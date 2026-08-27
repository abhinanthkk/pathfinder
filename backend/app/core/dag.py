from __future__ import annotations
from typing import Optional


class DAG:
    def __init__(self):
        self._nodes: dict[str, dict] = {}
        self._edges: dict[str, set[str]] = {}
        self._reverse: dict[str, set[str]] = {}

    def add_node(self, node_id: str, data: Optional[dict] = None):
        if node_id not in self._nodes:
            self._nodes[node_id] = data or {}
            self._edges[node_id] = set()
            self._reverse[node_id] = set()

    def add_edge(self, from_id: str, to_id: str):
        self.add_node(from_id)
        self.add_node(to_id)
        self._edges[from_id].add(to_id)
        self._reverse[to_id].add(from_id)

    def has_cycle(self) -> bool:
        WHITE, GRAY, BLACK = 0, 1, 2
        color = {n: WHITE for n in self._nodes}

        def dfs(node: str) -> bool:
            color[node] = GRAY
            for neighbor in self._edges.get(node, set()):
                if color[neighbor] == GRAY:
                    return True
                if color[neighbor] == WHITE and dfs(neighbor):
                    return True
            color[node] = BLACK
            return False

        for node in self._nodes:
            if color[node] == WHITE:
                if dfs(node):
                    return True
        return False

    def topological_sort(self) -> list[str]:
        if not self._nodes:
            return []

        in_degree = {n: 0 for n in self._nodes}
        for n in self._nodes:
            for m in self._edges.get(n, set()):
                in_degree[m] = in_degree.get(m, 0) + 1

        # Kahn's algorithm with a stable priority queue for deterministic output.
        import heapq
        heap = [n for n in self._nodes if in_degree.get(n, 0) == 0]
        heapq.heapify(heap)
        result: list[str] = []

        while heap:
            node = heapq.heappop(heap)
            result.append(node)
            for m in sorted(self._edges.get(node, set())):
                in_degree[m] -= 1
                if in_degree[m] == 0:
                    heapq.heappush(heap, m)

        # Any nodes left with positive in-degree are part of a cycle; break the
        # remaining cycles deterministically (sorted by id) rather than failing.
        remaining = [n for n in self._nodes if in_degree.get(n, 0) > 0]
        result.extend(sorted(remaining))

        return result

    def get_prerequisites(self, node_id: str) -> set[str]:
        return self._reverse.get(node_id, set())

    def get_dependents(self, node_id: str) -> set[str]:
        return self._edges.get(node_id, set())

    def get_all_prerequisites_transitive(self, node_id: str) -> set[str]:
        result = set()
        queue = list(self._reverse.get(node_id, set()))
        while queue:
            current = queue.pop(0)
            if current in result:
                continue
            result.add(current)
            queue.extend(self._reverse.get(current, set()))
        return result

    def get_node_data(self, node_id: str) -> Optional[dict]:
        return self._nodes.get(node_id)

    @property
    def nodes(self) -> list[str]:
        return list(self._nodes.keys())
