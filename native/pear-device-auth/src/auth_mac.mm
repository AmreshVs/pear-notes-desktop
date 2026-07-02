#import <Foundation/Foundation.h>
#import <LocalAuthentication/LocalAuthentication.h>

#include "auth.h"

bool PlatformIsSupported() {
  @autoreleasepool {
    LAContext* context = [[LAContext alloc] init];
    NSError* error = nil;
    BOOL canEvaluate = [context canEvaluatePolicy:LAPolicyDeviceOwnerAuthentication error:&error];
    return canEvaluate ? true : false;
  }
}

bool PlatformAuthenticate(const std::string& reason, void* windowHandle, std::string& error) {
  (void)windowHandle;
  @autoreleasepool {
    LAContext* context = [[LAContext alloc] init];
    NSError* policyError = nil;
    if (![context canEvaluatePolicy:LAPolicyDeviceOwnerAuthentication error:&policyError]) {
      if (policyError != nil) {
        error = std::string([[policyError localizedDescription] UTF8String]);
      }
      return false;
    }

    NSString* localizedReason = [NSString stringWithUTF8String:reason.c_str()];
    dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
    __block bool authenticated = false;
    __block NSString* failureMessage = nil;

    [context evaluatePolicy:LAPolicyDeviceOwnerAuthentication
            localizedReason:localizedReason
                      reply:^(BOOL success, NSError* replyError) {
                        authenticated = success ? true : false;
                        if (!success && replyError != nil) {
                          failureMessage = [replyError localizedDescription];
                        }
                        dispatch_semaphore_signal(semaphore);
                      }];

    dispatch_semaphore_wait(semaphore, DISPATCH_TIME_FOREVER);

    if (!authenticated && failureMessage != nil) {
      error = std::string([failureMessage UTF8String]);
    }
    return authenticated;
  }
}
