#!/usr/bin/env python3
"""
Sync GitHub Actions Artifacts to Web Download Directory

This script fetches the latest successful workflow run artifacts from GitHub
and deploys them to the admin download directory for the CBT web portal.

Usage:
  python3 sync_artifacts.py           # Run once (check & sync if needed)
  python3 sync_artifacts.py --force   # Force re-download even if version matches
  python3 sync_artifacts.py --daemon  # Run as daemon, polling every 10 minutes

Environment Variables:
  GITHUB_TOKEN     - GitHub personal access token (required)
  GITHUB_REPO      - Repository in "owner/repo" format (default: Sekiyyyyy/AppUjian)
  DOWNLOAD_DIR     - Target download directory (default: auto-detect)
"""

import os
import sys
import json
import time
import shutil
import zipfile
import logging
import argparse
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime

# Paths
SCRIPT_DIR = Path(__file__).parent.resolve()
PUBLIC_DOWNLOADS = SCRIPT_DIR / "admin" / "public" / "downloads"
DIST_DOWNLOADS = SCRIPT_DIR / "admin" / "dist" / "downloads"
STATE_FILE = SCRIPT_DIR / ".sync_state.json"
TEMP_DIR = SCRIPT_DIR / ".sync_temp"

# ─── Configuration ─────────────────────────────────────────────────────────
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
token_file = SCRIPT_DIR / ".github_token"
if not GITHUB_TOKEN and token_file.exists():
    GITHUB_TOKEN = token_file.read_text().strip()

GITHUB_REPO = os.environ.get("GITHUB_REPO", "Sekiyyyyy/AppUjian")
GITHUB_API = f"https://api.github.com/repos/{GITHUB_REPO}"

# Artifact name mapping (GitHub artifact name → local filename template)
ARTIFACT_MAP = {
    "AppUjian-Android-APK": {
        "inner_glob": "*.apk",
        "output_template": "AppUjian_v{version}.apk",
        "output_generic": "AppUjian.apk",
    },
    "AppUjian-Windows-Installer": {
        "inner_glob": "*.exe",
        "output_template": "AppUjian_Setup_v{version}.exe",
        "output_generic": "AppUjian_Setup.exe",
    },
    "AppUjian-iOS-IPA": {
        "inner_glob": "*.ipa",
        "output_template": "AppUjian_v{version}.ipa",
        "output_generic": "AppUjian.ipa",
    },
}

POLL_INTERVAL = 600  # 10 minutes

# ─── Logging ───────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("sync_artifacts")

# ─── GitHub API Helpers ────────────────────────────────────────────────────

def github_api(endpoint: str) -> dict:
    """Make an authenticated JSON request to the GitHub API."""
    url = f"{GITHUB_API}/{endpoint}" if not endpoint.startswith("http") else endpoint
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        log.error(f"GitHub API error {e.code}: {e.reason} for {url}")
        raise
    except urllib.error.URLError as e:
        log.error(f"Network error: {e.reason}")
        raise


