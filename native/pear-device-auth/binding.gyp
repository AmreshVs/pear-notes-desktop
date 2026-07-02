{
  "targets": [
    {
      "target_name": "pear_device_auth",
      "sources": [ "src/addon.cc" ],
      "include_dirs": [ "<!@(node -p \"require('node-addon-api').include\")" ],
      "dependencies": [ "<!(node -p \"require('node-addon-api').gyp\")" ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "conditions": [
        [ "OS=='mac'", {
          "sources": [ "src/auth_mac.mm" ],
          "xcode_settings": {
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
            "CLANG_CXX_LIBRARY": "libc++",
            "MACOSX_DEPLOYMENT_TARGET": "10.15",
            "OTHER_LDFLAGS": [
              "-framework LocalAuthentication",
              "-framework Foundation"
            ]
          }
        } ],
        [ "OS=='win'", {
          "sources": [ "src/auth_win.cc" ],
          "defines": [ "_UNICODE", "UNICODE" ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "AdditionalOptions": [ "/std:c++17", "/EHsc", "/await" ]
            }
          }
        } ],
        [ "OS=='linux'", {
          "sources": [ "src/auth_linux.cc" ]
        } ]
      ]
    }
  ]
}
