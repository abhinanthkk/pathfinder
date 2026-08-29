"""
AI-powered roadmap generator for ANY learning domain.

Calls the LLM to produce a structured JSON roadmap, then falls back to
hand-crafted templates if the LLM call fails or returns invalid JSON.
"""
from __future__ import annotations

import json
import logging
import re
import urllib.parse
from typing import Any

from app.services.llm_service import call_llm

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------
_SYSTEM_PROMPT = (
    "You are an expert curriculum designer. Generate a complete, structured learning roadmap in JSON format.\n"
    "The roadmap must be specific to the EXACT goal provided - do NOT generate a generic roadmap.\n"
    "For Cybersecurity: focus on networking, Linux, security tools, CTF skills.\n"
    "For Game Development: focus on game engines, 2D/3D graphics, physics.\n"
    "For Flutter/Mobile: focus on Dart, Flutter widgets, state management.\n"
    "For Data Science: focus on Python, statistics, pandas, ML algorithms.\n"
    "For Backend Developer: focus on Python/APIs/databases/deployment.\n"
    "Return ONLY valid JSON. No markdown fences, no explanation text."
)

_USER_PROMPT_TEMPLATE = """\
Generate a personalized learning roadmap for the following learner:

Goal: {goal}
Experience Level: {experience_level}
Weekly Learning Hours: {weekly_hours}
Current Skills: {skills}
Preferred Learning Style: {learning_style}

Return a JSON object with exactly this structure (no extra keys, no markdown):
{{
  "goal": "<goal title>",
  "milestones": [
    {{
      "number": 1,
      "title": "<milestone title>",
      "description": "<what this milestone covers>",
      "steps": [
        {{
          "id": "<unique_snake_case_id>",
          "title": "<step title>",
          "description": "<what to learn>",
          "estimated_hours": <integer>,
          "skills": ["<skill1>", "<skill2>"],
          "resources": [
            {{"title": "<resource title>", "type": "youtube", "url": "https://www.youtube.com/results?search_query=<topic+tutorial>", "source": "YouTube"}},
            {{"title": "<resource title>", "type": "article", "url": "https://www.geeksforgeeks.org/<topic-slug>/", "source": "GeeksforGeeks"}}
          ]
        }}
      ]
    }}
  ]
}}

Rules:
- Create 3-5 milestones that logically progress from foundations to advanced topics.
- Each milestone should have 3-6 steps.
- Every step MUST have at least 1 YouTube resource and 1 article resource.
- Use unique, topic-specific URLs for every step (not the same URL repeated).
- YouTube URLs must follow: https://www.youtube.com/results?search_query=<topic+words+tutorial>
- GeeksforGeeks URLs must follow: https://www.geeksforgeeks.org/<topic-slug>/
- W3Schools URLs (when relevant): https://www.w3schools.com/<lang>/<lang>_<topic>.asp
- MDN URLs (when relevant for web): https://developer.mozilla.org/en-US/docs/Web/<Topic>
- Tailor the depth and pace to the learner's experience level and weekly hours.
- Do NOT repeat the same URL in different steps.
"""


# ---------------------------------------------------------------------------
# URL helpers
# ---------------------------------------------------------------------------

def _yt_url(query: str) -> str:
    q = urllib.parse.quote_plus(query + " tutorial")
    return f"https://www.youtube.com/results?search_query={q}"


def _gfg_url(slug: str) -> str:
    s = slug.lower().strip().replace(" ", "-")
    return f"https://www.geeksforgeeks.org/{s}/"


def _w3_url(lang: str, topic: str) -> str:
    l = lang.lower().strip()
    t = topic.lower().strip().replace(" ", "_")
    return f"https://www.w3schools.com/{l}/{l}_{t}.asp"


def _mdn_url(topic: str) -> str:
    t = topic.strip().replace(" ", "_")
    return f"https://developer.mozilla.org/en-US/docs/Web/{t}"


# ---------------------------------------------------------------------------
# Fallback templates
# ---------------------------------------------------------------------------

def _make_resource(title: str, rtype: str, url: str, source: str) -> dict:
    return {"title": title, "type": rtype, "url": url, "source": source}


def _make_step(
    step_id: str,
    title: str,
    description: str,
    hours: int,
    skills: list[str],
    resources: list[dict],
) -> dict:
    return {
        "id": step_id,
        "title": title,
        "description": description,
        "estimated_hours": hours,
        "skills": skills,
        "resources": resources,
    }


