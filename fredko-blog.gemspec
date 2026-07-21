# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name          = "fredko-blog"
  spec.version       = "0.1.0"
  spec.authors       = ["Junho Ko"]
  spec.email         = ["fredko328@gmail.com"]

  spec.summary       = "The local Jekyll theme for Fredko Dev Log."
  spec.homepage      = "https://fredko.kr"
  spec.license       = "MIT"

  spec.files         = `git ls-files -z`.split("\x0").select { |f|
    f.match(%r!^((_(includes|layouts|sass|(data\/(locales|origin)))|assets)\/|README|LICENSE)!i)
  }

  spec.metadata = {
    "homepage_uri"      => "https://fredko.kr",
    "source_code_uri"   => "https://github.com/Fred-Ko/Fred-Ko.github.io",
    "plugin_type"       => "theme"
  }

  spec.required_ruby_version = "~> 3.1"

  spec.add_runtime_dependency "jekyll", "~> 4.3"
  spec.add_runtime_dependency "jekyll-paginate", "~> 1.1"
  spec.add_runtime_dependency "jekyll-seo-tag", "~> 2.8"
  spec.add_runtime_dependency "jekyll-archives", "~> 2.2"
  spec.add_runtime_dependency "jekyll-sitemap", "~> 1.4"
  spec.add_runtime_dependency "jekyll-include-cache", "~> 0.2"

end
