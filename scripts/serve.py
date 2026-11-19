"""零依赖静态服务器，支持 VitePress 的 cleanUrls（无后缀路径）。

用法：
    python scripts/serve.py 5173 docs/.vitepress/dist
"""

import http.server
import os
import sys


class CleanUrlsHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        resolved = super().translate_path(path)
        if os.path.isdir(resolved):
            index = os.path.join(resolved, "index.html")
            if os.path.exists(index):
                return index
        # /notes/method/foo -> /notes/method/foo.html
        if not os.path.splitext(resolved)[1] and os.path.exists(resolved + ".html"):
            return resolved + ".html"
        return resolved

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    directory = sys.argv[2] if len(sys.argv) > 2 else "docs/.vitepress/dist"

    os.chdir(directory)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), CleanUrlsHandler)
    print(f"serving {os.getcwd()} on http://127.0.0.1:{port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
