class DcCli < Formula
  desc "CLI for Salesforce Data 360 connectors, connections, and data streams"
  homepage "https://github.com/edisontrent17/dc-cli"
  url "https://github.com/edisontrent17/dc-cli/archive/refs/tags/v0.1.1.tar.gz"
  sha256 "c6fbbea5bb8ea3bf2077193bb5fd69927ee0d2650d03d0dc099aa5f1a41c9267"

  depends_on "node"

  def install
    system "npm", "install"
    system "npm", "run", "build"
    libexec.install Dir["*"]
    (bin/"dc-cli").write_env_script libexec/"bin/dc-cli", PATH: ENV["PATH"]
  end

  test do
    output = shell_output("#{bin}/dc-cli --help")
    assert_match "usage: dc-cli <command>", output
  end
end
