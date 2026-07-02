#pragma once

#include <string>

bool PlatformIsSupported();

bool PlatformAuthenticate(const std::string& reason, void* windowHandle, std::string& error);
