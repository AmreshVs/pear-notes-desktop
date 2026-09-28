#include "startup_task.h"

#include <string>

#include <winrt/base.h>
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.ApplicationModel.h>

using namespace winrt;
using namespace winrt::Windows::ApplicationModel;

namespace {

std::string StateName(StartupTaskState state) {
  switch (state) {
    case StartupTaskState::Enabled:
      return "enabled";
    case StartupTaskState::Disabled:
      return "disabled";
    case StartupTaskState::DisabledByUser:
      return "disabledByUser";
    case StartupTaskState::DisabledByPolicy:
      return "disabledByPolicy";
    case StartupTaskState::EnabledByPolicy:
      return "enabledByPolicy";
  }
  return "unavailable";
}

}  // namespace

std::string PlatformStartupTask(const std::string& taskId, StartupTaskAction action) {
  try {
    init_apartment(apartment_type::multi_threaded);
    StartupTask task = StartupTask::GetAsync(to_hstring(taskId)).get();
    if (action == StartupTaskAction::Enable) {
      return StateName(task.RequestEnableAsync().get());
    }
    if (action == StartupTaskAction::Disable) {
      task.Disable();
    }
    return StateName(task.State());
  } catch (...) {
    return "unavailable";
  }
}
