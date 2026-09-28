#include <napi.h>

#include <cstring>
#include <string>

#include "auth.h"
#include "startup_task.h"

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

#ifdef _WIN32
class StartupTaskWorker : public Napi::AsyncWorker {
 public:
  StartupTaskWorker(Napi::Env env, std::string taskId, StartupTaskAction action)
      : Napi::AsyncWorker(env),
        taskId_(std::move(taskId)),
        action_(action),
        deferred_(Napi::Promise::Deferred::New(env)) {}

  Napi::Promise GetPromise() { return deferred_.Promise(); }

 protected:
  void Execute() override { state_ = PlatformStartupTask(taskId_, action_); }

  void OnOK() override {
    Napi::HandleScope scope(Env());
    deferred_.Resolve(Napi::String::New(Env(), state_));
  }

  void OnError(const Napi::Error& error) override {
    Napi::HandleScope scope(Env());
    deferred_.Reject(error.Value());
  }

 private:
  std::string taskId_;
  StartupTaskAction action_;
  std::string state_;
  Napi::Promise::Deferred deferred_;
};

Napi::Value RunStartupTask(const Napi::CallbackInfo& info, StartupTaskAction action) {
  std::string taskId =
      (info.Length() > 0 && info[0].IsString()) ? info[0].As<Napi::String>().Utf8Value() : "";
  StartupTaskWorker* worker = new StartupTaskWorker(info.Env(), std::move(taskId), action);
  Napi::Promise promise = worker->GetPromise();
  worker->Queue();
  return promise;
}

Napi::Value GetStartupTaskState(const Napi::CallbackInfo& info) {
  return RunStartupTask(info, StartupTaskAction::Query);
}

Napi::Value StartupTaskEnable(const Napi::CallbackInfo& info) {
  return RunStartupTask(info, StartupTaskAction::Enable);
}

Napi::Value StartupTaskDisable(const Napi::CallbackInfo& info) {
  return RunStartupTask(info, StartupTaskAction::Disable);
}
#endif

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("authenticate", Napi::Function::New(env, Authenticate));
  exports.Set("isSupported", Napi::Function::New(env, IsSupported));
#ifdef _WIN32
  exports.Set("startupTaskState", Napi::Function::New(env, GetStartupTaskState));
  exports.Set("startupTaskEnable", Napi::Function::New(env, StartupTaskEnable));
  exports.Set("startupTaskDisable", Napi::Function::New(env, StartupTaskDisable));
#endif
  return exports;
}

}  // namespace

NODE_API_MODULE(pear_device_auth, Init)
