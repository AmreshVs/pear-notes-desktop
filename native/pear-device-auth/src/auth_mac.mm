#import <Foundation/Foundation.h>
#import <LocalAuthentication/LocalAuthentication.h>

#include "auth.h"

#include <string>

namespace {

std::string CopyUTF8(NSString* value) {
  if (value == nil) return std::string();
  const char* utf8 = [value UTF8String];
  return utf8 != nullptr ? std::string(utf8) : std::string();
}

}  // namespace

bool PlatformIsSupported() {
  @autoreleasepool {
    LAContext* context = [[LAContext alloc] init];
    NSError* error = nil;
    BOOL canEvaluate = [context canEvaluatePolicy:LAPolicyDeviceOwnerAuthentication error:&error];
#if !__has_feature(objc_arc)
    [context release];
#endif
    return canEvaluate ? true : false;
  }
}

bool PlatformAuthenticate(const std::string& reason, void* windowHandle, std::string& error) {
  (void)windowHandle;
  @autoreleasepool {
    LAContext* context = [[LAContext alloc] init];
    NSError* policyError = nil;
    if (![context canEvaluatePolicy:LAPolicyDeviceOwnerAuthentication error:&policyError]) {
      error = CopyUTF8([policyError localizedDescription]);
#if !__has_feature(objc_arc)
      [context release];
#endif
      return false;
    }

    NSString* localizedReason = [NSString stringWithUTF8String:reason.c_str()];
    dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
    __block bool authenticated = false;
    __block std::string failureMessage;

    [context evaluatePolicy:LAPolicyDeviceOwnerAuthentication
            localizedReason:localizedReason
                      reply:^(BOOL success, NSError* replyError) {
                        authenticated = success ? true : false;
                        if (!success) {
                          failureMessage = CopyUTF8([replyError localizedDescription]);
                        }
                        dispatch_semaphore_signal(semaphore);
                      }];

    dispatch_semaphore_wait(semaphore, DISPATCH_TIME_FOREVER);

#if !__has_feature(objc_arc)
    dispatch_release(semaphore);
    [context release];
#endif

    if (!authenticated) {
      error = failureMessage;
    }
    return authenticated;
  }
}
