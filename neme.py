import os
import subprocess
import signal
import sys
import threading
import time

# --- Configuration ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(SCRIPT_DIR, "backend")
FRONTEND_DIR = os.path.join(SCRIPT_DIR, "frontend")

# ANSI Colors
BLUE = "\033[94m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
DIM = "\033[2m"
BOLD = "\033[1m"
RESET = "\033[0m"

TAG_NEME = f"{BLUE}[neme    ]{RESET}"
TAG_BACKEND = f"{GREEN}[backend ]{RESET}"
TAG_FRONTEND = f"{YELLOW}[frontend]{RESET}"

# Global process list for cleanup
processes = []


# --- Utility ---

def stream_output(pipe, tag, dim=False):
    """Streams output from a pipe to stdout with a tag."""
    prefix = f"{DIM}{tag}{RESET} " if dim else f"{tag} "
    try:
        for line in iter(pipe.readline, ''):
            if line:
                sys.stdout.write(f"{prefix}{line}")
                sys.stdout.flush()
    except Exception:
        pass


def launch(cmd, cwd, tag, dim=False):
    """Launches a subprocess and starts a thread to stream its output."""
    p = subprocess.Popen(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    processes.append(p)
    t = threading.Thread(target=stream_output, args=(p.stdout, tag, dim), daemon=True)
    t.start()
    return p


# --- Service Detection ---

def is_backend_running():
    try:
        import socket
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('127.0.0.1', 8000)) == 0
    except Exception:
        return False


def is_frontend_running():
    # We check for Vite processes
    try:
        ps = subprocess.check_output(["ps", "aux"]).decode()
        return any('vite' in l and 'node' in l and 'grep' not in l for l in ps.split('\n'))
    except Exception:
        return False


# --- Lifecycle ---

def signal_handler(sig, frame):
    print(f"\n{TAG_NEME} Shutting down services…")
    for p in processes:
        try:
            # On macOS/Linux, kill the process group if possible
            os.kill(p.pid, signal.SIGTERM)
        except Exception:
            p.terminate()
    sys.exit(0)


signal.signal(signal.SIGINT, signal_handler)


def start_backend():
    print(f"{TAG_NEME} Starting backend…")
    cmd = ["uvicorn", "app.main:app", "--reload"]
    return launch(cmd, BACKEND_DIR, TAG_BACKEND)


def start_frontend():
    print(f"{TAG_NEME} Starting frontend…")
    cmd = ["npm", "run", "dev"]
    return launch(cmd, FRONTEND_DIR, TAG_FRONTEND, dim=True)


# --- Main ---

def main():
    print(f"\n{BOLD}{'─'*42}{RESET}")
    print(f"{BOLD}   🏦  Neme Launcher{RESET}")
    print(f"{BOLD}{'─'*42}{RESET}\n")

    # Start backend if not running
    if not is_backend_running():
        start_backend()
    else:
        print(f"{TAG_NEME} Backend is already running on port 8000.")

    # Start frontend if not running
    if not is_frontend_running():
        start_frontend()
    else:
        print(f"{TAG_NEME} Frontend is already running.")

    print(f"\n{BOLD}{'─'*42}{RESET}")
    print(f"{BOLD}  🚀  Services are active!{RESET}")
    print(f"  Access the app via the Vite URL above.")
    print(f"{BOLD}{'─'*42}{RESET}")
    print(f"  Ctrl+C to stop everything\n")

    # Keep main thread alive
    while True:
        time.sleep(1)


if __name__ == "__main__":
    main()
