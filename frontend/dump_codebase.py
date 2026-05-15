#!/usr/bin/env python3
"""
dump_codebase.py — Dump your entire codebase into a single AI-ready file.

Usage:
    python dump_codebase.py                      # dump current directory
    python dump_codebase.py /path/to/project     # dump specific directory
    python dump_codebase.py /path/to/project -o output.txt
    python dump_codebase.py . --exclude node_modules dist .venv
    python dump_codebase.py . --ext .py .ts .tsx  # only include specific extensions
    python dump_codebase.py . --max-file-kb 100   # skip files larger than 100 KB
    python dump_codebase.py . --no-metadata       # skip file metadata
"""

import os
import sys
import argparse
import hashlib
import datetime
from pathlib import Path

# ── Default ignore patterns (mirrors .gitignore conventions) ──────────────────

DEFAULT_IGNORE_DIRS = {
    ".git", ".svn", ".hg",
    "node_modules", ".venv", "venv", "env", ".env",
    "__pycache__", ".mypy_cache", ".pytest_cache", ".ruff_cache",
    "dist", "build", "out", ".next", ".nuxt",
    "coverage", ".coverage", "htmlcov",
    ".idea", ".vscode",
    "vendor",           # Go / PHP
    "target",           # Rust / Java / Maven
    ".gradle", ".mvn",  # Java / Kotlin
    "Pods",             # iOS
    ".terraform",       # IaC
    ".serverless",
}

DEFAULT_IGNORE_FILES = {
    ".DS_Store", "Thumbs.db", "desktop.ini",
    ".env", ".env.local", ".env.*.local",
    "*.pyc", "*.pyo", "*.pyd",
    "*.so", "*.dylib", "*.dll", "*.exe",
    "*.class",
    "*.lock",           # package-lock.json, yarn.lock, Pipfile.lock, etc.
    "*.log",
    "*.min.js", "*.min.css",
    "*.map",            # source maps
    "*.png", "*.jpg", "*.jpeg", "*.gif", "*.svg", "*.ico",
    "*.woff", "*.woff2", "*.ttf", "*.eot",
    "*.zip", "*.tar", "*.gz", "*.bz2", "*.7z",
    "*.pdf", "*.doc", "*.docx", "*.xls", "*.xlsx",
    "*.sqlite", "*.db",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def matches_pattern(name: str, patterns: set) -> bool:
    """Simple glob-style pattern matching (supports leading *)."""
    import fnmatch
    return any(fnmatch.fnmatch(name, pat) for pat in patterns)


def is_likely_binary(path: Path, peek_bytes: int = 8192) -> bool:
    """Heuristic: read a chunk and check for null bytes."""
    try:
        with open(path, "rb") as f:
            chunk = f.read(peek_bytes)
        return b"\x00" in chunk
    except OSError:
        return True


def file_hash(path: Path) -> str:
    """Return a short MD5 hex digest of a file."""
    h = hashlib.md5()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(65536), b""):
            h.update(block)
    return h.hexdigest()[:8]


