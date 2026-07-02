#include "auth.h"

#include <string>

#include <windows.h>
#include <winrt/base.h>
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Security.Credentials.UI.h>
#include <UserConsentVerifierInterop.h>

using namespace winrt;
using namespace winrt::Windows::Foundation;
using namespace winrt::Windows::Security::Credentials::UI;

namespace {

std::wstring Widen(const std::string& value) {
  if (value.empty()) return std::wstring();
  int size = MultiByteToWideChar(CP_UTF8, 0, value.c_str(), -1, nullptr, 0);
  std::wstring result(size > 0 ? size - 1 : 0, L'\0');
  if (size > 0) {
    MultiByteToWideChar(CP_UTF8, 0, value.c_str(), -1, result.data(), size);
  }
  return result;
}

std::string Narrow(const winrt::hstring& value) {
  return winrt::to_string(value);
}

}  // namespace

bool PlatformIsSupported() {
  try {
    init_apartment(apartment_type::multi_threaded);
    UserConsentVerifierAvailability availability =
        UserConsentVerifier::CheckAvailabilityAsync().get();
    return availability == UserConsentVerifierAvailability::Available;
  } catch (...) {
    return false;
  }
}

bool PlatformAuthenticate(const std::string& reason, void* windowHandle, std::string& error) {
  try {
    init_apartment(apartment_type::multi_threaded);

    UserConsentVerifierAvailability availability =
        UserConsentVerifier::CheckAvailabilityAsync().get();
    if (availability != UserConsentVerifierAvailability::Available) {
      error = "Windows Hello is not available or not configured on this device.";
      return false;
    }

    hstring message{Widen(reason)};
    UserConsentVerificationResult result{UserConsentVerificationResult::Canceled};

    HWND hwnd = reinterpret_cast<HWND>(windowHandle);
    if (hwnd != nullptr) {
      auto interop = get_activation_factory<UserConsentVerifier, IUserConsentVerifierInterop>();
      IAsyncOperation<UserConsentVerificationResult> operation{nullptr};
      check_hresult(interop->RequestVerificationForWindowAsync(
          hwnd, reinterpret_cast<HSTRING>(get_abi(message)),
          guid_of<IAsyncOperation<UserConsentVerificationResult>>(),
          reinterpret_cast<void**>(put_abi(operation))));
      result = operation.get();
    } else {
      result = UserConsentVerifier::RequestVerificationAsync(message).get();
    }

    return result == UserConsentVerificationResult::Verified;
  } catch (const hresult_error& e) {
    error = Narrow(e.message());
    return false;
  } catch (...) {
    error = "Unknown Windows authentication error.";
    return false;
  }
}
