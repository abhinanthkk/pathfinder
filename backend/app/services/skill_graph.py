from __future__ import annotations
from pathlib import Path
from typing import Optional
import yaml

from app.core.dag import DAG

CONFIG_DIR = Path(__file__).resolve().parent.parent.parent / "config"


class SkillGraph:
    def __init__(self):
        self.skills: dict[str, dict] = {}
        self.goals: dict[str, dict] = {}
        self.resources: dict[str, dict] = {}
        self.graph = DAG()
        self._load()

    def _load(self):
        self._load_skills()
        self._load_goals()
        self._load_resources()
        self._build_graph()

    def _load_skills(self):
        path = CONFIG_DIR / "skills.yaml"
        with open(path) as f:
            data = yaml.safe_load(f)
        self.skills = data.get("skills", {})

    def _load_goals(self):
        path = CONFIG_DIR / "goals.yaml"
        with open(path) as f:
            data = yaml.safe_load(f)
        self.goals = data.get("goals", {})

    def _load_resources(self):
        path = CONFIG_DIR / "courses.yaml"
        with open(path) as f:
            data = yaml.safe_load(f)
        for r in data.get("resources", []):
            self.resources[r["id"]] = r

    def _build_graph(self):
        for skill_id, skill_data in self.skills.items():
            self.graph.add_node(skill_id, skill_data)
            for prereq in skill_data.get("prerequisites", []):
                self.graph.add_edge(prereq, skill_id)

    def get_skill(self, skill_id: str) -> Optional[dict]:
        return self.skills.get(skill_id)

    def get_prerequisites(self, skill_id: str) -> set[str]:
        return self.graph.get_prerequisites(skill_id)

    def get_dependents(self, skill_id: str) -> set[str]:
        return self.graph.get_dependents(skill_id)

    def get_all_prerequisites(self, skill_id: str) -> set[str]:
        return self.graph.get_all_prerequisites_transitive(skill_id)

    def get_goal_skills(self, goal_role: str) -> dict[str, float]:
        role = self.resolve_goal_role(goal_role)
        goal = self.goals.get(role, {})
        return goal.get("required_skills", {})

    def resolve_goal_role(self, goal_role: str) -> Optional[str]:
        if not goal_role:
            return None
        if goal_role in self.goals:
            return goal_role
        norm = goal_role.strip().lower().replace(" ", "_").replace("-", "_")
        if norm in self.goals:
            return norm
        for key, data in self.goals.items():
            if data.get("name", "").lower() == goal_role.strip().lower():
                return key
        return None

    def get_resource(self, resource_id: str) -> Optional[dict]:
        return self.resources.get(resource_id)

    def get_resources_for_skill(self, skill_id: str) -> list[dict]:
        return [
            r for r in self.resources.values()
            if skill_id in r.get("skills", [])
        ]

    def get_resources_for_domain(self, domain: str) -> list[dict]:
        return [
            r for r in self.resources.values()
            if r.get("domain") == domain
        ]

    def list_skills(self) -> list[dict]:
        return [
            {"id": sid, **data}
            for sid, data in self.skills.items()
        ]

    def list_goals(self) -> list[dict]:
        return [
            {"id": gid, **data}
            for gid, data in self.goals.items()
        ]

    def list_resources(self) -> list[dict]:
        return [
            {"id": rid, **data}
            for rid, data in self.resources.items()
        ]

    def validate_prerequisites(self, resource_id: str, met_skills: set[str]) -> bool:
        resource = self.resources.get(resource_id)
        if not resource:
            return False
        prereqs = resource.get("prerequisites", [])
        return all(p in met_skills for p in prereqs)

    def get_prerequisites_on_resource(self, resource_id: str) -> list[str]:
        resource = self.resources.get(resource_id, {})
        return resource.get("prerequisites", [])

    def has_cycle(self) -> bool:
        return self.graph.has_cycle()


# Singleton
_skill_graph: Optional[SkillGraph] = None


def get_skill_graph() -> SkillGraph:
    global _skill_graph
    if _skill_graph is None:
        _skill_graph = SkillGraph()
    return _skill_graph
