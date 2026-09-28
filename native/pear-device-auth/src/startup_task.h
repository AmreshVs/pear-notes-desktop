#pragma once

#include <string>

enum class StartupTaskAction { Query, Enable, Disable };

std::string PlatformStartupTask(const std::string& taskId, StartupTaskAction action);
