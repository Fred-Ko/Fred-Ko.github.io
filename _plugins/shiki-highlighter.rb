# frozen_string_literal: true

# Rouge remains Jekyll's Markdown parser, then Shiki replaces its final HTML
# after every build. This keeps Markdown authoring unchanged and ships no
# syntax-highlighting runtime to readers.
Jekyll::Hooks.register :site, :post_write do |site|
  script = File.expand_path('../scripts/shiki-highlight.js', __dir__)
  success = system('node', script, site.dest)

  next if success

  raise Jekyll::Errors::FatalException, 'Shiki code highlighting failed'
end
