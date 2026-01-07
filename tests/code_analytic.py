import json
import os

# --- CONFIGURATION ---
PROJECT_PATHS = ["./"]  # Analyze current workspace directory
EXCLUDE_DIRS = {
    "node_modules",
    "target",
    ".git",
    "dist",
    "build",
    ".vscode",
    "__pycache__",
    # Removed "tests" to include test files in analysis
}
EXCLUDE_FILES = {"cargo.lock", ".env", "package-lock.json", ".gitignore"}
# Extensions to track specifically
TRACKED_EXTENSIONS = {".js", ".jsx", ".html", ".css", ".py", ".json"}  # Added .jsx and .json for workspace files

def analyze_codebase():
    stats = {
        "global": {
            "total_files": 0,
            "total_lines": 0,
            "non_empty_lines": 0,
            "total_characters": 0,
        },
        "by_extension": {},  # Counts per ext
        "special_totals": {
            ".js": 0,
            ".jsx": 0,
            ".html": 0,
            ".css": 0,
            ".py": 0,
        },  # Row counts for specific types
    }

    for project in PROJECT_PATHS:
        if not os.path.exists(project):
            print(f"Skipping {project}: Path not found.")
            continue

        for root, dirs, files in os.walk(project, topdown=True):
            # Prune excluded directories
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

            for file in files:
                if file.lower() in EXCLUDE_FILES:
                    continue

                file_path = os.path.join(root, file)
                ext = os.path.splitext(file)[1].lower()

                if ext not in TRACKED_EXTENSIONS:
                    continue

                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        lines = f.readlines()

                        line_count = len(lines)
                        non_empty = sum(1 for line in lines if line.strip())
                        char_count = sum(len(line) for line in lines)

                        # Update Global Stats
                        stats["global"]["total_files"] += 1
                        stats["global"]["total_lines"] += line_count
                        stats["global"]["non_empty_lines"] += non_empty
                        stats["global"]["total_characters"] += char_count

                        # Update Extension Stats
                        if ext not in stats["by_extension"]:
                            stats["by_extension"][ext] = {
                                "files": 0,
                                "lines": 0,
                                "chars": 0,
                            }

                        stats["by_extension"][ext]["files"] += 1
                        stats["by_extension"][ext]["lines"] += line_count
                        stats["by_extension"][ext]["chars"] += char_count

                        # Update Specific Totals
                        if ext in stats["special_totals"]:
                            stats["special_totals"][ext] += line_count

                except Exception as e:
                    print(f"Could not read {file_path}: {e}")

    return stats


if __name__ == "__main__":
    results = analyze_codebase()

    # Save to JSON for easy reading later
    with open("code_analytics.json", "w") as out:
        json.dump(results, out, indent=4)

    print("Analysis complete! Data saved to code_analytics.json")

    # Quick Summary Print
    print(f"\n--- QUICK SUMMARY ---")
    print(f"Total Lines: {results['global']['total_lines']}")
    print(f"JavaScript (.js) Lines: {results['special_totals'].get('.js', 0)}")
    print(f"JSX (.jsx) Lines: {results['special_totals'].get('.jsx', 0)}")
    print(f"HTML (.html) Lines: {results['special_totals'].get('.html', 0)}")
    print(f"CSS (.css) Lines: {results['special_totals'].get('.css', 0)}")
    print(f"Python (.py) Lines: {results['special_totals'].get('.py', 0)}")
