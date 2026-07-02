#include "auth.h"

#include <cerrno>
#include <string>

#include <sys/wait.h>
#include <unistd.h>

namespace {

const char* kPkexecPaths[] = {"/usr/bin/pkexec", "/bin/pkexec", "/usr/local/bin/pkexec"};

const char* FindPkexec() {
  for (const char* path : kPkexecPaths) {
    if (access(path, X_OK) == 0) return path;
  }
  return nullptr;
}

}  // namespace

bool PlatformIsSupported() {
  return FindPkexec() != nullptr;
}

bool PlatformAuthenticate(const std::string& reason, void* windowHandle, std::string& error) {
  (void)reason;
  (void)windowHandle;

  const char* pkexec = FindPkexec();
  if (pkexec == nullptr) {
    error = "polkit (pkexec) is not available on this system.";
    return false;
  }

  pid_t pid = fork();
  if (pid < 0) {
    error = "Failed to start authentication process.";
    return false;
  }

  if (pid == 0) {
    execl(pkexec, "pkexec", "--disable-internal-agent", "/bin/true", static_cast<char*>(nullptr));
    _exit(127);
  }

  int status = 0;
  while (waitpid(pid, &status, 0) < 0) {
    if (errno != EINTR) {
      error = "Failed to wait for authentication process.";
      return false;
    }
  }

  if (WIFEXITED(status) && WEXITSTATUS(status) == 0) {
    return true;
  }

  error = "Authentication was cancelled or failed.";
  return false;
}
