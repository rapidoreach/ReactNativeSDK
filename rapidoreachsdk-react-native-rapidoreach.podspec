require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "rapidoreachsdk-react-native-rapidoreach"
  s.version      = package["1.0.2"]
  s.summary      = package["Monetize your users through rewarded surveys!"]
  s.homepage     = package["https://rapidoreach.com"]
  s.license      = package["MIT"]
  s.authors      = package["Vikash Kumar"]

  s.platforms    = { :ios => "10.0" }
  s.source       = { :git => "https://github.com/rapidoreach/ReactNativeSDK.git", :tag => "#{s.version}" }

  
  s.source_files = "ios/**/*.{h,m,mm,swift}"
  

  s.dependency "React-Core"
  s.dependency 'RapidoReach', '1.0.1'
end
