class DcCli < Formula
  desc "CLI for Salesforce Data 360 connectors, connections, and data streams"
  homepage "https://github.com/edisontrent17/dc-cli"
  url "https://github.com/edisontrent17/dc-cli/archive/refs/tags/v0.1.0.tar.gz"
  sha256 "c186f280c72290e443f35ebf9065a37f67e8b9b3285006f1be9ab74d1247ea28"

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
