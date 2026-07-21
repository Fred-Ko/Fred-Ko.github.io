# frozen_string_literal: true

require "set"

Jekyll::Hooks.register :site, :post_read do |site|
  next unless site.config.dig("dynamic_blog", "enabled")

  ids = Set.new
  uuid = /\A[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\z/i

  site.posts.docs.each do |post|
    post_id = post.data["post_id"]
    path = post.relative_path

    raise Jekyll::Errors::FatalException, "#{path}: post_id가 필요합니다." if post_id.to_s.empty?
    unless uuid.match?(post_id.to_s)
      raise Jekyll::Errors::FatalException, "#{path}: post_id는 UUID 형식이어야 합니다."
    end
    unless ids.add?(post_id)
      raise Jekyll::Errors::FatalException, "#{path}: 중복된 post_id #{post_id}"
    end
  end
end