FALLBACK_ROADMAPS: dict[str, dict] = {
    "cybersecurity": {
        "goal": "Cybersecurity Engineer",
        "milestones": [
            {
                "number": 1,
                "title": "Networking & Linux Foundations",
                "description": "Core networking concepts and Linux command-line mastery",
                "steps": [
                    _make_step(
                        "cyber_networking",
                        "Networking Fundamentals",
                        "TCP/IP, DNS, HTTP/S, OSI model, firewalls, subnetting",
                        15,
                        ["Networking", "TCP/IP", "DNS"],
                        [
                            _make_resource("Networking Fundamentals Full Course", "youtube", _yt_url("networking fundamentals"), "YouTube"),
                            _make_resource("Computer Network Basics", "article", _gfg_url("basics-computer-networking"), "GeeksforGeeks"),
                            _make_resource("How DNS Works", "article", _gfg_url("domain-name-system-dns-in-application-layer"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "cyber_linux",
                        "Linux Command Line",
                        "File system navigation, permissions, processes, shell scripting",
                        20,
                        ["Linux", "Shell Scripting"],
                        [
                            _make_resource("Linux for Beginners Full Course", "youtube", _yt_url("linux command line beginners"), "YouTube"),
                            _make_resource("Linux Commands Tutorial", "article", _w3_url("linux", "intro"), "W3Schools"),
                            _make_resource("Linux File System Explained", "article", _gfg_url("linux-file-system"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
            {
                "number": 2,
                "title": "Security Fundamentals",
                "description": "Core security concepts, CIA triad, threats and attack vectors",
                "steps": [
                    _make_step(
                        "cyber_sec_basics",
                        "Information Security Fundamentals",
                        "CIA triad, threat modeling, common attack types",
                        12,
                        ["Security Fundamentals", "Threat Modeling"],
                        [
                            _make_resource("Cybersecurity for Beginners", "youtube", _yt_url("cybersecurity fundamentals beginners"), "YouTube"),
                            _make_resource("Introduction to Cybersecurity", "article", _gfg_url("introduction-to-cyber-security"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "cyber_cryptography",
                        "Cryptography Basics",
                        "Symmetric/asymmetric encryption, hashing, PKI, TLS",
                        10,
                        ["Cryptography", "Encryption"],
                        [
                            _make_resource("Cryptography Tutorial for Beginners", "youtube", _yt_url("cryptography basics tutorial"), "YouTube"),
                            _make_resource("Cryptography and Network Security", "article", _gfg_url("cryptography-and-its-types"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
            {
                "number": 3,
                "title": "Web Security & Ethical Hacking",
                "description": "OWASP Top 10, web vulnerabilities, and ethical hacking methodology",
                "steps": [
                    _make_step(
                        "cyber_web_security",
                        "Web Application Security",
                        "OWASP Top 10, SQL injection, XSS, CSRF, authentication flaws",
                        18,
                        ["Web Security", "OWASP", "SQL Injection", "XSS"],
                        [
                            _make_resource("Web Application Security Full Course", "youtube", _yt_url("web application security OWASP top 10"), "YouTube"),
                            _make_resource("OWASP Top 10 Explained", "article", _gfg_url("owasp-top-10-security-risks"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "cyber_pen_testing",
                        "Penetration Testing Basics",
                        "Reconnaissance, scanning, exploitation, reporting with Kali Linux",
                        20,
                        ["Pen Testing", "Kali Linux", "Metasploit"],
                        [
                            _make_resource("Penetration Testing Full Course", "youtube", _yt_url("penetration testing kali linux beginners"), "YouTube"),
                            _make_resource("Penetration Testing Phases", "article", _gfg_url("penetration-testing"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
        ],
    },
    "devops": {
        "goal": "DevOps Engineer",
        "milestones": [
            {
                "number": 1,
                "title": "Linux & Version Control",
                "description": "Linux administration and Git workflow mastery",
                "steps": [
                    _make_step(
                        "devops_linux",
                        "Linux Administration",
                        "File system, processes, networking, systemd, user management",
                        18,
                        ["Linux", "System Administration"],
                        [
                            _make_resource("Linux Administration Full Course", "youtube", _yt_url("linux administration tutorial"), "YouTube"),
                            _make_resource("Linux Administration Guide", "article", _gfg_url("linux-system-administration"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "devops_git",
                        "Git & Version Control",
                        "Branching, merging, rebasing, GitHub workflows, pull requests",
                        8,
                        ["Git", "GitHub", "Version Control"],
                        [
                            _make_resource("Git Tutorial for Beginners", "youtube", _yt_url("git tutorial beginners"), "YouTube"),
                            _make_resource("Git Branching Guide", "article", _w3_url("git", "branch"), "W3Schools"),
                        ],
                    ),
                ],
            },
            {
                "number": 2,
                "title": "Containerization",
                "description": "Docker containers and Kubernetes orchestration",
                "steps": [
                    _make_step(
                        "devops_docker",
                        "Docker Fundamentals",
                        "Images, containers, Dockerfile, Docker Compose, registries",
                        15,
                        ["Docker", "Containers"],
                        [
                            _make_resource("Docker Tutorial for Beginners", "youtube", _yt_url("docker tutorial beginners"), "YouTube"),
                            _make_resource("Docker Introduction", "article", _gfg_url("docker-introduction"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "devops_k8s",
                        "Kubernetes Basics",
                        "Pods, deployments, services, ingress, ConfigMaps, Helm",
                        20,
                        ["Kubernetes", "Container Orchestration"],
                        [
                            _make_resource("Kubernetes Full Course", "youtube", _yt_url("kubernetes tutorial beginners"), "YouTube"),
                            _make_resource("Kubernetes Architecture", "article", _gfg_url("kubernetes-architecture"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
            {
                "number": 3,
                "title": "CI/CD & Cloud",
                "description": "Continuous integration, deployment pipelines, and cloud services",
                "steps": [
                    _make_step(
                        "devops_cicd",
                        "CI/CD Pipelines",
                        "GitHub Actions, Jenkins, pipeline stages, automated testing",
                        15,
                        ["CI/CD", "GitHub Actions", "Jenkins"],
                        [
                            _make_resource("CI/CD Pipeline Tutorial", "youtube", _yt_url("CI CD pipeline github actions tutorial"), "YouTube"),
                            _make_resource("Continuous Integration Explained", "article", _gfg_url("continuous-integration-ci"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "devops_cloud",
                        "Cloud Platforms (AWS/GCP/Azure)",
                        "Compute, storage, networking, IAM, serverless basics",
                        20,
                        ["Cloud Computing", "AWS", "IaC"],
                        [
                            _make_resource("AWS Cloud Practitioner Full Course", "youtube", _yt_url("AWS cloud practitioner tutorial"), "YouTube"),
                            _make_resource("Cloud Computing Concepts", "article", _gfg_url("cloud-computing"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
        ],
    },
    "android": {
        "goal": "Android Developer",
        "milestones": [
            {
                "number": 1,
                "title": "Kotlin & Android Basics",
                "description": "Kotlin language fundamentals and Android Studio setup",
                "steps": [
                    _make_step(
                        "android_kotlin",
                        "Kotlin Programming",
                        "Variables, functions, OOP, null safety, coroutines",
                        15,
                        ["Kotlin", "OOP"],
                        [
                            _make_resource("Kotlin Tutorial for Beginners", "youtube", _yt_url("kotlin programming beginners full course"), "YouTube"),
                            _make_resource("Kotlin Basics", "article", _gfg_url("kotlin-programming-language"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "android_setup",
                        "Android Studio & Project Structure",
                        "IDE setup, project structure, emulator, Gradle builds",
                        8,
                        ["Android Studio", "Gradle"],
                        [
                            _make_resource("Android Studio Setup Guide", "youtube", _yt_url("android studio setup beginners"), "YouTube"),
                            _make_resource("Android Studio Introduction", "article", _gfg_url("android-studio-setup-for-application-development"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
            {
                "number": 2,
                "title": "UI & Jetpack Compose",
                "description": "Building modern Android UIs with Jetpack Compose",
                "steps": [
                    _make_step(
                        "android_compose",
                        "Jetpack Compose",
                        "Composable functions, state, layouts, Material Design 3",
                        20,
                        ["Jetpack Compose", "UI Design"],
                        [
                            _make_resource("Jetpack Compose Full Course", "youtube", _yt_url("jetpack compose tutorial beginners"), "YouTube"),
                            _make_resource("Jetpack Compose Guide", "article", _gfg_url("jetpack-compose-in-android"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
            {
                "number": 3,
                "title": "APIs, Storage & Publishing",
                "description": "Integrating REST APIs, local databases, and publishing to Play Store",
                "steps": [
                    _make_step(
                        "android_apis",
                        "REST API Integration",
                        "Retrofit, OkHttp, Coroutines, JSON parsing",
                        12,
                        ["REST APIs", "Retrofit", "Coroutines"],
                        [
                            _make_resource("Retrofit Android Tutorial", "youtube", _yt_url("retrofit android tutorial kotlin"), "YouTube"),
                            _make_resource("Retrofit in Android", "article", _gfg_url("retrofit-with-kotlin-coroutine-in-android"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "android_publish",
                        "Play Store Publishing",
                        "Signing APK/AAB, Play Console, release tracks, ASO",
                        6,
                        ["Publishing", "Google Play"],
                        [
                            _make_resource("How to Publish Android App on Play Store", "youtube", _yt_url("publish android app google play store tutorial"), "YouTube"),
                            _make_resource("Google Play Publishing Guide", "article", _gfg_url("how-to-publish-your-android-app-on-google-play-store"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
        ],
    },
    "game_development": {
        "goal": "Game Developer",
        "milestones": [
            {
                "number": 1,
                "title": "Programming & Game Engine Setup",
                "description": "Programming basics and getting started with Unity or Godot",
                "steps": [
                    _make_step(
                        "game_programming",
                        "Programming Fundamentals",
                        "Variables, loops, functions, OOP concepts in C# or GDScript",
                        12,
                        ["Programming", "C#", "GDScript"],
                        [
                            _make_resource("C# Tutorial for Beginners", "youtube", _yt_url("C# programming beginners tutorial"), "YouTube"),
                            _make_resource("C# Basics", "article", _w3_url("cs", "intro"), "W3Schools"),
                        ],
                    ),
                    _make_step(
                        "game_unity_setup",
                        "Unity Game Engine Basics",
                        "Unity editor, GameObjects, components, scenes, scripts",
                        15,
                        ["Unity", "Game Engine"],
                        [
                            _make_resource("Unity Tutorial for Beginners 2024", "youtube", _yt_url("unity tutorial beginners 2024"), "YouTube"),
                            _make_resource("Unity Game Development Basics", "article", _gfg_url("unity-game-development"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
            {
                "number": 2,
                "title": "2D Game Development",
                "description": "Physics, animations, tilemaps, and building a complete 2D game",
                "steps": [
                    _make_step(
                        "game_2d",
                        "2D Game Mechanics",
                        "Sprites, tilemaps, 2D physics, collision detection, animations",
                        20,
                        ["2D Graphics", "Physics", "Animation"],
                        [
                            _make_resource("Unity 2D Game Development", "youtube", _yt_url("unity 2D game development tutorial"), "YouTube"),
                            _make_resource("2D Game Development Concepts", "article", _gfg_url("2d-game-development"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
            {
                "number": 3,
                "title": "3D & Publishing",
                "description": "3D graphics, lighting, and exporting/publishing your game",
                "steps": [
                    _make_step(
                        "game_3d",
                        "3D Game Development",
                        "3D models, lighting, camera control, terrain, shaders",
                        20,
                        ["3D Graphics", "Lighting", "Shaders"],
                        [
                            _make_resource("Unity 3D Game Development Tutorial", "youtube", _yt_url("unity 3D game development beginners"), "YouTube"),
                            _make_resource("3D Game Development Guide", "article", _gfg_url("3d-game-development-using-unity"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "game_publish",
                        "Publishing Your Game",
                        "Build settings, platforms (PC/mobile/web), itch.io, Steam basics",
                        6,
                        ["Game Publishing", "Build System"],
                        [
                            _make_resource("How to Publish Unity Game on itch.io", "youtube", _yt_url("unity game publish itch.io tutorial"), "YouTube"),
                            _make_resource("Publishing Unity Game", "article", _gfg_url("publish-unity-game"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
        ],
    },
    "blockchain": {
        "goal": "Blockchain Developer",
        "milestones": [
            {
                "number": 1,
                "title": "Cryptography & Blockchain Basics",
                "description": "Hash functions, digital signatures, and how blockchains work",
                "steps": [
                    _make_step(
                        "blockchain_crypto",
                        "Cryptography for Blockchain",
                        "Hash functions, digital signatures, Merkle trees, public-key cryptography",
                        12,
                        ["Cryptography", "Hashing", "Digital Signatures"],
                        [
                            _make_resource("Blockchain Cryptography Tutorial", "youtube", _yt_url("blockchain cryptography tutorial beginners"), "YouTube"),
                            _make_resource("Cryptography in Blockchain", "article", _gfg_url("cryptography-in-blockchain"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "blockchain_consensus",
                        "Consensus Mechanisms",
                        "Proof of Work, Proof of Stake, Delegated PoS, finality",
                        8,
                        ["Consensus Algorithms", "PoW", "PoS"],
                        [
                            _make_resource("Blockchain Consensus Mechanisms Explained", "youtube", _yt_url("blockchain consensus mechanisms proof of work stake"), "YouTube"),
                            _make_resource("Consensus Mechanisms in Blockchain", "article", _gfg_url("consensus-mechanisms-in-blockchain"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
            {
                "number": 2,
                "title": "Smart Contracts & Solidity",
                "description": "Writing and deploying smart contracts on Ethereum",
                "steps": [
                    _make_step(
                        "blockchain_solidity",
                        "Solidity Programming",
                        "Data types, functions, mappings, events, inheritance, security patterns",
                        20,
                        ["Solidity", "Smart Contracts", "Ethereum"],
                        [
                            _make_resource("Solidity Tutorial for Beginners", "youtube", _yt_url("solidity smart contracts tutorial beginners"), "YouTube"),
                            _make_resource("Solidity Programming Guide", "article", _gfg_url("solidity-programming-language"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
            {
                "number": 3,
                "title": "DeFi & Web3",
                "description": "DeFi protocols, Web3.js/ethers.js, and dApp development",
                "steps": [
                    _make_step(
                        "blockchain_web3",
                        "Web3 Development",
                        "ethers.js, wallet integration, IPFS, dApp frontend",
                        18,
                        ["Web3", "ethers.js", "dApps"],
                        [
                            _make_resource("Web3 Development Full Course", "youtube", _yt_url("web3 development ethers.js tutorial"), "YouTube"),
                            _make_resource("Web3 Development Guide", "article", _gfg_url("web3-development"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
        ],
    },
    "flutter": {
        "goal": "Flutter Developer",
        "milestones": [
            {
                "number": 1,
                "title": "Dart & Flutter Basics",
                "description": "Dart language fundamentals and Flutter widget system",
                "steps": [
                    _make_step(
                        "flutter_dart",
                        "Dart Programming Language",
                        "Variables, functions, OOP, async/await, null safety",
                        12,
                        ["Dart", "OOP"],
                        [
                            _make_resource("Dart Tutorial for Beginners", "youtube", _yt_url("dart programming language beginners tutorial"), "YouTube"),
                            _make_resource("Dart Programming Guide", "article", _gfg_url("dart-programming-language-introduction"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "flutter_widgets",
                        "Flutter Widgets",
                        "Stateless/Stateful widgets, layout, Material/Cupertino, hot reload",
                        15,
                        ["Flutter", "Widgets", "UI"],
                        [
                            _make_resource("Flutter Tutorial for Beginners", "youtube", _yt_url("flutter tutorial beginners 2024"), "YouTube"),
                            _make_resource("Flutter Widgets Guide", "article", _gfg_url("flutter-widgets"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
            {
                "number": 2,
                "title": "State Management & Navigation",
                "description": "Managing app state and multi-screen navigation",
                "steps": [
                    _make_step(
                        "flutter_state",
                        "State Management",
                        "Provider, Riverpod, or Bloc pattern, reactive state",
                        15,
                        ["State Management", "Provider", "Bloc"],
                        [
                            _make_resource("Flutter State Management Tutorial", "youtube", _yt_url("flutter state management provider riverpod"), "YouTube"),
                            _make_resource("Flutter State Management Guide", "article", _gfg_url("flutter-state-management"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "flutter_navigation",
                        "Navigation & Routing",
                        "Named routes, Navigator 2.0, deep links, go_router",
                        8,
                        ["Navigation", "Routing"],
                        [
                            _make_resource("Flutter Navigation Tutorial", "youtube", _yt_url("flutter navigation routing tutorial"), "YouTube"),
                            _make_resource("Flutter Navigation Guide", "article", _gfg_url("flutter-navigator"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
            {
                "number": 3,
                "title": "APIs, Storage & Publishing",
                "description": "Backend integration, local storage, and app store release",
                "steps": [
                    _make_step(
                        "flutter_apis",
                        "REST API Integration",
                        "http package, Dio, JSON serialization, error handling",
                        10,
                        ["REST APIs", "HTTP", "JSON"],
                        [
                            _make_resource("Flutter REST API Tutorial", "youtube", _yt_url("flutter REST API integration tutorial"), "YouTube"),
                            _make_resource("Flutter HTTP Requests", "article", _gfg_url("http-get-and-post-method-in-flutter"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "flutter_publish",
                        "Publishing to App Stores",
                        "Release build, signing, Play Store and App Store submission",
                        6,
                        ["Publishing", "App Stores"],
                        [
                            _make_resource("How to Publish Flutter App", "youtube", _yt_url("flutter app publish play store app store tutorial"), "YouTube"),
                            _make_resource("Flutter App Release Guide", "article", _gfg_url("flutter-build-and-release-an-android-app"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
        ],
    },
    "backend": {
        "goal": "Backend Developer",
        "milestones": [
            {
                "number": 1,
                "title": "Programming Foundations",
                "description": "Core programming, data structures, and version control",
                "steps": [
                    _make_step(
                        "backend_programming",
                        "Programming Fundamentals",
                        "Variables, control flow, functions, data structures, and basic algorithms",
                        18,
                        ["Programming", "Data Structures"],
                        [
                            _make_resource("Programming Fundamentals Course", "youtube", _yt_url("programming fundamentals beginners"), "YouTube"),
                            _make_resource("Programming Basics", "article", _gfg_url("programming-fundamentals"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "backend_git",
                        "Version Control With Git",
                        "Branching, merging, rebasing, and collaborative GitHub workflows",
                        8,
                        ["Git", "Version Control"],
                        [
                            _make_resource("Git & GitHub Tutorial", "youtube", _yt_url("git github tutorial beginners"), "YouTube"),
                            _make_resource("Git Branches Guide", "article", _w3_url("git", "branch"), "W3Schools"),
                        ],
                    ),
                ],
            },
            {
                "number": 2,
                "title": "Databases & SQL",
                "description": "Relational data modeling and SQL query mastery",
                "steps": [
                    _make_step(
                        "backend_sql",
                        "SQL Essentials",
                        "SELECT queries, joins, indexing, transactions, and normalization",
                        16,
                        ["SQL", "Databases"],
                        [
                            _make_resource("SQL Full Course", "youtube", _yt_url("sql tutorial beginners full course"), "YouTube"),
                            _make_resource("SQL Basics", "article", _w3_url("sql", "intro"), "W3Schools"),
                        ],
                    ),
                    _make_step(
                        "backend_db_design",
                        "Database Design & ORMs",
                        "Schema design, relationships, migrations, and using an ORM",
                        14,
                        ["Database Design", "ORM"],
                        [
                            _make_resource("Database Design Tutorial", "youtube", _yt_url("database design tutorial"), "YouTube"),
                            _make_resource("SQLAlchemy ORM Guide", "article", _gfg_url("sqlalchemy-with-python"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
            {
                "number": 3,
                "title": "APIs & Services",
                "description": "Building RESTful services with authentication and testing",
                "steps": [
                    _make_step(
                        "backend_rest",
                        "REST API Development",
                        "HTTP methods, routing, serialization, validation, and error handling",
                        18,
                        ["REST APIs", "HTTP", "FastAPI"],
                        [
                            _make_resource("REST API Development Course", "youtube", _yt_url("rest api python fastapi tutorial"), "YouTube"),
                            _make_resource("REST API Basics", "article", _gfg_url("rest-api-introduction"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "backend_auth",
                        "Authentication & Security",
                        "JWT, OAuth, password hashing, and securing API endpoints",
                        12,
                        ["Authentication", "JWT", "Security"],
                        [
                            _make_resource("Authentication JWT Tutorial", "youtube", _yt_url("jwt authentication tutorial"), "YouTube"),
                            _make_resource("Authentication Explained", "article", _gfg_url("real-world-application-authentication"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "backend_testing",
                        "Testing & Deployment",
                        "Unit tests, integration tests, Docker, and server deployment",
                        16,
                        ["Testing", "Docker", "Deployment"],
                        [
                            _make_resource("Backend Testing & Deployment", "youtube", _yt_url("backend testing docker deployment tutorial"), "YouTube"),
                            _make_resource("Docker for Backend", "article", _gfg_url("docker-in-backend-development"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
        ],
    },
    "data_scientist": {
        "goal": "Data Scientist",
        "milestones": [
            {
                "number": 1,
                "title": "Data & Statistics Foundations",
                "description": "Python for data work, statistics, and probability",
                "steps": [
                    _make_step(
                        "ds_python_analysis",
                        "Python for Data Analysis",
                        "Python basics, NumPy arrays, and exploratory analysis",
                        18,
                        ["Python", "NumPy", "Data Analysis"],
                        [
                            _make_resource("Python for Data Analysis Course", "youtube", _yt_url("python numpy data analysis tutorial"), "YouTube"),
                            _make_resource("NumPy Tutorial", "article", _gfg_url("numpy-tutorial"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "ds_statistics",
                        "Statistics & Probability",
                        "Descriptive stats, distributions, hypothesis testing, and regression",
                        18,
                        ["Statistics", "Probability"],
                        [
                            _make_resource("Statistics for Data Science", "youtube", _yt_url("statistics for data science beginners"), "YouTube"),
                            _make_resource("Statistics Basics", "article", _gfg_url("statistics-for-data-science"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
            {
                "number": 2,
                "title": "Data Manipulation & Visualisation",
                "description": "Wrangling data with pandas and communicating insight visually",
                "steps": [
                    _make_step(
                        "ds_pandas",
                        "Data Wrangling with Pandas",
                        "DataFrames, cleaning, merging, grouping, and reshaping data",
                        16,
                        ["Pandas", "Data Wrangling"],
                        [
                            _make_resource("Pandas Full Course", "youtube", _yt_url("pandas tutorial full course"), "YouTube"),
                            _make_resource("Pandas Guide", "article", _gfg_url("pandas-tutorial"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "ds_viz",
                        "Data Visualization",
                        "Matplotlib, Seaborn, and storytelling with charts",
                        10,
                        ["Data Visualization", "Matplotlib", "Seaborn"],
                        [
                            _make_resource("Data Visualization Tutorial", "youtube", _yt_url("matplotlib seaborn data visualization tutorial"), "YouTube"),
                            _make_resource("Data Visualization with Python", "article", _gfg_url("data-visualization-in-python"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "ds_sql",
                        "SQL for Data Analysis",
                        "Querying databases for analytics, joins, and aggregations",
                        12,
                        ["SQL", "Data Analysis"],
                        [
                            _make_resource("SQL for Data Analysis", "youtube", _yt_url("sql for data analysis tutorial"), "YouTube"),
                            _make_resource("SQL Basics for Analytics", "article", _w3_url("sql", "intro"), "W3Schools"),
                        ],
                    ),
                ],
            },
            {
                "number": 3,
                "title": "Machine Learning & Capstone",
                "description": "Building and evaluating predictive models on real data",
                "steps": [
                    _make_step(
                        "ds_ml",
                        "Machine Learning Fundamentals",
                        "Supervised/unsupervised learning, scikit-learn, model evaluation",
                        20,
                        ["Machine Learning", "scikit-learn"],
                        [
                            _make_resource("Machine Learning Full Course", "youtube", _yt_url("machine learning scikit learn tutorial"), "YouTube"),
                            _make_resource("Machine Learning Basics", "article", _gfg_url("machine-learning"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "ds_capstone",
                        "Data Science Capstone Project",
                        "End-to-end analysis: cleaning, modeling, and presenting findings",
                        20,
                        ["Project", "Machine Learning"],
                        [
                            _make_resource("Data Science Project Walkthrough", "youtube", _yt_url("data science capstone project tutorial"), "YouTube"),
                            _make_resource("Data Science Project Ideas", "article", _gfg_url("data-science-projects"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
        ],
    },
    "frontend": {
        "goal": "Frontend Developer",
        "milestones": [
            {
                "number": 1,
                "title": "HTML, CSS & Responsive Design",
                "description": "Structure pages with HTML and style them with CSS",
                "steps": [
                    _make_step(
                        "fe_html",
                        "HTML Fundamentals",
                        "Semantic tags, forms, accessibility, and document structure",
                        10,
                        ["HTML", "Semantic Markup"],
                        [
                            _make_resource("HTML Full Course", "youtube", _yt_url("html full course beginners"), "YouTube"),
                            _make_resource("HTML Basics", "article", _w3_url("html", "intro"), "W3Schools"),
                        ],
                    ),
                    _make_step(
                        "fe_css",
                        "CSS & Responsive Layout",
                        "Selectors, Flexbox, Grid, media queries, and responsive design",
                        16,
                        ["CSS", "Responsive Design"],
                        [
                            _make_resource("CSS Flexbox & Grid Tutorial", "youtube", _yt_url("css flexbox grid responsive tutorial"), "YouTube"),
                            _make_resource("Responsive Web Design", "article", _gfg_url("responsive-web-design"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "fe_js",
                        "JavaScript Essentials",
                        "Variables, functions, DOM manipulation, events, and ES6+",
                        18,
                        ["JavaScript", "DOM"],
                        [
                            _make_resource("JavaScript Full Course", "youtube", _yt_url("javascript full course beginners"), "YouTube"),
                            _make_resource("JavaScript Basics", "article", "https://www.w3schools.com/js/js_intro.asp", "W3Schools"),
                        ],
                    ),
                ],
            },
            {
                "number": 2,
                "title": "React & Component Architecture",
                "description": "Build interactive UIs with React and manage state",
                "steps": [
                    _make_step(
                        "fe_react",
                        "React Fundamentals",
                        "Components, props, state, hooks, and the component lifecycle",
                        18,
                        ["React", "Hooks"],
                        [
                            _make_resource("React Tutorial for Beginners", "youtube", _yt_url("react hooks tutorial beginners"), "YouTube"),
                            _make_resource("React Basics", "article", _gfg_url("react-js-introduction"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "fe_state",
                        "State Management & Routing",
                        "Context, Redux or Zustand, and react-router navigation",
                        12,
                        ["State Management", "React Router"],
                        [
                            _make_resource("React State Management Tutorial", "youtube", _yt_url("react redux state management tutorial"), "YouTube"),
                            _make_resource("React Router Guide", "article", _gfg_url("react-router"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
            {
                "number": 3,
                "title": "API Integration & Advanced Frontend",
                "description": "Consume APIs, optimize performance, and ship production UIs",
                "steps": [
                    _make_step(
                        "fe_apis",
                        "Integrating REST APIs",
                        "Fetch, error handling, loading states, and auth in the browser",
                        12,
                        ["REST APIs", "Fetch"],
                        [
                            _make_resource("Calling APIs in React", "youtube", _yt_url("react fetch api tutorial"), "YouTube"),
                            _make_resource("REST API Integration", "article", _gfg_url("how-to-connect-html-to-database"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "fe_performance",
                        "Performance & Deployment",
                        "Lazy loading, accessibility, and deploying to Vercel/Netlify",
                        12,
                        ["Performance", "Deployment"],
                        [
                            _make_resource("Frontend Performance Optimization", "youtube", _yt_url("frontend performance optimization tutorial"), "YouTube"),
                            _make_resource("Web Performance Guide", "article", _gfg_url("web-page-performance-optimization"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
        ],
    },
    "uiux": {
        "goal": "UI/UX Designer",
        "milestones": [
            {
                "number": 1,
                "title": "Design Fundamentals",
                "description": "Design principles, typography, color, and layout systems",
                "steps": [
                    _make_step(
                        "uiux_principles",
                        "Design Principles",
                        "Hierarchy, contrast, alignment, spacing, and visual balance",
                        12,
                        ["Design Fundamentals", "Typography"],
                        [
                            _make_resource("UI Design Principles Course", "youtube", _yt_url("ui design principles beginners"), "YouTube"),
                            _make_resource("Design Basics Guide", "article", _gfg_url("ui-design"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "uiux_color",
                        "Color, Typography & Layout",
                        "Color theory, type pairing, and layout/grid systems",
                        10,
                        ["Color Theory", "Typography", "Layout"],
                        [
                            _make_resource("Color & Typography Tutorial", "youtube", _yt_url("color theory typography design tutorial"), "YouTube"),
                            _make_resource("Typography Guide", "article", _gfg_url("typography-in-design"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
            {
                "number": 2,
                "title": "User Research & Wireframing",
                "description": "Understand users and translate needs into wireframes",
                "steps": [
                    _make_step(
                        "uiux_research",
                        "User Research & Personas",
                        "Interviews, surveys, journey maps, and building personas",
                        14,
                        ["User Research", "Personas"],
                        [
                            _make_resource("UX Research Methods Tutorial", "youtube", _yt_url("ux research user personas tutorial"), "YouTube"),
                            _make_resource("UX Research Guide", "article", _gfg_url("ux-research"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "uiux_wireframes",
                        "Wireframing & Prototyping",
                        "Sketching, low-fi wireframes, and interactive prototyping in Figma",
                        16,
                        ["Wireframing", "Figma", "Prototyping"],
                        [
                            _make_resource("Figma Wireframing Tutorial", "youtube", _yt_url("figma wireframe prototype tutorial"), "YouTube"),
                            _make_resource("Figma Basics", "article", _gfg_url("figma-introduction"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
            {
                "number": 3,
                "title": "Design Systems & Usability",
                "description": "Build design systems and validate with usability testing",
                "steps": [
                    _make_step(
                        "uiux_system",
                        "Design Systems & Component Libraries",
                        "Tokens, component libraries, and documentation",
                        14,
                        ["Design Systems", "UI Components"],
                        [
                            _make_resource("Design Systems Tutorial", "youtube", _yt_url("design system component library tutorial"), "YouTube"),
                            _make_resource("Design Systems Guide", "article", _gfg_url("design-system"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "uiux_usability",
                        "Usability Testing & Accessibility",
                        "Test plans, WCAG accessibility, and iterating on feedback",
                        12,
                        ["Usability", "Accessibility", "WCAG"],
                        [
                            _make_resource("Usability Testing Tutorial", "youtube", _yt_url("usability testing tutorial"), "YouTube"),
                            _make_resource("Accessibility Design Guide", "article", _gfg_url("web-accessibility"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
        ],
    },
    "ml_engineer": {
        "goal": "Machine Learning Engineer",
        "milestones": [
            {
                "number": 1,
                "title": "Python, Math & ML Foundations",
                "description": "Core Python, linear algebra, and statistics for ML",
                "steps": [
                    _make_step(
                        "ml_python",
                        "Python for ML",
                        "Python, NumPy, and scientific computing fundamentals",
                        16,
                        ["Python", "NumPy"],
                        [
                            _make_resource("Python for ML Course", "youtube", _yt_url("python machine learning numpy tutorial"), "YouTube"),
                            _make_resource("NumPy Tutorial", "article", _gfg_url("numpy-tutorial"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "ml_math",
                        "Math for Machine Learning",
                        "Linear algebra, calculus, and probability essentials",
                        18,
                        ["Linear Algebra", "Probability", "Statistics"],
                        [
                            _make_resource("Math for ML Tutorial", "youtube", _yt_url("mathematics for machine learning"), "YouTube"),
                            _make_resource("Linear Algebra Basics", "article", _gfg_url("linear-algebra-tutorial"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
            {
                "number": 2,
                "title": "Machine Learning & Deep Learning",
                "description": "Classical ML and neural networks with frameworks",
                "steps": [
                    _make_step(
                        "ml_algorithms",
                        "Machine Learning Algorithms",
                        "Supervised/unsupervised learning, scikit-learn, model evaluation",
                        20,
                        ["Machine Learning", "scikit-learn"],
                        [
                            _make_resource("Machine Learning Full Course", "youtube", _yt_url("machine learning all algorithms tutorial"), "YouTube"),
                            _make_resource("ML Algorithms Guide", "article", _gfg_url("machine-learning-algorithms"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "ml_deep",
                        "Deep Learning Fundamentals",
                        "Neural networks, backpropagation, PyTorch/TensorFlow basics",
                        20,
                        ["Deep Learning", "Neural Networks", "PyTorch"],
                        [
                            _make_resource("Deep Learning Tutorial", "youtube", _yt_url("deep learning pytorch tensorflow tutorial"), "YouTube"),
                            _make_resource("Neural Network Basics", "article", _gfg_url("neural-networks-a-beginner-guide"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
            {
                "number": 3,
                "title": "ML Engineering & Deployment",
                "description": "Turn models into production systems with pipelines and APIs",
                "steps": [
                    _make_step(
                        "ml_feature",
                        "Feature Engineering & Pipelines",
                        "Feature extraction, preprocessing pipelines, and experiment tracking",
                        14,
                        ["Feature Engineering", "MLOps"],
                        [
                            _make_resource("Feature Engineering Tutorial", "youtube", _yt_url("feature engineering ml tutorial"), "YouTube"),
                            _make_resource("ML Pipeline Guide", "article", _gfg_url("machine-learning-pipelines"), "GeeksforGeeks"),
                        ],
                    ),
                    _make_step(
                        "ml_deploy",
                        "Model Deployment & Serving",
                        "Serving models via APIs, model monitoring, and MLOps tooling",
                        16,
                        ["Deployment", "MLOps", "Model Serving"],
                        [
                            _make_resource("ML Model Deployment Tutorial", "youtube", _yt_url("deploy machine learning model api tutorial"), "YouTube"),
                            _make_resource("MLOps Guide", "article", _gfg_url("mlops"), "GeeksforGeeks"),
                        ],
                    ),
                ],
            },
        ],
    },
}

# Alias map: normalised keyword → fallback key
_DOMAIN_ALIASES: dict[str, str] = {
    # Backend
    "backend developer": "backend",
    "backend development": "backend",
    "backend dev": "backend",
    "backend engineer": "backend",
    "software developer": "backend",
    "software engineer": "backend",
    "api developer": "backend",
    # Data scientist
    "data scientist": "data_scientist",
    "data science": "data_scientist",
    "analyst": "data_scientist",
    "data analytics": "data_scientist",
    "data analysis": "data_scientist",
    # Frontend
    "frontend developer": "frontend",
    "front end developer": "frontend",
    "frontend development": "frontend",
    "frontend dev": "frontend",
    "frontend engineer": "frontend",
    "web developer": "frontend",
    "web development": "frontend",
    # UI/UX
    "ui/ux designer": "uiux",
    "ui/ux design": "uiux",
    "ui designer": "uiux",
    "ux designer": "uiux",
    "ux design": "uiux",
    "product designer": "uiux",
    # ML engineer
    "machine learning engineer": "ml_engineer",
    "machine learning engine": "ml_engineer",
    "ml engineer": "ml_engineer",
    "ai engineer": "ml_engineer",
    "ai/ml engineer": "ml_engineer",
    "deep learning": "ml_engineer",
    # Cybersecurity
    "cybersecurity": "cybersecurity",
    "cyber security": "cybersecurity",
    "ethical hacking": "cybersecurity",
    "penetration testing": "cybersecurity",
    "pen testing": "cybersecurity",
    "security engineer": "cybersecurity",
    # DevOps
    "devops": "devops",
    "dev ops": "devops",
    "site reliability": "devops",
    "sre": "devops",
    "cloud": "devops",
    # Android
    "android": "android",
    "android developer": "android",
    "android development": "android",
    "mobile android": "android",
    # Game
    "game": "game_development",
    "game dev": "game_development",
    "game development": "game_development",
    "game developer": "game_development",
    "unity": "game_development",
    "godot": "game_development",
    # Blockchain
    "blockchain": "blockchain",
    "web3": "blockchain",
    "solidity": "blockchain",
    "smart contracts": "blockchain",
    "defi": "blockchain",
    # Flutter
    "flutter": "flutter",
    "flutter developer": "flutter",
    "flutter mobile": "flutter",
}


def _detect_fallback_domain(goal: str) -> str | None:
    low = goal.lower().strip()
    for alias, domain in _DOMAIN_ALIASES.items():
        if alias in low:
            return domain
    return None


def _extract_json_from_text(text: str) -> dict | None:
    """Robustly extract a JSON object from LLM output that may include markdown fences."""
    text = text.strip()
    # Strip markdown code fences
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
        text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Find the outermost JSON object
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[start : i + 1])
                except json.JSONDecodeError:
                    return None
    return None


def _validate_roadmap(data: Any) -> bool:
    """Basic structural validation of the LLM-generated roadmap."""
    if not isinstance(data, dict):
        return False
    if "milestones" not in data or not isinstance(data["milestones"], list):
        return False
    if not data["milestones"]:
        return False
    for m in data["milestones"]:
        if "steps" not in m or not isinstance(m["steps"], list) or not m["steps"]:
            return False
    return True


def _ensure_resources(roadmap: dict) -> dict:
    """
    Guarantee every step has at least one YouTube resource.
    Adds a generic YouTube link if the step has no resources.
    """
    for milestone in roadmap.get("milestones", []):
        for step in milestone.get("steps", []):
            resources: list = step.get("resources") or []
            has_youtube = any(r.get("type") == "youtube" for r in resources)
            if not has_youtube:
                query = step.get("title", "learning tutorial")
                resources.insert(
                    0,
                    {
                        "title": f"{step.get('title', 'Tutorial')} - Full Course",
                        "type": "youtube",
                        "url": _yt_url(query),
                        "source": "YouTube",
                    },
                )
            step["resources"] = resources
    return roadmap


async def generate_ai_roadmap(
    goal: str,
    experience_level: str = "beginner",
    weekly_hours: float = 5.0,
    skills: dict[str, float] | None = None,
    learning_style: str = "mixed",
) -> dict:
    """
    Generate a structured roadmap for any domain.

    Tries the LLM first; falls back to a template if the LLM call fails
    or returns malformed data.

    Returns a dict matching the roadmap JSON structure.
    """
    skills_str = (
        ", ".join(f"{k} ({v:.0%})" for k, v in (skills or {}).items())
        or "none listed"
    )

    user_prompt = _USER_PROMPT_TEMPLATE.format(
        goal=goal,
        experience_level=experience_level,
        weekly_hours=weekly_hours,
        skills=skills_str,
        learning_style=learning_style,
    )

    try:
        raw = await call_llm(_SYSTEM_PROMPT, user_prompt, temperature=0.4, timeout=90.0)
        parsed = _extract_json_from_text(raw)
        if parsed and _validate_roadmap(parsed):
            return _ensure_resources(parsed)
        logger.warning("LLM roadmap JSON was invalid; falling back to template.")
    except Exception as exc:
        logger.warning("LLM roadmap generation failed (%s); falling back to template.", exc)

    # --- Fallback ---
    domain_key = _detect_fallback_domain(goal)
    if domain_key and domain_key in FALLBACK_ROADMAPS:
        logger.info("Using fallback roadmap template for domain: %s", domain_key)
        base = _ensure_resources(dict(FALLBACK_ROADMAPS[domain_key]))
        return _personalize_roadmap(base, goal, experience_level, weekly_hours, skills)

    # Last-resort: generic roadmap
    logger.warning("No fallback template found for '%s'; returning domain-aware generic roadmap.", goal)
    generic = _ensure_resources(_generic_roadmap(goal, experience_level))
    return _personalize_roadmap(generic, goal, experience_level, weekly_hours, skills)


def _normalize_skill_for_match(value: str) -> str:
    """Lower-case and strip non-alphanumerics for skill matching."""
    return "".join(ch for ch in (value or "").lower() if ch.isalnum())


def _personalize_roadmap(
    roadmap: dict,
    goal: str,
    experience_level: str,
    weekly_hours: float,
    skills: dict[str, float] | None,
) -> dict:
    """
    Adjust a generated roadmap based on learner context. This keeps the
    fallback path personalized (requirement 6) without waiting on the LLM:
      - Steps whose skills the learner already knows are de-prioritised or
        their hours reduced so the roadmap focuses on actual gaps.
      - For advanced learners, remove beginner-only steps from the start.
      - Estimated hours are scaled against a default 8-hours/week baseline so
        a learner with many weekly hours gets a leaner (fewer weeks) roadmap.
    Returns a new roadmap dict (does not mutate the cached template).
    """
    import copy

    result = copy.deepcopy(roadmap)
    result["goal"] = result.get("goal") or goal

    own_skill_keys = {
        _normalize_skill_for_match(k) for k, v in (skills or {}).items() if (v or 0) >= 0.5
    }
    known_skill_keys = set(own_skill_keys)

    exp = (experience_level or "beginner").strip().lower()
    baseline_hours = max(weekly_hours or 8.0, 1.0)

    for milestone in result.get("milestones", []):
        steps = milestone.get("steps", [])
        kept = []
        for step in steps:
            step_skills = [_normalize_skill_for_match(s) for s in step.get("skills", [])]

            # Determine if this step is fully mastered already
            mastered = bool(step_skills) and all(s in known_skill_keys for s in step_skills)

            # Beginner-only steps have a low deficit for advanced learners; skip them.
            beginner_only = (
                exp in ("intermediate", "advanced")
                and (step.get("description") or "").lower().find("fundamentals") != -1
            )

            if mastered or beginner_only:
                continue

            # Scale hours: higher weekly hours => a bit tighter per-step estimate
            step_hours = step.get("estimated_hours", 5)
            ratio = min(max(baseline_hours / 8.0, 0.6), 1.6)
            step["estimated_hours"] = max(1, round(float(step_hours) / ratio))
            kept.append(step)

        milestone["steps"] = kept

    # Drop milestones that ended up with no steps
    result["milestones"] = [m for m in result["milestones"] if m.get("steps")]
    if not result["milestones"]:
        result["milestones"] = _generic_roadmap(goal, experience_level)["milestones"]

    return result



def _generic_roadmap(goal: str, experience_level: str) -> dict:
    """A bare-bones generic roadmap used as the absolute last resort."""
    title = goal.strip().title()
    return {
        "goal": title,
        "milestones": [
            {
                "number": 1,
                "title": "Foundations",
                "description": f"Core fundamentals needed to begin your journey toward {title}",
                "steps": [
                    _make_step(
                        "generic_foundations",
                        f"{title} Foundations",
                        f"Core concepts and basics of {title}",
                        15,
                        [title],
                        [
                            _make_resource(
                                f"{title} Full Course for Beginners",
                                "youtube",
                                _yt_url(f"{title} beginners"),
                                "YouTube",
                            ),
                            _make_resource(
                                f"Introduction to {title}",
                                "article",
                                _gfg_url(title.lower().replace(" ", "-")),
                                "GeeksforGeeks",
                            ),
                        ],
                    ),
                ],
            },
            {
                "number": 2,
                "title": "Core Skills",
                "description": f"Build essential skills for {title}",
                "steps": [
                    _make_step(
                        "generic_core",
                        f"Core {title} Skills",
                        f"Practical application of {title} core concepts",
                        20,
                        [title],
                        [
                            _make_resource(
                                f"{title} Tutorial - Core Concepts",
                                "youtube",
                                _yt_url(f"{title} core concepts tutorial"),
                                "YouTube",
                            ),
                            _make_resource(
                                f"{title} Practical Guide",
                                "article",
                                _gfg_url(f"{title.lower().replace(' ', '-')}-tutorial"),
                                "GeeksforGeeks",
                            ),
                        ],
                    ),
                ],
            },
            {
                "number": 3,
                "title": "Advanced Topics",
                "description": f"Advanced and specialized topics in {title}",
                "steps": [
                    _make_step(
                        "generic_advanced",
                        f"Advanced {title}",
                        f"Deep-dive into advanced {title} concepts and real-world projects",
                        25,
                        [title],
                        [
                            _make_resource(
                                f"Advanced {title} Course",
                                "youtube",
                                _yt_url(f"advanced {title} tutorial"),
                                "YouTube",
                            ),
                            _make_resource(
                                f"Advanced {title} Guide",
                                "article",
                                _gfg_url(f"advanced-{title.lower().replace(' ', '-')}"),
                                "GeeksforGeeks",
                            ),
                        ],
                    ),
                ],
            },
        ],
    }