def download_artifact_zip(download_url: str, dest_path: Path):
    """Download an artifact zip by following GitHub's redirect to Azure Blob Storage."""
    # GitHub returns a 302 redirect to a pre-signed URL.
    # We need to follow the redirect. urllib does this automatically,
    # but we need the right Accept header for the initial request.
    
    class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            # Return a new request to the redirect URL WITHOUT auth headers
            return urllib.request.Request(newurl)
    
    opener = urllib.request.build_opener(NoRedirectHandler)
    
    req = urllib.request.Request(download_url, headers={
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    
    try:
        with opener.open(req, timeout=120) as resp:
            dest_path.write_bytes(resp.read())
    except urllib.error.HTTPError as e:
        log.error(f"Download error {e.code}: {e.reason} for {download_url}")
        raise


def get_latest_successful_run() -> dict | None:
    """Get the latest successful workflow run."""
    data = github_api("actions/runs?status=success&per_page=5")
    runs = data.get("workflow_runs", [])
    if not runs:
        log.warning("No successful workflow runs found.")
        return None
    # Return the most recent successful run
    return runs[0]


def get_run_artifacts(run_id: int) -> list:
    """Get artifacts for a specific workflow run."""
    data = github_api(f"actions/runs/{run_id}/artifacts")
    return data.get("artifacts", [])


def download_artifact(artifact: dict, dest_dir: Path) -> Path:
    """Download and extract a single artifact zip."""
    name = artifact["name"]
    download_url = artifact["archive_download_url"]
    
    zip_path = dest_dir / f"{name}.zip"
    extract_dir = dest_dir / name
    extract_dir.mkdir(parents=True, exist_ok=True)
    
    log.info(f"  Downloading artifact: {name} ({artifact['size_in_bytes'] / 1024 / 1024:.1f} MB)...")
    
    download_artifact_zip(download_url, zip_path)
    
    # Extract
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(extract_dir)
    zip_path.unlink()
    
    return extract_dir


# ─── State Management ──────────────────────────────────────────────────────

def load_state() -> dict:
    """Load the last sync state."""
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {}


def save_state(state: dict):
    """Save the current sync state."""
    STATE_FILE.write_text(json.dumps(state, indent=2))


# ─── Version Detection ────────────────────────────────────────────────────

def detect_version() -> str:
    """Detect the current app version from pubspec.yaml."""
    pubspec = SCRIPT_DIR / "mobile" / "pubspec.yaml"
    if pubspec.exists():
        for line in pubspec.read_text().splitlines():
            if line.strip().startswith("version:"):
                # version: 1.0.4+5 → 1.0.4
                ver = line.split(":")[1].strip().split("+")[0]
                return ver
    return "unknown"


# ─── Sync Logic ───────────────────────────────────────────────────────────

def sync_artifacts(force: bool = False) -> bool:
    """
    Main sync function. Returns True if new artifacts were deployed.
    """
    log.info("🔄 Checking for new GitHub Actions artifacts...")
    
    # Get latest successful run
    run = get_latest_successful_run()
    if not run:
        log.info("No successful runs found. Skipping.")
        return False
    
    run_id = run["id"]
    run_number = run["run_number"]
    run_created = run["created_at"]
    head_sha = run["head_sha"][:8]
    
    log.info(f"  Latest run: #{run_number} (ID: {run_id}, SHA: {head_sha}, Created: {run_created})")
    
    # Check if we already synced this run
    state = load_state()
    if not force and state.get("last_run_id") == run_id:
        log.info(f"  ✅ Already synced run #{run_number}. No action needed.")
        return False
    
    # Get artifacts for this run
    artifacts = get_run_artifacts(run_id)
    if not artifacts:
        log.warning("  No artifacts found for this run.")
        return False
    
    log.info(f"  Found {len(artifacts)} artifact(s): {[a['name'] for a in artifacts]}")
    
    # Check if all expected artifacts are present
    expected = set(ARTIFACT_MAP.keys())
    found = {a["name"] for a in artifacts}
    missing = expected - found
    if missing:
        log.warning(f"  ⚠️  Missing artifacts: {missing}. Will sync what's available.")
    
    # Detect version
    version = detect_version()
    log.info(f"  App version: {version}")
    
    # Create temp directory
    if TEMP_DIR.exists():
        shutil.rmtree(TEMP_DIR)
    TEMP_DIR.mkdir(parents=True)
    
    try:
        deployed_files = []
        
        for artifact in artifacts:
            name = artifact["name"]
            if name not in ARTIFACT_MAP:
                log.info(f"  Skipping unknown artifact: {name}")
                continue
            
            mapping = ARTIFACT_MAP[name]
            
            # Download and extract
            extract_dir = download_artifact(artifact, TEMP_DIR)
            
            # Find the actual file inside the extracted artifact
            inner_files = list(extract_dir.rglob("*"))
            inner_files = [f for f in inner_files if f.is_file()]
            
            if not inner_files:
                log.error(f"  ❌ No files found inside artifact {name}")
                continue
            
            # Use the first matching file
            source_file = inner_files[0]
            log.info(f"  Found inner file: {source_file.name} ({source_file.stat().st_size / 1024 / 1024:.1f} MB)")
            
            # Deploy to both public and dist directories
            versioned_name = mapping["output_template"].format(version=version)
            generic_name = mapping["output_generic"]
            
            for target_dir in [PUBLIC_DOWNLOADS, DIST_DOWNLOADS]:
                if not target_dir.exists():
                    target_dir.mkdir(parents=True, exist_ok=True)
                
                # Remove old versioned files (different versions)
                for old in target_dir.glob(f"AppUjian*{source_file.suffix}"):
                    log.info(f"  Removing old: {old.name}")
                    old.unlink()
                
                # Copy versioned file
                dest_versioned = target_dir / versioned_name
                shutil.copy2(source_file, dest_versioned)
                log.info(f"  ✅ Deployed: {dest_versioned}")
                
                # Copy generic (unversioned) file
                dest_generic = target_dir / generic_name
                shutil.copy2(source_file, dest_generic)
                log.info(f"  ✅ Deployed: {dest_generic}")
            
            deployed_files.append(versioned_name)
        
        # Save state
        save_state({
            "last_run_id": run_id,
            "last_run_number": run_number,
            "last_sync_time": datetime.utcnow().isoformat(),
            "head_sha": head_sha,
            "version": version,
            "deployed_files": deployed_files,
        })
        
        log.info(f"\n🎉 Sync complete! Deployed {len(deployed_files)} artifact(s) for v{version}")
        return True
        
    finally:
        # Cleanup temp
        if TEMP_DIR.exists():
            shutil.rmtree(TEMP_DIR)


# ─── Daemon Mode ──────────────────────────────────────────────────────────

def run_daemon():
    """Run as a polling daemon."""
    log.info(f"🚀 Starting artifact sync daemon (polling every {POLL_INTERVAL}s)...")
    
    while True:
        try:
            sync_artifacts()
        except Exception as e:
            log.error(f"Sync error: {e}")
        
        log.info(f"💤 Sleeping {POLL_INTERVAL}s until next check...")
        time.sleep(POLL_INTERVAL)


# ─── CLI Entry Point ──────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Sync GitHub Actions artifacts to web downloads")
    parser.add_argument("--force", action="store_true", help="Force re-download even if already synced")
    parser.add_argument("--daemon", action="store_true", help="Run as polling daemon")
    args = parser.parse_args()
    
    if args.daemon:
        run_daemon()
    else:
        try:
            changed = sync_artifacts(force=args.force)
            sys.exit(0 if changed else 0)
        except Exception as e:
            log.error(f"Fatal error: {e}")
            sys.exit(1)


if __name__ == "__main__":
    main()
