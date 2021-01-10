Pod::Spec.new do |spec|
  spec.name             = 'RNRapidoReach'
  spec.version          = '1.0.0'
  spec.summary          = 'Monetize your users through rewarded surveys!'
  spec.homepage         = 'https://rapidoreach.com'
  spec.platform         = :ios, "9.0"
  spec.license          = { :type => 'MIT' }
  spec.authors          = { 'Vikash Kumar' => 'vikash.kumar@rapidoreach.com' }
  spec.source           = { :git => 'https://github.com/RapidoReach/ReactNativeSDK.git', :tag => 'master' }
  spec.source_files     = '*.{h,m}'
  spec.requires_arc     = true
  
  spec.dependency 'React'
  spec.dependency 'RapidoReach', '1.0.1'
end
