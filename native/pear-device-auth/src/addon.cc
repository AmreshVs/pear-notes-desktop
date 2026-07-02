#include <napi.h>

#include <cstring>
#include <string>

#include "auth.h"

namespace {

void* ExtractWindowHandle(const Napi::Value& value) {
  if (!value.IsBuffer()) return nullptr;
  Napi::Buffer<uint8_t> buffer = value.As<Napi::Buffer<uint8_t>>();
  if (buffer.Length() < sizeof(void*)) return nullptr;
  void* handle = nullptr;
  std::memcpy(&handle, buffer.Data(), sizeof(void*));
  return handle;
}

class AuthWorker : public Napi::AsyncWorker {
 public:
  AuthWorker(Napi::Env env, std::string reason, void* windowHandle)
      : Napi::AsyncWorker(env),
        reason_(std::move(reason)),
        windowHandle_(windowHandle),
        deferred_(Napi::Promise::Deferred::New(env)) {}

  Napi::Promise GetPromise() { return deferred_.Promise(); }

 protected:
  void Execute() override {
    authenticated_ = PlatformAuthenticate(reason_, windowHandle_, error_);
  }

  void OnOK() override {
    Napi::HandleScope scope(Env());
    deferred_.Resolve(Napi::Boolean::New(Env(), authenticated_));
  }

  void OnError(const Napi::Error& error) override {
    Napi::HandleScope scope(Env());
    deferred_.Reject(error.Value());
  }

 private:
  std::string reason_;
  void* windowHandle_;
  bool authenticated_ = false;
  std::string error_;
  Napi::Promise::Deferred deferred_;
};

Napi::Value Authenticate(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  std::string reason = (info.Length() > 0 && info[0].IsString())
                           ? info[0].As<Napi::String>().Utf8Value()
                           : std::string("Authenticate");
  void* windowHandle = info.Length() > 1 ? ExtractWindowHandle(info[1]) : nullptr;

  AuthWorker* worker = new AuthWorker(env, std::move(reason), windowHandle);
  Napi::Promise promise = worker->GetPromise();
  worker->Queue();
  return promise;
}

Napi::Value IsSupported(const Napi::CallbackInfo& info) {
  return Napi::Boolean::New(info.Env(), PlatformIsSupported());
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("authenticate", Napi::Function::New(env, Authenticate));
  exports.Set("isSupported", Napi::Function::New(env, IsSupported));
  return exports;
}

}  // namespace

NODE_API_MODULE(pear_device_auth, Init)