def human_size(num_bytes: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if num_bytes < 1024:
            return f"{num_bytes:.1f} {unit}"
        num_bytes /= 1024
    return f"{num_bytes:.1f} TB"


# ── Tree builder ──────────────────────────────────────────────────────────────

def build_tree(
    root: Path,
    ignore_dirs: set,
    ignore_files: set,
    allowed_exts: set | None,
    max_file_bytes: int,
) -> list[Path]:
    """
    Walk *root* and return a sorted list of file paths that pass all filters.
    Also prints a pretty directory tree to stdout while walking.
    """
    collected: list[Path] = []
    tree_lines: list[str] = [f"{root.resolve().name}/"]

    def _walk(directory: Path, prefix: str):
        try:
            entries = sorted(directory.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
        except PermissionError:
            return

        dirs  = [e for e in entries if e.is_dir()  and not matches_pattern(e.name, ignore_dirs)]
        files = [e for e in entries if e.is_file() and not matches_pattern(e.name, ignore_files)]

        # Filter by extension
        if allowed_exts:
            files = [f for f in files if f.suffix.lower() in allowed_exts]

        # Filter by size
        files = [f for f in files if f.stat().st_size <= max_file_bytes]

        all_visible = dirs + files
        for i, entry in enumerate(all_visible):
            connector = "└── " if i == len(all_visible) - 1 else "├── "
            if entry.is_dir():
                tree_lines.append(f"{prefix}{connector}{entry.name}/")
                extension = "    " if i == len(all_visible) - 1 else "│   "
                _walk(entry, prefix + extension)
            else:
                tree_lines.append(f"{prefix}{connector}{entry.name}")
                collected.append(entry)

    _walk(root, "")
    return collected, tree_lines


# ── Main dump logic ───────────────────────────────────────────────────────────

def dump_codebase(
    root: Path,
    output_path: Path,
    ignore_dirs: set,
    ignore_files: set,
    allowed_exts: set | None,
    max_file_kb: int,
    include_metadata: bool,
    encoding: str = "utf-8",
):
    max_bytes = max_file_kb * 1024
    files, tree_lines = build_tree(root, ignore_dirs, ignore_files, allowed_exts, max_bytes)

    skipped_binary = 0
    skipped_decode  = 0
    total_chars     = 0

    with open(output_path, "w", encoding=encoding, errors="replace") as out:

        # ── Header ────────────────────────────────────────────────────────────
        out.write("=" * 80 + "\n")
        out.write("CODEBASE DUMP\n")
        out.write("=" * 80 + "\n")
        out.write(f"Generated : {datetime.datetime.now().isoformat(timespec='seconds')}\n")
        out.write(f"Root      : {root.resolve()}\n")
        out.write(f"Files     : {len(files)}\n")
        if allowed_exts:
            out.write(f"Extensions: {', '.join(sorted(allowed_exts))}\n")
        out.write("\n")

        # ── Directory tree ────────────────────────────────────────────────────
        out.write("─" * 40 + " DIRECTORY TREE " + "─" * 24 + "\n\n")
        out.write("\n".join(tree_lines) + "\n\n")

        # ── File contents ─────────────────────────────────────────────────────
        out.write("─" * 40 + " FILE CONTENTS " + "─" * 25 + "\n\n")

        for fpath in files:
            rel = fpath.relative_to(root)

            if is_likely_binary(fpath):
                skipped_binary += 1
                out.write(f"### {rel}  [BINARY — SKIPPED]\n\n")
                continue

            try:
                text = fpath.read_text(encoding=encoding, errors="strict")
            except (UnicodeDecodeError, OSError):
                skipped_decode += 1
                out.write(f"### {rel}  [UNREADABLE — SKIPPED]\n\n")
                continue

            # File header
            out.write(f"### {rel}\n")

            if include_metadata:
                stat = fpath.stat()
                mtime = datetime.datetime.fromtimestamp(stat.st_mtime).isoformat(timespec='seconds')
                out.write(f"# size: {human_size(stat.st_size)}  |  "
                          f"lines: {text.count(chr(10))+1}  |  "
                          f"modified: {mtime}  |  "
                          f"md5: {file_hash(fpath)}\n")

            out.write("\n")
            out.write(text)
            if not text.endswith("\n"):
                out.write("\n")
            out.write("\n")
            total_chars += len(text)

        # ── Footer ────────────────────────────────────────────────────────────
        out.write("=" * 80 + "\n")
        out.write("END OF DUMP\n")
        out.write("=" * 80 + "\n")
        out.write(f"Total characters : {total_chars:,}\n")
        out.write(f"Files included   : {len(files) - skipped_binary - skipped_decode}\n")
        out.write(f"Binary skipped   : {skipped_binary}\n")
        out.write(f"Unreadable skip  : {skipped_decode}\n")
        approx_tokens = total_chars // 4
        out.write(f"Approx. tokens   : ~{approx_tokens:,}  "
                  f"({'within' if approx_tokens < 180_000 else 'may exceed'} Claude 200K window)\n")

    return len(files), skipped_binary + skipped_decode, total_chars


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Dump a codebase into a single AI-ready text file.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("root", nargs="?", default=".", help="Root directory (default: .)")
    parser.add_argument("-o", "--output", default=None,
                        help="Output file path (default: <project_name>_dump.txt)")
    parser.add_argument("--exclude", nargs="+", metavar="DIR",
                        help="Extra directory names to ignore")
    parser.add_argument("--ext", nargs="+", metavar=".EXT",
                        help="Only include files with these extensions, e.g. .py .ts")
    parser.add_argument("--max-file-kb", type=int, default=500,
                        help="Skip files larger than N KB (default: 500)")
    parser.add_argument("--no-metadata", action="store_true",
                        help="Omit per-file metadata (size, mtime, hash)")
    parser.add_argument("--encoding", default="utf-8",
                        help="Text encoding (default: utf-8)")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not root.is_dir():
        print(f"Error: '{root}' is not a directory.", file=sys.stderr)
        sys.exit(1)

    output_path = Path(args.output) if args.output else Path(f"{root.name}_dump.txt")

    ignore_dirs  = DEFAULT_IGNORE_DIRS  | set(args.exclude or [])
    ignore_files = DEFAULT_IGNORE_FILES
    allowed_exts = {e if e.startswith(".") else f".{e}" for e in args.ext} if args.ext else None

    print(f"Scanning  : {root}")
    print(f"Output    : {output_path}")
    if allowed_exts:
        print(f"Extensions: {', '.join(sorted(allowed_exts))}")
    print()

    n_files, n_skipped, n_chars = dump_codebase(
        root=root,
        output_path=output_path,
        ignore_dirs=ignore_dirs,
        ignore_files=ignore_files,
        allowed_exts=allowed_exts,
        max_file_kb=args.max_file_kb,
        include_metadata=not args.no_metadata,
        encoding=args.encoding,
    )

    size = output_path.stat().st_size
    print(f"Done!  {n_files} files → {output_path}  ({human_size(size)})")
    print(f"       ~{n_chars // 4:,} tokens estimated  |  {n_skipped} file(s) skipped")


if __name__ == "__main__":
    main()
