# Framework-neutral reader; gem install json_schemer -v 2.5.0
require "json"
require "digest"
require "json_schemer"
require "uri"

module NameSnapshot
  def self.read(path, checksum_path, schema_path)
    raw = File.binread(path)
    raise ArgumentError, "Snapshot exceeds 32 MB" if raw.bytesize > 32_000_000
    checksum = Digest::SHA256.hexdigest(raw)
    expected = File.read(checksum_path, encoding: "UTF-8")
    unless expected.match?(/\A[0-9a-f]{64}  snapshot\.json\n\z/) && expected[0, 64] == checksum
      raise ArgumentError, "Snapshot checksum mismatch"
    end
    raw.force_encoding("UTF-8")
    raise ArgumentError, "Invalid UTF-8" unless raw.valid_encoding?
    snapshot = JSON.parse(raw)
    unless snapshot.is_a?(Hash) && snapshot["schema_version"].is_a?(String) && snapshot["schema_version"].match?(/\A1\.[0-9]+\z/)
      raise ArgumentError, "Unsupported snapshot schema major version"
    end
    schema = JSON.parse(File.read(schema_path, encoding: "UTF-8"))
    raise ArgumentError, "Invalid snapshot schema" unless JSONSchemer.schema(schema).valid?(snapshot)
    records = snapshot.fetch("records")
    ids = records.map { |record| record.fetch("source_id") }
    raise ArgumentError, "Duplicate source IDs" unless ids.uniq.length == ids.length
    counts = snapshot.fetch("counts")
    unless counts["records"] == records.length && counts["aliases"] == records.sum { |r| r["aliases"].length } && counts["source_files"] == records.length + counts["deferred_records"]
      raise ArgumentError, "Snapshot counts do not match records"
    end
    records.each do |record|
      unless record["source_id"] == "legacy_yaml:#{URI.encode_www_form_component(record['source_file'][6...-5])}"
        raise ArgumentError, "Source ID/file mismatch"
      end
      raise ArgumentError, "Duplicate aliases" unless record["aliases"].uniq == record["aliases"]
    end
    [snapshot, checksum]
  end
end

if $PROGRAM_NAME == __FILE__
  snapshot, checksum = NameSnapshot.read(*ARGV)
  puts JSON.generate({ checksum: checksum, snapshot: snapshot })
end
