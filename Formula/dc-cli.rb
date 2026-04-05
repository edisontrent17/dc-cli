class DcCli < Formula
  desc "CLI for Salesforce Data 360 connectors, connections, and data streams"
  homepage "https://github.com/edisontrent17/dc-cli"
  url "https://github.com/edisontrent17/dc-cli/archive/refs/tags/v0.1.0.tar.gz"
  sha256 "9a2317dbdbaa6d918f743dd7c158989dc045d74896fda34449b3c40023e6289c"

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
